from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from .models import (
    Airport,
    PlaneType,
    Flight,
    Pilot,
    CabinCrew,
    Passenger,
    FlightTicket,
)

User = get_user_model()


class RosterGenerationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="password")
        self.client.force_authenticate(user=self.user)

        self.origin = Airport.objects.create(code="AAA", name="Alpha Airport", city="Alpha", country="Wonderland")
        self.destination = Airport.objects.create(code="BBB", name="Beta Airport", city="Beta", country="Wonderland")

        # Plane type with seat map
        self.plane = PlaneType.objects.create(
            code="PT1",
            name="TestPlane",
            total_seats=14,
            business_seats=4,
            economy_seats=10,
            seat_layout={
                "business": ["1A", "1B", "2A", "2B"],
                "economy": ["20A", "20B", "20C", "21A", "21B", "21C", "22A", "22B", "22C", "23A"],
            },
        )

        # Crew pools
        self.senior_pilot = Pilot.objects.create(
            code="P1",
            first_name="Senior",
            last_name="Pilot",
            age=45,
            gender="M",
            nationality="WL",
            known_languages=["EN"],
            vehicle_restriction=self.plane,
            max_range_km=5000,
            seniority="senior",
        )
        self.junior_pilot = Pilot.objects.create(
            code="P2",
            first_name="Junior",
            last_name="Pilot",
            age=32,
            gender="F",
            nationality="WL",
            known_languages=["EN"],
            vehicle_restriction=self.plane,
            max_range_km=5000,
            seniority="junior",
        )

        self.cabin_senior = CabinCrew.objects.create(
            code="C1",
            first_name="Chief",
            last_name="Crew",
            age=40,
            gender="F",
            nationality="WL",
            known_languages=["EN"],
            role="chief",
            seniority="senior",
        )
        self.cabin_juniors = []
        for i in range(1, 6):
            crew = CabinCrew.objects.create(
                code=f"J{i}",
                first_name=f"Junior{i}",
                last_name="Crew",
                age=25 + i,
                gender="M",
                nationality="WL",
                known_languages=["EN"],
                role="regular",
                seniority="junior",
            )
            self.cabin_juniors.append(crew)
        self.chef = CabinCrew.objects.create(
            code="CHEF1",
            first_name="Chef",
            last_name="Cook",
            age=35,
            gender="M",
            nationality="WL",
            known_languages=["EN"],
            role="chef",
            seniority="junior",
        )

        # Link vehicle restrictions
        for crew in [self.cabin_senior, *self.cabin_juniors, self.chef]:
            crew.vehicle_restrictions.add(self.plane)

        now = timezone.now()
        self.flight = Flight.objects.create(
            flight_number="FA0001",  # AANNNN format with company prefix FA
            origin_airport=self.origin,
            destination_airport=self.destination,
            departure_time=now + timedelta(days=1),
            arrival_time=now + timedelta(days=1, hours=2),
            duration_minutes=120,
            distance_km=1000,
            plane_type=self.plane,
            status="Scheduled",
        )

        # Passengers + tickets
        self.passenger1 = Passenger.objects.create(
            first_name="Alice",
            last_name="Smith",
            email="alice@example.com",
            phone="555-0001",
            passport_number="PASS1",
            nationality="WL",
            date_of_birth="1990-01-01",
            age=34,
            gender="F",
            seat_type="economy",
        )
        self.passenger2 = Passenger.objects.create(
            first_name="Bob",
            last_name="Jones",
            email="bob@example.com",
            phone="555-0002",
            passport_number="PASS2",
            nationality="WL",
            date_of_birth="1991-02-02",
            age=33,
            gender="M",
            seat_type="economy",
        )
        # affinity
        self.passenger1.affiliated_passengers.add(self.passenger2)

        FlightTicket.objects.create(
            ticket_number="TKT1",
            flight=self.flight,
            passenger=self.passenger1,
            seat_number=None,
            ticket_class="Economy",
            price="100.00",
            status="Booked",
        )
        FlightTicket.objects.create(
            ticket_number="TKT2",
            flight=self.flight,
            passenger=self.passenger2,
            seat_number=None,
            ticket_class="Economy",
            price="100.00",
            status="Booked",
        )

    def test_generate_roster_success(self):
        url = reverse("roster-generate")
        resp = self.client.post(url, {"flight_id": self.flight.id}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.data
        self.assertEqual(data["flight"]["flight_number"], "FA0001")
        # expect at least 2 pilots and 4 cabin crew
        self.assertGreaterEqual(len(data.get("crew_assignments", [])), 6)
        pax_assignments = data.get("passenger_assignments", [])
        self.assertEqual(len(pax_assignments), 2)
        seats = [p["seat_number"] for p in pax_assignments]
        self.assertTrue(all(seats))
        self.assertNotEqual(seats[0], seats[1])

    def test_generate_roster_missing_flight(self):
        url = reverse("roster-generate")
        resp = self.client.post(url, {"flight_id": 99999}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class FlightValidationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="flightuser", password="password", is_staff=True)
        self.client.force_authenticate(user=self.user)

        self.origin = Airport.objects.create(code="CCC", name="Gamma Airport", city="Gamma", country="Wonderland")
        self.destination = Airport.objects.create(code="DDD", name="Delta Airport", city="Delta", country="Wonderland")

        self.plane = PlaneType.objects.create(
            code="PT2",
            name="TestPlane2",
            total_seats=10,
            business_seats=2,
            economy_seats=8,
        )

    def test_invalid_times(self):
        url = reverse("flight-list")
        now = timezone.now()
        payload = {
            "flight_number": "FA0001",  # Valid AANNNN format with company prefix
            "origin_airport_id": self.origin.id,
            "destination_airport_id": self.destination.id,
            "departure_time": (now + timedelta(days=1)).isoformat(),
            "arrival_time": (now + timedelta(days=1) - timedelta(hours=1)).isoformat(),
            "duration_minutes": 60,
            "distance_km": 500,
            "plane_type_id": self.plane.id,
            "status": "Scheduled",
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("departure_time", str(resp.data))
