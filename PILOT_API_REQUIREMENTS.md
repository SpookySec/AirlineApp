# Flight Crew (Pilot) Information API Requirements Compliance

## Requirements Checklist

### ✅ 1. Pilot ID
- **Requirement**: Unique ID designated by the API system
- **Implementation**: 
  - `Pilot.code` field: `CharField(max_length=20, unique=True)`
  - Unique constraint ensures no duplicate pilot IDs
  - Used as the primary identifier in the API

### ✅ 2. Pilot Information
- **Requirement**: Name, age, gender, nationality, known languages
- **Implementation**:
  - `first_name`: Pilot's first name
  - `last_name`: Pilot's last name
  - `full_name`: Computed property for convenience
  - `age`: `PositiveIntegerField` - Pilot's age
  - `gender`: `CharField(max_length=20)` - Pilot's gender
  - `nationality`: `CharField(max_length=100)` - Pilot's nationality
  - `known_languages`: `JSONField(default=list)` - List of language codes (e.g., ['EN', 'FR', 'DE'])

### ✅ 3. Pilot Vehicle Restriction
- **Requirement**: Single type of vehicle the pilot can operate
- **Implementation**:
  - `vehicle_restriction`: `ForeignKey` to `PlaneType` (single relationship)
  - Nullable/blank to allow pilots without restrictions
  - `PROTECT` on delete to prevent accidental removal of plane types
  - Validation ensures pilot can only operate the specified plane type

### ✅ 4. Pilot Allowed Range
- **Requirement**: Maximum allowed distance that the pilot can be assigned to
- **Implementation**:
  - `max_range_km`: `PositiveIntegerField` - Maximum distance in kilometers
  - Used in roster generation to filter pilots by flight distance
  - Validation ensures pilot's max_range_km >= flight distance_km

### ✅ 5. Pilot Seniority Level
- **Requirement**: Indication if pilot is senior, junior, or trainee
- **Implementation**:
  - `seniority`: `CharField` with choices:
    - `'senior'`: Senior pilot
    - `'junior'`: Junior pilot
    - `'trainee'`: Trainee pilot
  - Validation ensures only valid seniority levels

### ✅ 6. Flight Requirements
- **Requirement**: 
  - At least one senior pilot
  - At least one junior pilot
  - At most two trainees
- **Implementation**:
  - Automatic selection in `_select_pilots()`:
    - Selects at least 1 senior and 1 junior
    - Adds up to 2 trainees if available
  - Manual selection validation:
    - Validates at least 1 senior pilot
    - Validates at least 1 junior pilot
    - Validates at most 2 trainees
    - Raises `ValueError` if requirements not met

### ✅ 7. Database Design
- **Requirement**: Efficient SQL database design following structured principles
- **Implementation**:
  - Normalized design:
    - `Pilot` table with all pilot information
    - `PlaneType` table (separate) - referenced via ForeignKey
    - Proper indexing:
      - Index on `(seniority, vehicle_restriction)` for efficient filtering
      - Index on `max_range_km` for range queries
    - Unique constraint on `code` (pilot ID)
    - Foreign key with `PROTECT` to prevent accidental deletion
    - JSON field for flexible language storage

## API Endpoints

The Pilot Information API is exposed through:
- `GET /api/pilots/` - List all pilots
- `GET /api/pilots/{id}/` - Get specific pilot
- `POST /api/pilots/` - Create pilot (staff only)
- `PUT/PATCH /api/pilots/{id}/` - Update pilot (staff only)
- `DELETE /api/pilots/{id}/` - Delete pilot (staff only)

### Filtering and Search
- Filter by: `vehicle_restriction`, `seniority`
- Search by: `code`, `first_name`, `last_name`, `nationality`
- Order by: `age`, `max_range_km`, `seniority`, `code`

## Validation Summary

All validations are implemented:

1. **Pilot Selection for Flights**:
   - Vehicle restriction must match flight's plane type
   - Max range must be >= flight distance
   - At least 1 senior pilot required
   - At least 1 junior pilot required
   - At most 2 trainees allowed

2. **Data Validation**:
   - `known_languages` must be a list
   - `seniority` must be one of: 'senior', 'junior', 'trainee'
   - `code` must be unique

## Example API Response

```json
{
  "id": 1,
  "code": "P1001",
  "first_name": "John",
  "last_name": "Smith",
  "full_name": "John Smith",
  "age": 45,
  "gender": "M",
  "nationality": "US",
  "known_languages": ["EN", "FR"],
  "vehicle_restriction": {
    "id": 1,
    "code": "NARROW-180",
    "name": "AeroLine 180"
  },
  "max_range_km": 5000,
  "seniority": "senior"
}
```
