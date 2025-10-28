from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Aircraft, Flight, Staff, Passenger, FlightTicket
from .serializers import AircraftSerializer, FlightSerializer, StaffSerializer, PassengerSerializer, TicketSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken


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

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated and (user.is_staff or user.is_superuser):
            return qs
        if user and user.is_authenticated:
            return qs.filter(user=user)
        return qs.none()

    def perform_create(self, serializer):
        # server-side simple pricing logic (example): base price 100.00 for Economy, 300 for Business, 600 for First
        cls = serializer.validated_data.get('ticket_class', 'Economy')
        base = {'Economy': 100.00, 'Business': 300.00, 'First': 600.00}.get(cls, 100.00)
        # assign current user as owner if available
        user = self.request.user if self.request and self.request.user and self.request.user.is_authenticated else None
        serializer.save(price=str(base), user=user)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a basic user account and return JWT tokens."""
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')
    if not username or not password:
        return Response({'detail': 'username and password required'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(username=username, password=password, email=email)
    refresh = RefreshToken.for_user(user)
    return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})
