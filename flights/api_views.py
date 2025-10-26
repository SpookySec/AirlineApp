from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Aircraft, Flight, Staff, Passenger, FlightTicket
from .serializers import AircraftSerializer, FlightSerializer, StaffSerializer, PassengerSerializer, TicketSerializer


class AircraftViewSet(viewsets.ModelViewSet):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['model', 'registration_code', 'manufacturer']
    ordering_fields = ['model', 'capacity']


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.select_related('aircraft').all().order_by('id')
    serializer_class = FlightSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['origin', 'destination', 'status', 'aircraft__registration_code']
    search_fields = ['flight_number', 'origin', 'destination']
    ordering_fields = ['departure_time', 'arrival_time', 'flight_number']


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role']
    search_fields = ['first_name', 'last_name', 'email']


class PassengerViewSet(viewsets.ModelViewSet):
    queryset = Passenger.objects.all()
    serializer_class = PassengerSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'passport_number']


class TicketViewSet(viewsets.ModelViewSet):
    queryset = FlightTicket.objects.select_related('passenger', 'flight').all().order_by('id')
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'passenger', 'status', 'ticket_number']
    search_fields = ['ticket_number', 'seat_number']
