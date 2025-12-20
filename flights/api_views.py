from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Airport,
    PlaneType,
    Flight,
    Pilot,
    CabinCrew,
    Passenger,
    FlightTicket,
    MenuItem,
    Roster,
)
from .serializers import (
    AirportSerializer,
    PlaneTypeSerializer,
    FlightSerializer,
    PilotSerializer,
    CabinCrewSerializer,
    PassengerSerializer,
    TicketSerializer,
    MenuItemSerializer,
    RosterSerializer,
)
from .roster_engine import generate_roster
from .permissions import IsStaffOrReadOnly, IsStaffOrSuperuser

User = get_user_model()


class AirportViewSet(viewsets.ModelViewSet):
    queryset = Airport.objects.all()
    serializer_class = AirportSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['code', 'city', 'country', 'name']
    ordering_fields = ['code', 'city', 'country']


class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'category']
    ordering_fields = ['name']


class PlaneTypeViewSet(viewsets.ModelViewSet):
    queryset = PlaneType.objects.all()
    serializer_class = PlaneTypeSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['code', 'name']
    ordering_fields = ['total_seats', 'business_seats', 'economy_seats']


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.select_related('origin_airport', 'destination_airport', 'plane_type').all().order_by('id')
    serializer_class = FlightSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['origin_airport', 'destination_airport', 'status', 'plane_type__code']
    search_fields = ['flight_number', 'origin_airport__code', 'destination_airport__code']
    ordering_fields = ['departure_time', 'arrival_time', 'flight_number']


class PilotViewSet(viewsets.ModelViewSet):
    """
    Flight Crew (Pilot) Information API
    
    Provides information about the flight crew pool:
    - Pilot ID: Unique code designated by the API system
    - Pilot info: Name, age, gender, nationality, known languages
    - Vehicle restriction: Single type of vehicle the pilot can operate
    - Allowed range: Maximum distance the pilot can be assigned to
    - Seniority level: senior, junior, or trainee
    
    Flight Requirements:
    - Each flight must have at least one senior and one junior pilot
    - Flights may have at most two trainees
    """
    queryset = Pilot.objects.select_related('vehicle_restriction').all()
    serializer_class = PilotSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['vehicle_restriction', 'seniority']
    search_fields = ['code', 'first_name', 'last_name', 'nationality']
    ordering_fields = ['age', 'max_range_km', 'seniority', 'code']


class CabinCrewViewSet(viewsets.ModelViewSet):
    queryset = CabinCrew.objects.prefetch_related('vehicle_restrictions').all()
    serializer_class = CabinCrewSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'seniority', 'vehicle_restrictions']
    search_fields = ['code', 'first_name', 'last_name', 'nationality']
    ordering_fields = ['age']


class PassengerViewSet(viewsets.ModelViewSet):
    """
    Passenger Information API
    
    Provides information about passengers:
    - Passenger ID: Unique identifier designated by API system
    - Flight ID: Flight number(s) through tickets (can include shared flights)
    - Passenger info: Name, age, gender, nationality, seat type (business/economy)
    - Infant passengers (age 0-2): No seats, have parent information
    - Seat number: May be designated or absent
    - Affiliated passengers: 1-2 passenger IDs if seat number absent (for neighboring seat assignment)
    """
    queryset = Passenger.objects.prefetch_related('tickets__flight', 'affiliated_passengers', 'parent').all()
    serializer_class = PassengerSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['seat_type', 'age', 'nationality']
    search_fields = ['first_name', 'last_name', 'email', 'passport_number', 'nationality']
    ordering_fields = ['age', 'last_name', 'first_name', 'created_at']
    
    def get_queryset(self):
        """Optionally filter by flight number"""
        queryset = super().get_queryset()
        flight_number = self.request.query_params.get('flight_number', None)
        if flight_number:
            # Filter passengers by flight number (including shared flights)
            queryset = queryset.filter(
                tickets__flight__flight_number=flight_number
            ) | queryset.filter(
                tickets__flight__shared_flight_number=flight_number
            )
        return queryset.distinct()


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
        cls = serializer.validated_data.get('ticket_class', 'Economy')
        base = {'Economy': 100.00, 'Business': 300.00, 'First': 600.00}.get(cls, 100.00)
        user = self.request.user if self.request and self.request.user and self.request.user.is_authenticated else None
        serializer.save(price=str(base), user=user)


class RosterViewSet(viewsets.ModelViewSet):
    queryset = Roster.objects.select_related('flight').all().order_by('-created_at')
    serializer_class = RosterSerializer
    permission_classes = [IsStaffOrSuperuser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'backend']
    search_fields = ['flight__flight_number']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        user = self.request.user if self.request and self.request.user and self.request.user.is_authenticated else None
        serializer.save(created_by=user)

    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrSuperuser])
    def generate(self, request):
        flight_id = request.data.get('flight_id')
        backend = request.data.get('backend', 'sql')
        pilot_ids = request.data.get('pilot_ids', [])  # Optional manual selection
        cabin_crew_ids = request.data.get('cabin_crew_ids', [])  # Optional manual selection
        if not flight_id:
            return Response({'detail': 'flight_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            roster = generate_roster(
                flight_id=flight_id, 
                backend=backend, 
                user=request.user,
                pilot_ids=pilot_ids if pilot_ids else None,
                cabin_crew_ids=cabin_crew_ids if cabin_crew_ids else None
            )
        except Flight.DoesNotExist:
            return Response({'detail': 'flight not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(roster)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], permission_classes=[IsStaffOrSuperuser])
    def export_json(self, request, pk=None):
        """Export roster as JSON"""
        roster = self.get_object()
        export_data = {
            'flight': {
                'flight_number': roster.flight.flight_number if roster.flight else None,
                'origin': roster.flight.origin_airport.code if roster.flight and roster.flight.origin_airport else None,
                'destination': roster.flight.destination_airport.code if roster.flight and roster.flight.destination_airport else None,
                'departure': roster.flight.departure_time.isoformat() if roster.flight and roster.flight.departure_time else None,
                'arrival': roster.flight.arrival_time.isoformat() if roster.flight and roster.flight.arrival_time else None,
            },
            'backend': roster.backend,
            'created_at': roster.created_at.isoformat(),
            'crew': [],
            'passengers': []
        }
        
        # Add crew
        for assignment in roster.crew_assignments.all():
            if assignment.crew_type == 'pilot' and assignment.pilot:
                export_data['crew'].append({
                    'type': 'pilot',
                    'code': assignment.pilot.code,
                    'name': f"{assignment.pilot.first_name} {assignment.pilot.last_name}",
                    'role': assignment.assigned_role,
                })
            elif assignment.crew_type == 'cabin' and assignment.cabin_crew:
                export_data['crew'].append({
                    'type': 'cabin',
                    'code': assignment.cabin_crew.code,
                    'name': f"{assignment.cabin_crew.first_name} {assignment.cabin_crew.last_name}",
                    'role': assignment.assigned_role,
                })
        
        # Add passengers
        for assignment in roster.passenger_assignments.all():
            if assignment.passenger:
                export_data['passengers'].append({
                    'name': f"{assignment.passenger.first_name} {assignment.passenger.last_name}",
                    'seat': assignment.seat_number,
                    'seat_type': assignment.seat_type,
                    'email': assignment.passenger.email,
                    'passport': assignment.passenger.passport_number,
                })
        
        return Response(export_data, status=status.HTTP_200_OK)


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whoami(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    })
