from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from .models import Aircraft, Flight, Passenger, FlightTicket


class FlightAPITests(APITestCase):
    def setUp(self):
        # create and authenticate a user for POST/PUT/DELETE
        self.user = User.objects.create_user(username='tester', password='password')
        self.client.force_authenticate(user=self.user)

        self.aircraft = Aircraft.objects.create(
            model='Boeing 737', registration_code='N12345', capacity=160, manufacturer='Boeing'
        )

        now = timezone.now()
        self.flight = Flight.objects.create(
            flight_number='AB123', origin='JFK', destination='LHR',
            departure_time=now + timedelta(days=1),
            arrival_time=now + timedelta(days=1, hours=7),
            status='Scheduled', aircraft=self.aircraft
        )

    def test_flight_list(self):
        url = reverse('flight-list')
        resp = self.client.get(url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('results', resp.data)
        self.assertTrue(any(item.get('flight_number') == 'AB123' for item in data))

    def test_create_flight_invalid_times(self):
        url = reverse('flight-list')
        now = timezone.now()
        payload = {
            'flight_number': 'CD456',
            'origin': 'SFO',
            'destination': 'LAX',
            'departure_time': (now + timedelta(days=2)).isoformat(),
            'arrival_time': (now + timedelta(days=2) - timedelta(hours=1)).isoformat(),
            'status': 'Scheduled',
            'aircraft_id': self.aircraft.id,
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # validation error message should mention departure_time or be in non-field errors
        self.assertTrue('departure_time' in str(resp.data) or 'non_field_errors' in str(resp.data))


class TicketAndPassengerAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester2', password='password')
        self.client.force_authenticate(user=self.user)

        self.aircraft = Aircraft.objects.create(
            model='Airbus A320', registration_code='N54321', capacity=150, manufacturer='Airbus'
        )

        now = timezone.now()
        self.flight = Flight.objects.create(
            flight_number='EF789', origin='ORD', destination='MIA',
            departure_time=now + timedelta(days=3),
            arrival_time=now + timedelta(days=3, hours=3),
            status='Scheduled', aircraft=self.aircraft
        )

        self.passenger = Passenger.objects.create(
            first_name='Alice', last_name='Smith', email='alice@example.com', phone='555-1234',
            passport_number='P12345678', nationality='US', date_of_birth='1990-01-01'
        )

        self.ticket = FlightTicket.objects.create(
            ticket_number='TKT0001', flight=self.flight, passenger=self.passenger,
            seat_number='12A', ticket_class='Economy', price='199.00', status='Booked'
        )

    def test_ticket_list(self):
        url = reverse('ticket-list')
        resp = self.client.get(url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('results', resp.data)
        self.assertTrue(any(item.get('ticket_number') == 'TKT0001' for item in data))

    def test_create_passenger_duplicate_passport(self):
        url = reverse('passenger-list')
        payload = {
            'first_name': 'Bob',
            'last_name': 'Jones',
            'email': 'bob@example.com',
            'phone': '555-9999',
            'passport_number': 'P12345678',
            'nationality': 'US',
            'date_of_birth': '1985-05-05'
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # unique constraint violation should mention passport_number or email
        self.assertTrue('passport_number' in str(resp.data) or 'email' in str(resp.data) or 'unique' in str(resp.data).lower())
from django.test import TestCase

# Create your tests here.
