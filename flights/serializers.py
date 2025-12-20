from rest_framework import serializers
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
    RosterCrewAssignment,
    RosterPassengerAssignment,
)


class AirportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airport
        fields = ['id', 'code', 'name', 'city', 'country']
    
    def validate_code(self, value):
        """Validate airport code format: AAA (3 uppercase letters)"""
        import re
        if value:
            value = value.upper()
            if not re.match(r'^[A-Z]{3}$', value):
                raise serializers.ValidationError(
                    'Airport code must be exactly 3 uppercase letters (AAA format).'
                )
        return value


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'category', 'description']


class PlaneTypeSerializer(serializers.ModelSerializer):
    standard_menu = MenuItemSerializer(many=True, read_only=True)
    standard_menu_ids = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.all(), many=True, source='standard_menu', write_only=True, required=False
    )

    class Meta:
        model = PlaneType
        fields = [
            'id',
            'code',
            'name',
            'total_seats',
            'business_seats',
            'economy_seats',
            'seat_layout',
            'max_cabin_crew',
            'min_cabin_crew',
            'standard_menu',
            'standard_menu_ids',
        ]


class PilotSerializer(serializers.ModelSerializer):
    """
    Pilot Information Serializer
    
    Exposes all pilot information:
    - Pilot ID (code): Unique identifier
    - Pilot info: Name (first_name, last_name), age, gender, nationality, known_languages
    - Vehicle restriction: Single plane type the pilot can operate
    - Allowed range: Maximum distance (max_range_km)
    - Seniority level: senior, junior, or trainee
    """
    vehicle_restriction = PlaneTypeSerializer(read_only=True)
    vehicle_restriction_id = serializers.PrimaryKeyRelatedField(
        queryset=PlaneType.objects.all(), 
        source='vehicle_restriction', 
        write_only=True,
        required=False,
        allow_null=True
    )
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Pilot
        fields = [
            'id', 
            'code',  # Pilot ID - unique identifier designated by API system
            'first_name', 
            'last_name',
            'full_name',  # Convenience field
            'age', 
            'gender', 
            'nationality', 
            'known_languages',  # List of language codes
            'vehicle_restriction',  # Single plane type restriction
            'vehicle_restriction_id',  # Write-only field for setting restriction
            'max_range_km',  # Maximum allowed distance in kilometers
            'seniority'  # senior, junior, or trainee
        ]
        read_only_fields = ['id', 'full_name']
    
    def get_full_name(self, obj):
        """Return pilot's full name"""
        return f"{obj.first_name} {obj.last_name}"
    
    def validate_known_languages(self, value):
        """Validate known_languages is a list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("known_languages must be a list")
        return value
    
    def validate_seniority(self, value):
        """Validate seniority is one of the allowed choices"""
        if value and value not in ['senior', 'junior', 'trainee']:
            raise serializers.ValidationError("seniority must be 'senior', 'junior', or 'trainee'")
        return value


class CabinCrewSerializer(serializers.ModelSerializer):
    vehicle_restrictions = PlaneTypeSerializer(many=True, read_only=True)
    vehicle_restriction_ids = serializers.PrimaryKeyRelatedField(
        queryset=PlaneType.objects.all(), many=True, source='vehicle_restrictions', write_only=True
    )
    recipes = MenuItemSerializer(many=True, read_only=True)
    recipe_ids = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.all(), many=True, source='recipes', write_only=True, required=False
    )

    class Meta:
        model = CabinCrew
        fields = [
            'id', 'code', 'first_name', 'last_name', 'age', 'gender', 'nationality', 'known_languages',
            'role', 'seniority', 'vehicle_restrictions', 'vehicle_restriction_ids', 'recipes', 'recipe_ids'
        ]


class PassengerSerializer(serializers.ModelSerializer):
    """
    Passenger Information Serializer
    
    Exposes all passenger information:
    - Passenger ID: Unique identifier (id field)
    - Flight ID: Flight number(s) through tickets (can include shared flights)
    - Passenger info: Name, age, gender, nationality, seat type
    - Infant handling: Parent information for infants (age 0-2)
    - Seat number: May be designated or absent
    - Affiliated passengers: 1-2 passenger IDs (when seat number absent)
    """
    affiliated_passengers = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    affiliated_passenger_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Passenger.objects.all(), 
        source='affiliated_passengers', 
        write_only=True, 
        required=False
    )
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Passenger.objects.all(), 
        source='parent', 
        allow_null=True, 
        required=False
    )
    flight_numbers = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Passenger
        fields = [
            'id',  # Passenger ID - unique identifier designated by API system
            'first_name', 
            'last_name',
            'full_name',  # Convenience field
            'email', 
            'phone', 
            'passport_number', 
            'nationality',
            'date_of_birth', 
            'age', 
            'gender', 
            'seat_type',  # business or economy
            'seat_number',  # May be designated or absent
            'parent',  # Parent passenger for infants (age 0-2)
            'parent_id',  # Write-only field for setting parent
            'affiliated_passengers',  # List of 1-2 affiliated passenger IDs (read-only)
            'affiliated_passenger_ids',  # Write-only field for setting affiliated passengers
            'flight_numbers',  # Flight number(s) associated with passenger (can include shared flights)
            'created_at', 
            'is_infant'  # Computed property (age <= 2)
        ]
        read_only_fields = ['created_at', 'is_infant', 'parent', 'full_name', 'flight_numbers']
    
    def get_full_name(self, obj):
        """Return passenger's full name"""
        return f"{obj.first_name} {obj.last_name}"
    
    def get_flight_numbers(self, obj):
        """
        Get flight numbers associated with this passenger.
        Includes shared flight numbers if applicable.
        """
        return obj.get_flight_numbers()
    
    def validate_affiliated_passenger_ids(self, value):
        """Validate affiliated passengers limit (1-2)"""
        if value and len(value) > 2:
            raise serializers.ValidationError(
                "A passenger can have at most 2 affiliated passengers."
            )
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        # Validate infants don't have seats
        age = data.get('age') or getattr(self.instance, 'age', None) if self.instance else None
        seat_number = data.get('seat_number') or getattr(self.instance, 'seat_number', None) if self.instance else None
        
        if age and age <= 2 and seat_number:
            raise serializers.ValidationError({
                'seat_number': 'Infant passengers (age 0-2) cannot have seat assignments.'
            })
        
        # Validate infants have parent
        if age and age <= 2:
            parent = data.get('parent') or data.get('parent_id') or (getattr(self.instance, 'parent', None) if self.instance else None)
            if not parent:
                raise serializers.ValidationError({
                    'parent': 'Infant passengers (age 0-2) must have a parent passenger assigned.'
                })
        
        # Validate seat number or affiliated passengers (not both)
        seat_number = data.get('seat_number') or (getattr(self.instance, 'seat_number', None) if self.instance else None)
        affiliated = data.get('affiliated_passengers') or data.get('affiliated_passenger_ids') or []
        if self.instance:
            affiliated = list(affiliated) + list(self.instance.affiliated_passengers.all())
        
        if seat_number and affiliated:
            raise serializers.ValidationError({
                'seat_number': 'Cannot have both seat number and affiliated passengers. If seat number is absent, affiliated passengers (1-2) may be present for neighboring seat assignment.'
            })
        
        return data


