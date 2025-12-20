from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
import re


class Airport(models.Model):
    """
    Airport Information Model
    
    Stores airport information including:
    - Airport code: 3-letter code (AAA format)
    - Airport name
    - City name
    - Country name
    """
    code = models.CharField(
        max_length=3, 
        unique=True,
        help_text="3-letter airport code (AAA format where A is an alphabetical letter)"
    )
    name = models.CharField(max_length=120, help_text="Airport name")
    city = models.CharField(max_length=120, help_text="City where airport is located")
    country = models.CharField(max_length=120, help_text="Country where airport is located")

    def clean(self):
        """Validate airport code format"""
        super().clean()
        if self.code:
            code = self.code.upper()
            if not re.match(r'^[A-Z]{3}$', code):
                raise ValidationError({
                    'code': 'Airport code must be exactly 3 uppercase letters (AAA format).'
                })
            self.code = code

    def save(self, *args, **kwargs):
        """Override save to run clean validation"""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.city}"


class MenuItem(models.Model):
    CATEGORY_CHOICES = [
        ('main', 'Main'),
        ('appetizer', 'Appetizer'),
        ('dessert', 'Dessert'),
        ('beverage', 'Beverage'),
    ]

    name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='main')
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class PlaneType(models.Model):
    """
    Vehicle Type Model
    
    Represents a type of aircraft with:
    - Seat information: Total seats, business seats, economy seats
    - Seating plan: JSON structure defining seat layout
    - Crew limits: Minimum and maximum cabin crew allowed
    - Standard menu: Menu items served during the flight
    """
    code = models.CharField(max_length=20, unique=True, help_text="Unique code identifying the plane type")
    name = models.CharField(max_length=120, help_text="Name of the plane type")
    total_seats = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Total number of seats in the aircraft"
    )
    business_seats = models.PositiveIntegerField(
        default=0, 
        null=True, 
        blank=True,
        help_text="Number of business class seats"
    )
    economy_seats = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Number of economy class seats"
    )
    seat_layout = models.JSONField(
        default=dict, 
        blank=True, 
        null=True,
        help_text="JSON structure storing seat map metadata for plane view (e.g., {'business': ['1A', '1B'], 'economy': ['20A', '20B']})"
    )
    standard_menu = models.ManyToManyField(
        MenuItem, 
        related_name='plane_types', 
        blank=True,
        help_text="Standard menu items served during flights on this plane type"
    )
    max_cabin_crew = models.PositiveIntegerField(
        default=20,
        help_text="Maximum number of cabin crew members allowed for this plane type"
    )
    min_cabin_crew = models.PositiveIntegerField(
        default=4,
        help_text="Minimum number of cabin crew members required for this plane type"
    )

    def __str__(self):
        return f"{self.code} ({self.name})"


