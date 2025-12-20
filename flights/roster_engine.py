from typing import Dict, List, Tuple
from django.db import transaction
import re

from .models import (
    Flight,
    PlaneType,
    Pilot,
    CabinCrew,
    FlightTicket,
    Roster,
    RosterCrewAssignment,
    RosterPassengerAssignment,
)


def _generate_seat_labels(prefix: str, count: int, start_row: int = 1, seats_per_row: int = 6) -> List[str]:
    letters = list("ABCDEF")
    seats: List[str] = []
    row = start_row
    remaining = count
    while remaining > 0:
        for letter in letters[:seats_per_row]:
            if remaining <= 0:
                break
            seats.append(f"{row}{letter}")
            remaining -= 1
        row += 1
    return seats


def _build_seat_pools(plane: PlaneType) -> Dict[str, List[str]]:
    layout = plane.seat_layout or {}
    business_pool = list(layout.get("business", []))
    economy_pool = list(layout.get("economy", []))

    if not business_pool and plane.business_seats:
        business_pool = _generate_seat_labels("B", plane.business_seats, start_row=1, seats_per_row=4)
    if not economy_pool and plane.economy_seats:
        economy_pool = _generate_seat_labels("E", plane.economy_seats, start_row=20, seats_per_row=6)

    # Remove duplicates while preserving order
    def dedup(seq: List[str]) -> List[str]:
        seen = set()
        out: List[str] = []
        for item in seq:
            if item not in seen:
                seen.add(item)
                out.append(item)
        return out

    return {
        "business": dedup(business_pool),
        "economy": dedup(economy_pool),
    }


def _seat_type_for_ticket(ticket: FlightTicket) -> str:
    cls = str(ticket.ticket_class or "").lower()
    return "business" if cls.startswith("bus") else "economy"


def _select_pilots(flight: Flight, pilot_ids: List[int] = None) -> List[Pilot]:
    """
    Select pilots for a flight.
    
    Requirements:
    - At least one senior pilot
    - At least one junior pilot
    - At most two trainees
    
    Args:
        flight: The flight to assign pilots to
        pilot_ids: Optional list of pilot IDs for manual selection
        
    Returns:
        List of selected pilots
        
    Raises:
        ValueError: If requirements are not met or pilots don't meet constraints
    """
    if pilot_ids:
        # Manual selection
        pilots = list(Pilot.objects.filter(id__in=pilot_ids))
        
        if not pilots:
            raise ValueError("No pilots selected")
        
        # Validate they meet requirements
        for pilot in pilots:
            if pilot.vehicle_restriction and pilot.vehicle_restriction != flight.plane_type:
                raise ValueError(f"Pilot {pilot.code} is not qualified for plane type {flight.plane_type.code}")
            if pilot.max_range_km and pilot.max_range_km < flight.distance_km:
                raise ValueError(f"Pilot {pilot.code} max range ({pilot.max_range_km}km) is less than flight distance ({flight.distance_km}km)")
        
        # Validate flight requirements: at least 1 senior, 1 junior, at most 2 trainees
        seniors = [p for p in pilots if p.seniority == 'senior']
        juniors = [p for p in pilots if p.seniority == 'junior']
        trainees = [p for p in pilots if p.seniority == 'trainee']
        
        if not seniors:
            raise ValueError("Flight requires at least one senior pilot")
        if not juniors:
            raise ValueError("Flight requires at least one junior pilot")
        if len(trainees) > 2:
            raise ValueError(f"Flight can have at most two trainees, but {len(trainees)} were selected")
        
        return pilots
    
    # Automatic selection
    qs = Pilot.objects.filter(
        vehicle_restriction=flight.plane_type,
        max_range_km__gte=flight.distance_km,
    ).order_by("seniority", "code")
    seniors = list(qs.filter(seniority="senior"))
    juniors = list(qs.filter(seniority="junior"))
    trainees = list(qs.filter(seniority="trainee"))

    if not seniors or not juniors:
        raise ValueError("Insufficient pilots to satisfy senior and junior requirements")

    picks: List[Pilot] = [seniors[0], juniors[0]]
    # Optionally add up to two trainees if available and distinct
    for t in trainees[:2]:
        if t not in picks:
            picks.append(t)
    return picks