class FlightSerializer(serializers.ModelSerializer):
    origin_airport = AirportSerializer(read_only=True)
    destination_airport = AirportSerializer(read_only=True)
    origin_airport_id = serializers.PrimaryKeyRelatedField(
        queryset=Airport.objects.all(), source='origin_airport', write_only=True
    )
    destination_airport_id = serializers.PrimaryKeyRelatedField(
        queryset=Airport.objects.all(), source='destination_airport', write_only=True
    )
    plane_type = PlaneTypeSerializer(read_only=True)
    plane_type_id = serializers.PrimaryKeyRelatedField(
        queryset=PlaneType.objects.all(), source='plane_type', write_only=True
    )

    class Meta:
        model = Flight
        fields = [
            'id', 'flight_number', 'shared_flight_number', 'shared_airline', 'connecting_flight_number',
            'origin_airport', 'destination_airport', 'origin_airport_id', 'destination_airport_id',
            'departure_time', 'arrival_time', 'duration_minutes', 'distance_km', 'plane_type', 'plane_type_id', 'status'
        ]

    def validate_flight_number(self, value):
        """Validate flight number format: AANNNN (2 letters + 4 digits)"""
        import re
        if value:
            value = value.upper()
            if not re.match(r'^[A-Z]{2}\d{4}$', value):
                raise serializers.ValidationError(
                    'Flight number must be in AANNNN format (2 letters followed by 4 digits).'
                )
            # Check company prefix
            from .models import Flight
            if not value.startswith(Flight.COMPANY_PREFIX):
                raise serializers.ValidationError(
                    f'Flight number must start with company prefix "{Flight.COMPANY_PREFIX}".'
                )
        return value
    
    def validate_shared_flight_number(self, value):
        """Validate shared flight number format: AANNNN"""
        import re
        if value:
            value = value.upper()
            if not re.match(r'^[A-Z]{2}\d{4}$', value):
                raise serializers.ValidationError(
                    'Shared flight number must be in AANNNN format (2 letters followed by 4 digits).'
                )
        return value
    
    def validate_connecting_flight_number(self, value):
        """Validate connecting flight number format: AANNNN"""
        import re
        if value:
            value = value.upper()
            if not re.match(r'^[A-Z]{2}\d{4}$', value):
                raise serializers.ValidationError(
                    'Connecting flight number must be in AANNNN format (2 letters followed by 4 digits).'
                )
        return value

    def validate(self, data):
        dep = data.get('departure_time') or getattr(self.instance, 'departure_time', None)
        arr = data.get('arrival_time') or getattr(self.instance, 'arrival_time', None)
        if dep and arr and dep >= arr:
            raise serializers.ValidationError("departure_time must be before arrival_time")
        
        # Validate connecting flight is only for shared flights
        connecting = data.get('connecting_flight_number') or getattr(self.instance, 'connecting_flight_number', None)
        shared = data.get('shared_flight_number') or getattr(self.instance, 'shared_flight_number', None)
        if connecting and not shared:
            raise serializers.ValidationError(
                "Connecting flight number can only be set for shared flights."
            )
        
        return data