class Flight(models.Model):
    """
    Flight Information Model
    
    Represents a flight with the following information:
    - Flight number: AANNNN format (2 letters + 4 digits), first 2 letters are company prefix
    - Flight info: Date/time (up to minutes), duration, distance
    - Source/Destination: Airport information (country, city, name, code)
    - Vehicle type: Plane type with seats, seating plan, crew limits, menu
    - Shared flight info: Shared flight number, airline, connecting flight
    """
    # Company prefix - first 2 letters of all flight numbers must match this
    COMPANY_PREFIX = 'FA'  # FlightAirline
    
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Boarding', 'Boarding'),
        ('Departed', 'Departed'),
        ('Cancelled', 'Cancelled'),
        ('Landed', 'Landed'),
    ]

    flight_number = models.CharField(
        max_length=6, 
        unique=True,
        help_text="Flight number in AANNNN format (2 letters + 4 digits). First 2 letters must be company prefix."
    )
    shared_flight_number = models.CharField(
        max_length=6, 
        blank=True, 
        null=True,
        help_text="Shared flight number in AANNNN format if flight is shared with another airline"
    )
    shared_airline = models.CharField(
        max_length=80, 
        blank=True, 
        null=True,
        help_text="Name of the airline company if this is a shared flight"
    )
    connecting_flight_number = models.CharField(
        max_length=6, 
        blank=True, 
        null=True,
        help_text="Connecting flight number in AANNNN format (only for shared flights)"
    )
    origin_airport = models.ForeignKey(
        Airport, 
        on_delete=models.PROTECT, 
        related_name='departures', 
        null=True, 
        blank=True,
        help_text="Source airport with country, city, name, and 3-letter code"
    )
    destination_airport = models.ForeignKey(
        Airport, 
        on_delete=models.PROTECT, 
        related_name='arrivals', 
        null=True, 
        blank=True,
        help_text="Destination airport with country, city, name, and 3-letter code"
    )
    departure_time = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Flight departure date and time (resolution up to minutes)"
    )
    arrival_time = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Flight arrival date and time (resolution up to minutes)"
    )
    duration_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Flight duration in minutes"
    )
    distance_km = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Flight distance in kilometers"
    )
    plane_type = models.ForeignKey(
        PlaneType, 
        on_delete=models.PROTECT, 
        related_name='flights', 
        null=True, 
        blank=True,
        help_text="Vehicle type with seat information, seating plan, crew limits, and standard menu"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        """Validate flight number format and company prefix"""
        super().clean()
        
        # Validate flight number format: AANNNN (2 letters + 4 digits)
        if self.flight_number:
            flight_number = self.flight_number.upper()
            if not re.match(r'^[A-Z]{2}\d{4}$', flight_number):
                raise ValidationError({
                    'flight_number': 'Flight number must be in AANNNN format (2 letters followed by 4 digits).'
                })
            
            # Validate company prefix (first 2 letters must match COMPANY_PREFIX)
            if not flight_number.startswith(self.COMPANY_PREFIX):
                raise ValidationError({
                    'flight_number': f'Flight number must start with company prefix "{self.COMPANY_PREFIX}".'
                })
            
            self.flight_number = flight_number
        
        # Validate shared flight number format if provided
        if self.shared_flight_number:
            shared = self.shared_flight_number.upper()
            if not re.match(r'^[A-Z]{2}\d{4}$', shared):
                raise ValidationError({
                    'shared_flight_number': 'Shared flight number must be in AANNNN format (2 letters followed by 4 digits).'
                })
            self.shared_flight_number = shared
        
        # Validate connecting flight number format if provided
        if self.connecting_flight_number:
            connecting = self.connecting_flight_number.upper()
            if not re.match(r'^[A-Z]{2}\d{4}$', connecting):
                raise ValidationError({
                    'connecting_flight_number': 'Connecting flight number must be in AANNNN format (2 letters followed by 4 digits).'
                })
            self.connecting_flight_number = connecting
        
        # Validate that connecting flight is only for shared flights
        if self.connecting_flight_number and not self.shared_flight_number:
            raise ValidationError({
                'connecting_flight_number': 'Connecting flight number can only be set for shared flights.'
            })

    def save(self, *args, **kwargs):
        """Override save to run clean validation"""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        origin = self.origin_airport.code if self.origin_airport else 'N/A'
        dest = self.destination_airport.code if self.destination_airport else 'N/A'
        return f"{self.flight_number} ({origin} → {dest})"


class Pilot(models.Model):
    """
    Flight Crew (Pilot) Information Model
    
    Represents a pilot in the flight crew pool with:
    - Pilot ID: Unique code designated by the API system
    - Pilot info: Name (first, last), age, gender, nationality, known languages
    - Vehicle restriction: Single type of vehicle (plane type) the pilot can operate
    - Allowed range: Maximum distance (km) the pilot can be assigned to
    - Seniority level: senior, junior, or trainee
    
    Flight Requirements:
    - Each flight must have at least one senior and one junior pilot
    - Flights may have at most two trainees
    """
    SENIORITY_CHOICES = [
        ('senior', 'Senior'),
        ('junior', 'Junior'),
        ('trainee', 'Trainee'),
    ]

    code = models.CharField(
        max_length=20, 
        unique=True,
        help_text="Unique pilot ID designated by the API system"
    )
    first_name = models.CharField(max_length=100, help_text="Pilot's first name")
    last_name = models.CharField(max_length=100, help_text="Pilot's last name")
    age = models.PositiveIntegerField(help_text="Pilot's age")
    gender = models.CharField(max_length=20, help_text="Pilot's gender")
    nationality = models.CharField(max_length=100, help_text="Pilot's nationality")
    known_languages = models.JSONField(
        default=list,
        help_text="List of language codes the pilot knows (e.g., ['EN', 'FR', 'DE'])"
    )
    vehicle_restriction = models.ForeignKey(
        PlaneType, 
        on_delete=models.PROTECT, 
        related_name='pilots', 
        null=True, 
        blank=True,
        help_text="Single type of vehicle (plane type) that the pilot can operate"
    )
    max_range_km = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Maximum allowed distance (in kilometers) that the pilot can be assigned to"
    )
    seniority = models.CharField(
        max_length=10, 
        choices=SENIORITY_CHOICES, 
        null=True, 
        blank=True,
        help_text="Pilot seniority level: senior, junior, or trainee"
    )

    class Meta:
        ordering = ['seniority', 'code']
        indexes = [
            models.Index(fields=['seniority', 'vehicle_restriction']),
            models.Index(fields=['max_range_km']),
        ]

    def __str__(self):
        return f"{self.code} - {self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        """Return pilot's full name"""
        return f"{self.first_name} {self.last_name}"


