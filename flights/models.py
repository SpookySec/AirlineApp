from django.db import models


class Staff(models.Model):
    ROLE_CHOICES = [
        ('Pilot', 'Pilot'),
        ('Co-Pilot', 'Co-Pilot'),
        ('Cabin Crew', 'Cabin Crew'),
        ('Ground Staff', 'Ground Staff'),
        ('Admin', 'Admin'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    hire_date = models.DateField()
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"


class Aircraft(models.Model):
    model = models.CharField(max_length=100)
    registration_code = models.CharField(max_length=50, unique=True)
    capacity = models.PositiveIntegerField()
    manufacturer = models.CharField(max_length=100)
    in_service = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.registration_code} ({self.model})"


class Flight(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Boarding', 'Boarding'),
        ('Departed', 'Departed'),
        ('Cancelled', 'Cancelled'),
        ('Landed', 'Landed'),
    ]

    flight_number = models.CharField(max_length=20, unique=True)
    origin = models.CharField(max_length=10)
    destination = models.CharField(max_length=10)
    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    aircraft = models.ForeignKey(Aircraft, on_delete=models.CASCADE, related_name='flights')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.flight_number} ({self.origin} → {self.destination})"


class FlightStaff(models.Model):
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='flight_staff')
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='assigned_flights')
    assigned_role = models.CharField(max_length=50)
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.staff} on {self.flight}"


class Passenger(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    passport_number = models.CharField(max_length=50, unique=True)
    nationality = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class FlightTicket(models.Model):
    CLASS_CHOICES = [
        ('Economy', 'Economy'),
        ('Business', 'Business'),
        ('First', 'First'),
    ]

    STATUS_CHOICES = [
        ('Booked', 'Booked'),
        ('Checked-in', 'Checked-in'),
        ('Cancelled', 'Cancelled'),
        ('Completed', 'Completed'),
    ]

    ticket_number = models.CharField(max_length=50, unique=True)
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='tickets')
    passenger = models.ForeignKey(Passenger, on_delete=models.CASCADE, related_name='tickets')
    seat_number = models.CharField(max_length=10)
    ticket_class = models.CharField(max_length=20, choices=CLASS_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    booking_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Booked')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket {self.ticket_number} ({self.flight.flight_number})"
