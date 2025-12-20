# Flight Information API Requirements Compliance

## Requirements Checklist

### ✅ 1. Flight Number Format
- **Requirement**: AANNNN format (2 letters + 4 digits), first 2 letters same for company
- **Implementation**: 
  - `Flight.flight_number` is `CharField(max_length=6)`
  - Validation in `Flight.clean()` ensures format matches `^[A-Z]{2}\d{4}$`
  - Company prefix constant `Flight.COMPANY_PREFIX = 'FA'` ensures all flights start with "FA"
  - Validation ensures first 2 letters match company prefix
  - Serializer validation in `FlightSerializer.validate_flight_number()`

### ✅ 2. Flight Information
- **Requirement**: Date up to minutes resolution, duration, distance
- **Implementation**:
  - `departure_time`: `DateTimeField` (resolution up to minutes)
  - `arrival_time`: `DateTimeField` (resolution up to minutes)
  - `duration_minutes`: `PositiveIntegerField` (duration in minutes)
  - `distance_km`: `PositiveIntegerField` (distance in kilometers)

### ✅ 3. Flight Source (Origin Airport)
- **Requirement**: Country, city, airport name, airport code (AAA format)
- **Implementation**:
  - `Airport` model with:
    - `country`: Country name
    - `city`: City name
    - `name`: Airport name
    - `code`: 3-letter code (AAA format)
  - Validation ensures code is exactly 3 uppercase letters
  - `Flight.origin_airport` ForeignKey to Airport

### ✅ 4. Flight Destination
- **Requirement**: Country, city, airport name, airport code (AAA format)
- **Implementation**:
  - Same `Airport` model as source
  - `Flight.destination_airport` ForeignKey to Airport

### ✅ 5. Vehicle Type (Plane Type)
- **Requirement**: 
  - Number of seats ✅
  - Seating plan ✅
  - At least 3 different types ✅
  - Limits on crew and passengers ✅
  - Standard menu associated ✅
- **Implementation**:
  - `PlaneType` model with:
    - `total_seats`: Total number of seats
    - `business_seats`: Business class seats
    - `economy_seats`: Economy class seats
    - `seat_layout`: JSON field storing seating plan (e.g., `{'business': ['1A', '1B'], 'economy': ['20A', '20B']}`)
    - `min_cabin_crew`: Minimum cabin crew required
    - `max_cabin_crew`: Maximum cabin crew allowed
    - `standard_menu`: ManyToMany to MenuItem (standard menu for this plane type)
  - Seed data includes 4 plane types:
    1. NARROW-180 (AeroLine 180) - 180 seats
    2. WIDE-300 (SkyCruiser 300) - 300 seats
    3. REG-90 (CityHopper 90) - 90 seats
    4. TURBO-60 (TurboProp 60) - 60 seats

### ✅ 6. Shared Flight Information
- **Requirement**: Shared flight number (AANNNN), airline company, connecting flight (only for shared flights)
- **Implementation**:
  - `shared_flight_number`: `CharField(max_length=6)` - AANNNN format
  - `shared_airline`: `CharField(max_length=80)` - Airline company name
  - `connecting_flight_number`: `CharField(max_length=6)` - AANNNN format, only for shared flights
  - Validation ensures:
    - Shared flight number is in AANNNN format
    - Connecting flight number is in AANNNN format
    - Connecting flight can only be set if shared_flight_number is set

### ✅ 7. Database Design
- **Requirement**: Efficient SQL database design following structured principles
- **Implementation**:
  - Normalized design:
    - `Airport` table (separate from Flight) - avoids duplication
    - `PlaneType` table (separate from Flight) - allows reuse
    - `MenuItem` table (separate from PlaneType) - allows menu reuse
    - Foreign keys with `PROTECT` to prevent accidental deletion
    - Proper indexing on unique fields (flight_number, airport code)
    - JSON field for flexible seat_layout storage
    - ManyToMany for standard_menu (normalized relationship)

## Validation Summary

All validations are implemented at both model and serializer levels:

1. **Flight Number**: Format validation (AANNNN) + Company prefix check
2. **Airport Code**: Format validation (AAA - 3 uppercase letters)
3. **Shared/Connecting Flight Numbers**: Format validation (AANNNN)
4. **Business Logic**: Connecting flight only for shared flights
5. **Time Validation**: Departure before arrival

## API Endpoints

The Flight Information API is exposed through:
- `GET /api/flights/` - List all flights
- `GET /api/flights/{id}/` - Get specific flight
- `POST /api/flights/` - Create flight (staff only)
- `PUT/PATCH /api/flights/{id}/` - Update flight (staff only)
- `DELETE /api/flights/{id}/` - Delete flight (staff only)

All endpoints return full flight information including:
- Flight number, dates, duration, distance
- Origin and destination airports (with country, city, name, code)
- Plane type (with seats, seating plan, crew limits, menu)
- Shared flight information (if applicable)