def _select_cabin_crew(flight: Flight, cabin_crew_ids: List[int] = None) -> List[CabinCrew]:
    if cabin_crew_ids:
        # Manual selection
        crew = list(CabinCrew.objects.filter(id__in=cabin_crew_ids))
        # Validate they meet requirements
        for member in crew:
            if not member.vehicle_restrictions.filter(id=flight.plane_type.id).exists():
                raise ValueError(f"Cabin crew {member.code} is not qualified for plane type {flight.plane_type.code}")
        # Check minimum requirements
        seniors = [c for c in crew if c.seniority == "senior"]
        if not seniors:
            raise ValueError("At least one senior cabin crew required")
        min_needed = flight.plane_type.min_cabin_crew
        if len(crew) < min_needed:
            raise ValueError(f"At least {min_needed} cabin crew members required, but only {len(crew)} provided")
        if len(crew) > flight.plane_type.max_cabin_crew:
            raise ValueError(f"Maximum {flight.plane_type.max_cabin_crew} cabin crew members allowed, but {len(crew)} provided")
        return crew
    
    # Automatic selection
    qs = CabinCrew.objects.filter(vehicle_restrictions=flight.plane_type).order_by("role", "seniority", "code")
    seniors = list(qs.filter(seniority="senior"))
    juniors = list(qs.filter(seniority="junior"))
    chefs = list(qs.filter(role="chef"))

    if not seniors:
        raise ValueError("At least one senior cabin crew required")
    if len(juniors) < 4:
        raise ValueError("At least four junior cabin crew required")

    crew: List[CabinCrew] = []
    crew.append(seniors[0])
    crew.extend(juniors[: min(4, len(juniors))])

    # Add extra seniors up to 4 total if available
    extra_seniors = seniors[1:4]
    crew.extend(extra_seniors)

    # Add chefs up to 2
    crew.extend(chefs[:2])

    # If we still have fewer than min_cabin_crew, add more juniors
    min_needed = flight.plane_type.min_cabin_crew
    if len(crew) < min_needed:
        remaining = min_needed - len(crew)
        extra_juniors = [j for j in juniors[min(4, len(juniors)):] if j not in crew][:remaining]
        crew.extend(extra_juniors)

    # Cap at plane_type.max_cabin_crew
    return crew[: flight.plane_type.max_cabin_crew]


def _assign_passenger_seats(plane: PlaneType, tickets: List[FlightTicket]) -> Tuple[List[Dict], Dict[str, List[str]]]:
    pools = _build_seat_pools(plane)
    assigned = {"business": {}, "economy": {}}

    # Remove seats already pre-assigned in tickets to avoid double assignment
    for ticket in tickets:
        seat = ticket.seat_number
        target_pool = _seat_type_for_ticket(ticket)
        if seat and seat in pools.get(target_pool, []):
            pools[target_pool].remove(seat)

    passenger_assignments: List[Dict] = []
    handled_affinity = set()

    def take_seat(pool_key: str) -> str:
        pool = pools.get(pool_key, [])
        if not pool:
            fallback_key = "economy" if pool_key == "business" else "business"
            pool = pools.get(fallback_key, [])
            key_to_use = fallback_key
        else:
            key_to_use = pool_key
        if not pool:
            raise ValueError("No seats left to assign")
        seat = pool.pop(0)
        return seat

    def find_neighboring_seats(pool_key: str, count: int) -> List[str]:
        """
        Try to find neighboring seats (same row, adjacent columns) for affiliated passengers.
        Falls back to sequential seats if neighboring not possible.
        """
        pool = pools.get(pool_key, [])
        if not pool or count <= 0:
            return []
        
        # Group seats by row number
        seats_by_row: Dict[int, List[str]] = {}
        for seat in pool:
            row_match = re.match(r'(\d+)([A-Z]+)', seat)
            if row_match:
                row_num = int(row_match.group(1))
                if row_num not in seats_by_row:
                    seats_by_row[row_num] = []
                seats_by_row[row_num].append(seat)
        
        # Try to find a row with enough adjacent seats
        for row_num in sorted(seats_by_row.keys()):
            row_seats = sorted(seats_by_row[row_num])
            if len(row_seats) >= count:
                # Found a row with enough seats, take first N seats (they're adjacent)
                selected = row_seats[:count]
                # Remove from pool
                for s in selected:
                    if s in pools[pool_key]:
                        pools[pool_key].remove(s)
                return selected
        
        # Fallback: take sequential seats from pool
        selected = []
        for _ in range(count):
            if pools[pool_key]:
                selected.append(pools[pool_key].pop(0))
        return selected

    # Assign seats for affinity groups first (prioritize neighboring seats)
    for ticket in tickets:
        passenger = ticket.passenger
        if passenger.id in handled_affinity:
            continue
        affiliates = list(passenger.affiliated_passengers.all())
        if not affiliates:
            continue
        group = [passenger] + affiliates
        seat_type = _seat_type_for_ticket(ticket)
        seats_needed = len([p for p in group if not p.is_infant])
        
        # Try to assign neighboring seats for affiliated passengers
        if seat_type not in pools or not pools[seat_type]:
            fallback_key = "economy" if seat_type == "business" else "business"
            if fallback_key in pools and pools[fallback_key]:
                seat_type = fallback_key
            else:
                raise ValueError("No seats left to assign")
        
        # Find neighboring seats if possible (1-2 affiliated passengers)
        seats = find_neighboring_seats(seat_type, seats_needed)
        
        # If we didn't get enough seats, fill with take_seat
        while len(seats) < seats_needed:
            try:
                seats.append(take_seat(seat_type))
            except ValueError:
                break
        
        idx = 0
        for member in group:
            if member.is_infant:
                passenger_assignments.append({
                    "passenger": member,
                    "seat_number": None,
                    "seat_type": seat_type,
                    "is_infant": True,
                })
            else:
                passenger_assignments.append({
                    "passenger": member,
                    "seat_number": seats[idx] if idx < len(seats) else None,
                    "seat_type": seat_type,
                    "is_infant": False,
                })
                idx += 1
            handled_affinity.add(member.id)

    # Assign remaining passengers
    for ticket in tickets:
        passenger = ticket.passenger
        if passenger.id in handled_affinity:
            continue
        seat_type = _seat_type_for_ticket(ticket)
        if passenger.is_infant:
            passenger_assignments.append({
                "passenger": passenger,
                "seat_number": None,
                "seat_type": seat_type,
                "is_infant": True,
            })
            continue

        if ticket.seat_number:
            seat = ticket.seat_number
        else:
            seat = take_seat(seat_type)
        passenger_assignments.append({
            "passenger": passenger,
            "seat_number": seat,
            "seat_type": seat_type,
            "is_infant": False,
        })

    return passenger_assignments, pools


