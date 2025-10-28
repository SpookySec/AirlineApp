from rest_framework import serializers
from .models import Aircraft, Flight, Staff, Passenger, FlightTicket, FlightStaff


class AircraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = ['id', 'model', 'registration_code', 'capacity', 'manufacturer', 'in_service']


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = ['id', 'first_name', 'last_name', 'role', 'email', 'phone', 'hire_date']


class PassengerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passenger
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'passport_number', 'nationality', 'date_of_birth']


class FlightSerializer(serializers.ModelSerializer):
    aircraft = AircraftSerializer(read_only=True)
    aircraft_id = serializers.PrimaryKeyRelatedField(
        queryset=Aircraft.objects.all(), source='aircraft', write_only=True, required=False
    )
    flight_staff = serializers.SerializerMethodField()

    class Meta:
        model = Flight
        fields = ['id', 'flight_number', 'origin', 'destination', 'departure_time', 'arrival_time', 'status', 'aircraft', 'aircraft_id', 'flight_staff']

    def validate(self, data):
        dep = data.get('departure_time') or getattr(self.instance, 'departure_time', None)
        arr = data.get('arrival_time') or getattr(self.instance, 'arrival_time', None)
        if dep and arr and dep >= arr:
            raise serializers.ValidationError("departure_time must be before arrival_time")
        return data

    def get_flight_staff(self, obj):
        # return simplified staff info
        return [{'id': fs.staff.id, 'first_name': fs.staff.first_name, 'last_name': fs.staff.last_name, 'assigned_role': fs.assigned_role} for fs in obj.flight_staff.all()]


class FlightStaffSerializer(serializers.ModelSerializer):
    staff = StaffSerializer(read_only=True)
    staff_id = serializers.PrimaryKeyRelatedField(queryset=Staff.objects.all(), source='staff', write_only=True)

    class Meta:
        model = FlightStaff
        fields = ['id', 'flight', 'staff', 'staff_id', 'assigned_role', 'assigned_at']


class TicketSerializer(serializers.ModelSerializer):
    passenger = PassengerSerializer(read_only=True)
    passenger_id = serializers.PrimaryKeyRelatedField(queryset=Passenger.objects.all(), source='passenger', write_only=True)
    flight = FlightSerializer(read_only=True)
    flight_id = serializers.PrimaryKeyRelatedField(queryset=Flight.objects.all(), source='flight', write_only=True)

    class Meta:
        model = FlightTicket
        fields = ['id', 'ticket_number', 'flight', 'flight_id', 'passenger', 'passenger_id', 'seat_number', 'ticket_class', 'price', 'booking_date', 'status', 'user']
        read_only_fields = ['booking_date', 'price', 'user']
