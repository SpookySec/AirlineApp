# Passenger Information API Requirements Compliance

## Requirements Checklist

### ✅ 1. Passenger ID
- **Requirement**: Unique ID designated by the API system
- **Implementation**: 
  - `Passenger.id` field: Auto-incrementing primary key (unique identifier)
  - Also uses `passport_number` as a unique business identifier
  - Both serve as unique identifiers in the API

### ✅ 2. Flight ID
- **Requirement**: Flight number (same as flight API), may be from shared flights
- **Implementation**:
  - Passengers are linked to flights through `FlightTicket` model
  - `Passenger.get_flight_numbers()` method returns all flight numbers:
    - Primary flight number
    - Shared flight number (if applicable)
  - Serializer exposes `flight_numbers` field showing all associated flights
  - API supports filtering by `?flight_number=FA1234` query parameter

### ✅ 3. Passenger Information
- **Requirement**: Name, age, gender, nationality, seat type (business/economy)
- **Implementation**:
  - `first_name`, `last_name`: Passenger's name
  - `full_name`: Computed property for convenience
  - `age`: `PositiveIntegerField` - Passenger's age
  - `gender`: `CharField` - Passenger's gender
  - `nationality`: `CharField` - Passenger's nationality
  - `seat_type`: `CharField` with choices:
    - `'business'`: Business class
    - `'economy'`: Economy class

### ✅ 4. Infant Passengers (Age 0-2)
- **Requirement**: No seats, have parent information
- **Implementation**:
  - `is_infant`: Computed property (returns `True` if `age <= 2`)
  - `parent`: `ForeignKey` to another Passenger (the parent/guardian)
  - Validation ensures:
    - Infants cannot have seat assignments
    - Infants must have a parent assigned
  - Infants are handled specially in seat assignment (no seat assigned)

### ✅ 5. Seat Number
- **Requirement**: May be designated or absent
- **Implementation**:
  - `seat_number`: `CharField` (nullable, blank)
  - Can be set during booking or assigned automatically
  - If absent, `affiliated_passengers` may be present for neighboring seat assignment

### ✅ 6. Affiliated Passengers
- **Requirement**: If seat number absent, list of 1-2 affiliated passenger IDs for neighboring seat assignment
- **Implementation**:
  - `affiliated_passengers`: `ManyToManyField` to other Passengers
  - Validation ensures:
    - Maximum 2 affiliated passengers allowed
    - Cannot have both seat number and affiliated passengers
  - Seat assignment logic (`_assign_passenger_seats`):
    - Processes affiliated groups first
    - Tries to assign neighboring seats when possible
    - Groups passengers together in the same seat type section

### ✅ 7. Database Design
- **Requirement**: Efficient SQL database design following structured principles
- **Implementation**:
  - Normalized design:
    - `Passenger` table with all passenger information
    - `FlightTicket` table linking passengers to flights (many-to-many relationship)
    - Self-referential `parent` ForeignKey for infant-parent relationship
    - ManyToMany for `affiliated_passengers` (normalized relationship table)
  - Proper indexing:
    - Index on `(seat_type, seat_number)` for seat queries
    - Index on `age` for infant filtering
  - Unique constraints on `email` and `passport_number`
  - Foreign keys with appropriate `on_delete` behaviors

### ✅ 8. Authentication/Authorization
- **Requirement**: Neat and modern authentication/authorization system
- **Implementation**:
  - **JWT Authentication**: 
    - Token-based authentication using `djangorestframework-simplejwt`
    - Endpoints: `/api/token/` (obtain), `/api/token/refresh/` (refresh)
    - Tokens stored in localStorage on frontend
  - **User Registration**: 
    - `/api/register/` endpoint for user registration
    - Returns JWT tokens upon successful registration
  - **Permission Classes**:
    - `IsAuthenticatedOrReadOnly`: Read access for all, write for authenticated users
    - `IsStaffOrReadOnly`: Read for all, write for staff/superusers
    - `IsStaffOrSuperuser`: Only staff/superusers
    - `IsAuthenticated`: Only authenticated users
  - **API Endpoints Protection**:
    - Flight Information API: `IsStaffOrReadOnly`
    - Pilot Information API: `IsStaffOrReadOnly`
    - Passenger Information API: `IsAuthenticatedOrReadOnly`
    - Roster API: `IsStaffOrSuperuser`
  - **Frontend UI**: 
    - Login/Register pages with JWT token management
    - Protected routes requiring authentication
    - Token refresh handling

## API Endpoints

The Passenger Information API is exposed through:
- `GET /api/passengers/` - List all passengers
- `GET /api/passengers/{id}/` - Get specific passenger
- `GET /api/passengers/?flight_number=FA1234` - Filter by flight number
- `POST /api/passengers/` - Create passenger (authenticated users)
- `PUT/PATCH /api/passengers/{id}/` - Update passenger (authenticated users)
- `DELETE /api/passengers/{id}/` - Delete passenger (authenticated users)

### Filtering and Search
- Filter by: `seat_type`, `age`, `nationality`
- Search by: `first_name`, `last_name`, `email`, `passport_number`, `nationality`
- Order by: `age`, `last_name`, `first_name`, `created_at`
- Filter by flight: `?flight_number=FA1234` (includes shared flights)

## Validation Summary

All validations are implemented:

1. **Affiliated Passengers**:
   - Maximum 2 affiliated passengers allowed
   - Cannot have both seat number and affiliated passengers
   - Used for neighboring seat assignment when seat number is absent

2. **Infant Passengers**:
   - Infants (age 0-2) cannot have seat assignments
   - Infants must have a parent assigned
   - Infants are handled specially in seat assignment

3. **Seat Assignment Logic**:
   - Affiliated groups are processed first
   - System tries to assign neighboring seats
   - Falls back to any available seats if neighboring not possible

## Example API Response

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "age": 35,
  "gender": "M",
  "nationality": "US",
  "seat_type": "business",
  "seat_number": "1A",
  "parent": null,
  "affiliated_passengers": [],
  "flight_numbers": ["FA1001"],
  "email": "john.doe@example.com",
  "phone": "555-1234",
  "passport_number": "US123456",
  "date_of_birth": "1989-01-15",
  "is_infant": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Authentication Endpoints

- `POST /api/token/` - Obtain JWT access and refresh tokens
  - Body: `{"username": "user", "password": "pass"}`
  - Returns: `{"access": "...", "refresh": "..."}`
  
- `POST /api/token/refresh/` - Refresh access token
  - Body: `{"refresh": "..."}`
  - Returns: `{"access": "..."}`
  
- `POST /api/register/` - Register new user
  - Body: `{"username": "user", "password": "pass", "email": "email@example.com"}`
  - Returns: `{"access": "...", "refresh": "..."}`
  
- `GET /api/auth/me/` - Get current user info (requires authentication)
  - Returns: `{"id": 1, "username": "user", "email": "...", "is_staff": false, "is_superuser": false}`
