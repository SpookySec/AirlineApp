import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker

from flights.models import (
    Airport,
    PlaneType,
    MenuItem,
    Flight,
    Pilot,
    CabinCrew,
    Passenger,
    FlightTicket,
)


class Command(BaseCommand):
    help = "Seed a richer demo with realistic flights, people, and aircraft"

    TARGET_FLIGHTS = 50
    TARGET_PASSENGERS = 150
    TARGET_PILOTS = 24
    TARGET_CABIN_CREW = 60

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data with Faker…")
        faker = Faker()
        faker.seed_instance(2024)

        airports = self._ensure_airports()
        menus = self._ensure_menus()
        plane_types = self._ensure_planes(menus)
        pilots = self._ensure_pilots(faker, plane_types)
        cabin_crew = self._ensure_cabin_crew(faker, plane_types)
        flights = self._ensure_flights(faker, plane_types, airports)
        passengers = self._ensure_passengers(faker)
        self._ensure_tickets(faker, flights, passengers)

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))

    def _ensure_airports(self):
        airport_seed = [
            ("SFO", "San Francisco International", "San Francisco", "USA"),
            ("LAX", "Los Angeles International", "Los Angeles", "USA"),
            ("SEA", "Seattle Tacoma", "Seattle", "USA"),
            ("JFK", "John F. Kennedy", "New York", "USA"),
            ("ORD", "O'Hare", "Chicago", "USA"),
            ("DFW", "Dallas/Fort Worth", "Dallas", "USA"),
            ("ATL", "Hartsfield-Jackson", "Atlanta", "USA"),
            ("DEN", "Denver International", "Denver", "USA"),
            ("MIA", "Miami International", "Miami", "USA"),
            ("BOS", "Logan", "Boston", "USA"),
        ]
        airports = []
        for code, name, city, country in airport_seed:
            airport, _ = Airport.objects.get_or_create(
                code=code,
                defaults={"name": name, "city": city, "country": country},
            )
            airports.append(airport)
        return airports

    def _ensure_menus(self):
        menu_seed = [
            ("Citrus Salad", "appetizer", "Baby greens with citrus vinaigrette"),
            ("Herb Chicken", "main", "Roast chicken with herbs"),
            ("Mushroom Risotto", "main", "Creamy arborio with porcini"),
            ("Chocolate Torte", "dessert", "Flourless dark chocolate"),
            ("Espresso", "beverage", "Fresh pulled espresso"),
        ]
        menus = []
        for name, category, desc in menu_seed:
            item, _ = MenuItem.objects.get_or_create(
                name=name,
                defaults={"category": category, "description": desc},
            )
            menus.append(item)
        return menus

    def _ensure_planes(self, menus):
        plane_seed = [
            {
                "code": "NARROW-180",
                "name": "AeroLine 180",
                "total_seats": 180,
                "business_seats": 24,
                "economy_seats": 156,
                "min_cabin_crew": 6,
                "max_cabin_crew": 12,
                "seat_layout": {
                    "business": [f"{r}{s}" for r in range(1, 5) for s in ["A", "C", "D", "F"]],
                    "economy": [f"{r}{s}" for r in range(10, 40) for s in ["A", "B", "C", "D", "E", "F"]],
                },
            },
            {
                "code": "WIDE-300",
                "name": "SkyCruiser 300",
                "total_seats": 300,
                "business_seats": 40,
                "economy_seats": 260,
                "min_cabin_crew": 8,
                "max_cabin_crew": 18,
                "seat_layout": {
                    "business": [f"{r}{s}" for r in range(1, 8) for s in ["A", "C", "D", "G", "J", "L"]],
                    "economy": [f"{r}{s}" for r in range(20, 60) for s in ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"]],
                },
            },
            {
                "code": "REG-90",
                "name": "CityHopper 90",
                "total_seats": 90,
                "business_seats": 12,
                "economy_seats": 78,
                "min_cabin_crew": 4,
                "max_cabin_crew": 8,
                "seat_layout": {
                    "business": [f"{r}{s}" for r in range(1, 4) for s in ["A", "C", "D", "F"]],
                    "economy": [f"{r}{s}" for r in range(6, 25) for s in ["A", "B", "C", "D", "E", "F"]],
                },
            },
            {
                "code": "TURBO-60",
                "name": "TurboProp 60",
                "total_seats": 60,
                "business_seats": 8,
                "economy_seats": 52,
                "min_cabin_crew": 3,
                "max_cabin_crew": 6,
                "seat_layout": {
                    "business": [f"{r}{s}" for r in range(1, 3) for s in ["A", "C", "D", "F"]],
                    "economy": [f"{r}{s}" for r in range(5, 20) for s in ["A", "B", "C", "D"]],
                },
            },
        ]
        planes = []
        for seed in plane_seed:
            plane, _ = PlaneType.objects.get_or_create(
                code=seed["code"],
                defaults={
                    "name": seed["name"],
                    "total_seats": seed["total_seats"],
                    "business_seats": seed["business_seats"],
                    "economy_seats": seed["economy_seats"],
                    "seat_layout": seed["seat_layout"],
                    "min_cabin_crew": seed["min_cabin_crew"],
                    "max_cabin_crew": seed["max_cabin_crew"],
                },
            )
            plane.standard_menu.set(menus)
            planes.append(plane)
        return planes

    def _ensure_pilots(self, faker, plane_types):
        """
        Ensure sufficient pilots with proper seniority distribution.
        Creates pilots with:
        - Unique pilot IDs (code field)
        - Name, age, gender, nationality, known languages
        - Vehicle restriction (single plane type)
        - Allowed range (max_range_km)
        - Seniority level (senior, junior, trainee)
        
        Distribution ensures enough seniors and juniors for flight requirements.
        """
        existing = Pilot.objects.count()
        pilots = list(Pilot.objects.all())
        target = self.TARGET_PILOTS - existing
        
        # Ensure proper distribution: more seniors and juniors than trainees
        # This ensures we can always meet flight requirements (1 senior, 1 junior, max 2 trainees)
        seniority_weights = {"senior": 0.4, "junior": 0.4, "trainee": 0.2}
        
        for idx in range(target):
            first = faker.first_name()
            last = faker.last_name()
            # Weighted random selection to ensure enough seniors and juniors
            seniority = random.choices(
                ["senior", "junior", "trainee"],
                weights=[seniority_weights["senior"], seniority_weights["junior"], seniority_weights["trainee"]]
            )[0]
            plane = random.choice(plane_types)
            
            # Pilot ID: Unique code designated by API system
            pilot = Pilot.objects.create(
                code=f"P{existing + idx + 1000:04d}",  # Unique pilot ID
                first_name=first,
                last_name=last,
                age=random.randint(28, 58),
                gender=random.choice(["M", "F"]),
                nationality=faker.country_code(),
                known_languages=["EN"] + ([] if random.random() < 0.5 else [faker.language_name()[:2].upper()]),
                vehicle_restriction=plane,  # Single vehicle type restriction
                max_range_km=random.randint(1500, 8000),  # Allowed range in km
                seniority=seniority,  # senior, junior, or trainee
            )
            pilots.append(pilot)
        return pilots

    def _ensure_cabin_crew(self, faker, plane_types):
        existing = CabinCrew.objects.count()
        crew = list(CabinCrew.objects.all())
        target = self.TARGET_CABIN_CREW - existing
        role_choices = ["chief", "regular", "regular", "regular", "chef"]
        for idx in range(max(target, 0)):
            first = faker.first_name()
            last = faker.last_name()
            role = random.choice(role_choices)
            seniority = "senior" if role == "chief" else random.choice(["junior", "senior"])
            member = CabinCrew.objects.create(
                code=f"CC{existing + idx + 2000}",
                first_name=first,
                last_name=last,
                age=random.randint(22, 55),
                gender=random.choice(["M", "F"]),
                nationality=faker.country_code(),
                known_languages=["EN"],
                role=role,
                seniority=seniority,
            )
            # Allow on a couple of plane types for variety
            choices = random.sample(plane_types, k=random.randint(1, len(plane_types)))
            member.vehicle_restrictions.set(choices)
            crew.append(member)
        return crew

    def _ensure_flights(self, faker, plane_types, airports):
        flights = list(Flight.objects.all())
        missing = max(self.TARGET_FLIGHTS - len(flights), 0)
        if missing == 0:
            return flights

        now = timezone.now()
        for idx in range(missing):
            origin, dest = random.sample(airports, 2)
            plane = random.choice(plane_types)
            day_offset = random.randint(1, 45)
            dep_hour = random.randint(5, 22)
            duration_minutes = random.choice([70, 95, 120, 140, 160, 180, 220, 260, 300, 360])
            departure = now + timedelta(days=day_offset, hours=dep_hour)
            arrival = departure + timedelta(minutes=duration_minutes)
            # Flight number in AANNNN format (FA = company prefix, 4 digits)
            # Flight number in AANNNN format (FA = company prefix, 4 digits)
            flight_number = f"FA{1000 + idx + len(flights):04d}"
            
            # Randomly assign shared flight info
            shared_airline = random.choice(["SkyLink", "AeroOne", "GlobalAir", None])
            shared_flight_number = None
            connecting_flight_number = None
            if shared_airline:
                # Generate shared flight number (different airline prefix)
                airline_prefix = random.choice(["SL", "AO", "GA"])
                shared_flight_number = f"{airline_prefix}{random.randint(1000, 9999):04d}"
                # Some shared flights have connecting flights
                if random.random() < 0.3:
                    connecting_flight_number = f"{airline_prefix}{random.randint(1000, 9999):04d}"
            
            flight = Flight.objects.create(
                flight_number=flight_number,
                origin_airport=origin,
                destination_airport=dest,
                departure_time=departure,
                arrival_time=arrival,
                duration_minutes=duration_minutes,
                distance_km=random.randint(600, 4500),
                plane_type=plane,
                status="Scheduled",
                shared_airline=shared_airline,
                shared_flight_number=shared_flight_number,
                connecting_flight_number=connecting_flight_number,
            )
            flights.append(flight)
        return flights

    def _ensure_passengers(self, faker):
        passengers = list(Passenger.objects.all())
        missing = max(self.TARGET_PASSENGERS - len(passengers), 0)
        today = timezone.now().date()
        for idx in range(missing):
            dob = faker.date_of_birth(minimum_age=1, maximum_age=78)
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            first = faker.first_name()
            last = faker.last_name()
            email = f"{first.lower()}.{last.lower()}.{idx + len(passengers)}@demoair.test"
            passport = f"PA{idx + len(passengers) + 10000:07d}"
            passenger = Passenger.objects.create(
                first_name=first,
                last_name=last,
                email=email,
                phone=faker.numerify("###-###-####")[:20],
                passport_number=passport,
                nationality=faker.country_code(),
                date_of_birth=dob,
                age=age,
                gender=random.choice(["M", "F"]),
                seat_type=random.choice(["economy"] * 4 + ["business"]),
            )
            passengers.append(passenger)
        return passengers

    def _ensure_tickets(self, faker, flights, passengers):
        if not flights or not passengers:
            return
        passenger_pool = passengers
        for flight in flights:
            existing = flight.tickets.count()
            if existing >= 3:
                continue
            ticket_count = random.randint(3, 8)
            for idx in range(ticket_count):
                pax = random.choice(passenger_pool)
                ticket_number = f"TKT-{flight.flight_number}-{existing + idx + 1}"
                FlightTicket.objects.get_or_create(
                    ticket_number=ticket_number,
                    defaults={
                        "flight": flight,
                        "passenger": pax,
                        "seat_number": None,
                        "ticket_class": "Business" if pax.seat_type == "business" else "Economy",
                        "price": random.choice([120.00, 180.00, 240.00, 320.00]),
                        "status": "Booked",
                    },
                )