def generate_roster(flight_id: int, backend: str = "sql", user=None, pilot_ids: List[int] = None, cabin_crew_ids: List[int] = None) -> Roster:
    flight = Flight.objects.select_related("plane_type", "origin_airport", "destination_airport").get(id=flight_id)

    with transaction.atomic():
        pilots = _select_pilots(flight, pilot_ids)
        cabin_crew = _select_cabin_crew(flight, cabin_crew_ids)
        tickets = list(FlightTicket.objects.select_related("passenger").filter(flight=flight))
        passenger_assignments, remaining_pools = _assign_passenger_seats(flight.plane_type, tickets)

        crew_payload = [
            {
                "type": "pilot",
                "code": p.code,
                "name": f"{p.first_name} {p.last_name}",
                "seniority": p.seniority,
            }
            for p in pilots
        ] + [
            {
                "type": "cabin",
                "code": c.code,
                "name": f"{c.first_name} {c.last_name}",
                "role": c.role,
                "seniority": c.seniority,
            }
            for c in cabin_crew
        ]

        passenger_payload = [
            {
                "name": f"{a['passenger'].first_name} {a['passenger'].last_name}",
                "seat": a["seat_number"],
                "seat_type": a["seat_type"],
                "infant": a["is_infant"],
            }
            for a in passenger_assignments
        ]

        roster_payload = {
            "flight": flight.flight_number,
            "backend": backend,
            "crew": crew_payload,
            "passengers": passenger_payload,
            "remaining_seats": remaining_pools,
        }

        roster = Roster.objects.create(
            flight=flight,
            backend=backend,
            payload=roster_payload,
            created_by=user if user and getattr(user, "is_authenticated", False) else None,
        )

        for pilot in pilots:
            RosterCrewAssignment.objects.create(
                roster=roster,
                crew_type="pilot",
                pilot=pilot,
                assigned_role=pilot.seniority,
            )

        for crew in cabin_crew:
            RosterCrewAssignment.objects.create(
                roster=roster,
                crew_type="cabin",
                cabin_crew=crew,
                assigned_role=crew.role,
            )

        for assignment in passenger_assignments:
            RosterPassengerAssignment.objects.create(
                roster=roster,
                passenger=assignment["passenger"],
                seat_number=assignment["seat_number"],
                seat_type=assignment["seat_type"],
                is_infant=assignment["is_infant"],
            )

    return roster