class TicketSerializer(serializers.ModelSerializer):
    passenger = PassengerSerializer(read_only=True)
    passenger_id = serializers.PrimaryKeyRelatedField(queryset=Passenger.objects.all(), source='passenger', write_only=True)
    flight = FlightSerializer(read_only=True)
    flight_id = serializers.PrimaryKeyRelatedField(queryset=Flight.objects.all(), source='flight', write_only=True)

    class Meta:
        model = FlightTicket
        fields = ['id', 'ticket_number', 'flight', 'flight_id', 'passenger', 'passenger_id', 'seat_number', 'ticket_class', 'price', 'booking_date', 'status', 'user']
        read_only_fields = ['booking_date', 'price', 'user']


class RosterCrewAssignmentSerializer(serializers.ModelSerializer):
    pilot = PilotSerializer(read_only=True)
    pilot_id = serializers.PrimaryKeyRelatedField(queryset=Pilot.objects.all(), source='pilot', write_only=True, required=False, allow_null=True)
    cabin_crew = CabinCrewSerializer(read_only=True)
    cabin_crew_id = serializers.PrimaryKeyRelatedField(queryset=CabinCrew.objects.all(), source='cabin_crew', write_only=True, required=False, allow_null=True)

    class Meta:
        model = RosterCrewAssignment
        fields = ['id', 'crew_type', 'pilot', 'pilot_id', 'cabin_crew', 'cabin_crew_id', 'assigned_role', 'assigned_at']


class RosterPassengerAssignmentSerializer(serializers.ModelSerializer):
    passenger = PassengerSerializer(read_only=True)
    passenger_id = serializers.PrimaryKeyRelatedField(queryset=Passenger.objects.all(), source='passenger', write_only=True)

    class Meta:
        model = RosterPassengerAssignment
        fields = ['id', 'passenger', 'passenger_id', 'seat_number', 'seat_type', 'is_infant', 'assigned_at']


class RosterSerializer(serializers.ModelSerializer):
    flight = FlightSerializer(read_only=True)
    flight_id = serializers.PrimaryKeyRelatedField(queryset=Flight.objects.all(), source='flight', write_only=True)
    crew_assignments = RosterCrewAssignmentSerializer(many=True, read_only=True)
    passenger_assignments = RosterPassengerAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Roster
        fields = ['id', 'flight', 'flight_id', 'backend', 'payload', 'created_by', 'created_at', 'crew_assignments', 'passenger_assignments']
        read_only_fields = ['created_by', 'created_at']