class CabinCrew(models.Model):
    ROLE_CHOICES = [
        ('chief', 'Chief'),
        ('regular', 'Regular'),
        ('chef', 'Chef'),
    ]
    SENIORITY_CHOICES = [
        ('senior', 'Senior'),
        ('junior', 'Junior'),
    ]

    code = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=20)
    nationality = models.CharField(max_length=100)
    known_languages = models.JSONField(default=list)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    seniority = models.CharField(max_length=10, choices=SENIORITY_CHOICES)
    vehicle_restrictions = models.ManyToManyField(PlaneType, related_name='cabin_crews', blank=True)
    recipes = models.ManyToManyField(MenuItem, related_name='chefs', blank=True)

    def __str__(self):
        return f"{self.code} - {self.first_name} {self.last_name} ({self.role})"


class Passenger(models.Model):
    """
    Passenger Information Model
    
    Represents a passenger with:
    - Passenger ID: Unique ID designated by the API system (uses model id)
    - Flight ID: Flight number(s) through FlightTicket relationship (can be from shared flights)
    - Passenger info: Name, age, gender, nationality, seat type (business/economy)
    - Infant passengers (age 0-2): No seats, have parent information
    - Seat number: May be designated or absent
    - Affiliated passengers: 1-2 passenger IDs if seat number absent (for neighboring seat assignment)
    """
    SEAT_TYPE_CHOICES = [
        ('business', 'Business'),
        ('economy', 'Economy'),
    ]

    first_name = models.CharField(max_length=100, help_text="Passenger's first name")
    last_name = models.CharField(max_length=100, help_text="Passenger's last name")
    email = models.EmailField(unique=True, help_text="Passenger's email address")
    phone = models.CharField(max_length=20, help_text="Passenger's phone number")
    passport_number = models.CharField(
        max_length=50, 
        unique=True,
        help_text="Passenger's passport number (unique identifier)"
    )
    nationality = models.CharField(max_length=100, help_text="Passenger's nationality")
    date_of_birth = models.DateField(help_text="Passenger's date of birth")
    age = models.PositiveIntegerField(
        default=18,
        help_text="Passenger's age (0-2 for infants)"
    )
    gender = models.CharField(
        max_length=20, 
        blank=True, 
        default='',
        help_text="Passenger's gender"
    )
    seat_type = models.CharField(
        max_length=20, 
        choices=SEAT_TYPE_CHOICES, 
        default='economy', 
        null=True, 
        blank=True,
        help_text="Seat type: business or economy"
    )
    seat_number = models.CharField(
        max_length=10, 
        blank=True, 
        null=True,
        help_text="Designated seat number (may be absent, in which case affiliated passengers may be present)"
    )
    parent = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name='infants',
        help_text="Parent passenger for infant passengers (age 0-2). Infants do not have seats."
    )
    affiliated_passengers = models.ManyToManyField(
        'self', 
        blank=True, 
        symmetrical=False, 
        related_name='affiliates',
        help_text="List of 1-2 affiliated passenger IDs (used when seat number is absent for neighboring seat assignment)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['seat_type', 'seat_number']),
            models.Index(fields=['age']),
        ]

    def clean(self):
        """Validate passenger data"""
        super().clean()
        
        # Validate affiliated passengers limit (1-2)
        if self.id:  # Only check if passenger exists
            affiliates_count = self.affiliated_passengers.count()
            if affiliates_count > 2:
                raise ValidationError({
                    'affiliated_passengers': 'A passenger can have at most 2 affiliated passengers.'
                })
        
        # Validate infant passengers don't have seats
        if self.is_infant and self.seat_number:
            raise ValidationError({
                'seat_number': 'Infant passengers (age 0-2) cannot have seat assignments.'
            })
        
        # Validate infants have parent
        if self.is_infant and not self.parent:
            raise ValidationError({
                'parent': 'Infant passengers (age 0-2) must have a parent passenger assigned.'
            })

    def save(self, *args, **kwargs):
        """Override save to run clean validation"""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_infant(self):
        """Check if passenger is an infant (age 0-2)"""
        return self.age <= 2
    
    @property
    def full_name(self):
        """Return passenger's full name"""
        return f"{self.first_name} {self.last_name}"
    
    def get_flight_numbers(self):
        """
        Get flight numbers associated with this passenger.
        Returns list of flight numbers (including shared flights if applicable).
        """
        flight_numbers = []
        for ticket in self.tickets.all():
            if ticket.flight:
                flight_numbers.append(ticket.flight.flight_number)
                # Include shared flight number if present
                if ticket.flight.shared_flight_number:
                    flight_numbers.append(ticket.flight.shared_flight_number)
        return list(set(flight_numbers))  # Remove duplicates


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
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    passenger = models.ForeignKey(Passenger, on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    seat_number = models.CharField(max_length=10, blank=True, null=True)
    ticket_class = models.CharField(max_length=20, choices=CLASS_CHOICES, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    booking_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Booked')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket {self.ticket_number} ({self.flight.flight_number})"


class Roster(models.Model):
    BACKEND_CHOICES = [
        ('sql', 'SQL'),
        ('nosql', 'NoSQL'),
    ]

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='rosters', null=True, blank=True)
    backend = models.CharField(max_length=10, choices=BACKEND_CHOICES, default='sql')
    payload = models.JSONField(default=dict)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='rosters')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Roster for {self.flight.flight_number} ({self.backend})"


class RosterCrewAssignment(models.Model):
    CREW_TYPE_CHOICES = [
        ('pilot', 'Pilot'),
        ('cabin', 'Cabin Crew'),
    ]

    roster = models.ForeignKey(Roster, on_delete=models.CASCADE, related_name='crew_assignments')
    crew_type = models.CharField(max_length=10, choices=CREW_TYPE_CHOICES)
    pilot = models.ForeignKey(Pilot, on_delete=models.CASCADE, null=True, blank=True)
    cabin_crew = models.ForeignKey(CabinCrew, on_delete=models.CASCADE, null=True, blank=True)
    assigned_role = models.CharField(max_length=50, blank=True, default='')
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Crew on {self.roster.flight.flight_number}"


class RosterPassengerAssignment(models.Model):
    roster = models.ForeignKey(Roster, on_delete=models.CASCADE, related_name='passenger_assignments')
    passenger = models.ForeignKey(Passenger, on_delete=models.CASCADE)
    seat_number = models.CharField(max_length=10, blank=True, null=True)
    seat_type = models.CharField(max_length=20, default='economy')
    is_infant = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Passenger {self.passenger} on {self.roster.flight.flight_number}"
