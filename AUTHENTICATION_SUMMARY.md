# Authentication & Authorization System Summary

## Overview

The system implements a modern JWT-based authentication and authorization system for all API components. Only the main system (roster management) has a visual user interface.

## Authentication System

### JWT Token-Based Authentication
- **Library**: `djangorestframework-simplejwt`
- **Token Types**: Access tokens (short-lived) and Refresh tokens (long-lived)
- **Storage**: Frontend stores tokens in `localStorage`

### Authentication Endpoints

1. **Obtain Tokens** (`POST /api/token/`)
   - Body: `{"username": "user", "password": "pass"}`
   - Returns: `{"access": "...", "refresh": "..."}`
   - Used for login

2. **Refresh Token** (`POST /api/token/refresh/`)
   - Body: `{"refresh": "..."}`
   - Returns: `{"access": "..."}`
   - Used to get new access token when expired

3. **Register User** (`POST /api/register/`)
   - Body: `{"username": "user", "password": "pass", "email": "email@example.com"}`
   - Returns: `{"access": "...", "refresh": "..."}`
   - Creates new user account and returns tokens

4. **Get Current User** (`GET /api/auth/me/`)
   - Requires: Authentication header `Authorization: Bearer <token>`
   - Returns: `{"id": 1, "username": "user", "email": "...", "is_staff": false, "is_superuser": false}`

## Authorization (Permission Classes)

### Permission Levels

1. **AllowAny**: No authentication required
   - Used for: Registration endpoint

2. **IsAuthenticated**: Requires authentication
   - Used for: User profile endpoint, roster viewing

3. **IsAuthenticatedOrReadOnly**: Read for all, write for authenticated
   - Used for: Passenger API, Ticket API

4. **IsStaffOrReadOnly**: Read for all, write for staff/superusers
   - Used for: Flight API, Pilot API, Cabin Crew API, Airport API, PlaneType API, MenuItem API

5. **IsStaffOrSuperuser**: Only staff/superusers
   - Used for: Roster generation, roster viewing, roster export

## API Component Protection

### Flight Information API
- **Endpoint**: `/api/flights/`
- **Permission**: `IsStaffOrReadOnly`
- **Access**: Read for all, write for staff

### Pilot Information API
- **Endpoint**: `/api/pilots/`
- **Permission**: `IsStaffOrReadOnly`
- **Access**: Read for all, write for staff

### Cabin Crew Information API
- **Endpoint**: `/api/cabin-crew/`
- **Permission**: `IsStaffOrReadOnly`
- **Access**: Read for all, write for staff

### Passenger Information API
- **Endpoint**: `/api/passengers/`
- **Permission**: `IsAuthenticatedOrReadOnly`
- **Access**: Read for all, write for authenticated users

### Roster Management API
- **Endpoint**: `/api/rosters/`
- **Permission**: `IsStaffOrSuperuser`
- **Access**: Only staff/superusers can generate, view, and export rosters

## Frontend Authentication

### UI Components (Main System Only)
- **Login Page**: `/login` - User login with JWT token storage
- **Register Page**: `/register` - User registration
- **Protected Routes**: Routes requiring authentication redirect to login
- **Token Management**: Automatic token refresh, logout functionality

### Token Handling
- Tokens stored in `localStorage`
- Automatic token attachment to API requests via axios interceptor
- Token refresh on expiration
- Logout clears tokens and redirects to login

## Security Features

1. **Password Security**: Django's built-in password hashing (PBKDF2)
2. **Token Expiration**: Configurable token lifetimes
3. **HTTPS Ready**: Works with HTTPS (tokens in Authorization header)
4. **CORS Support**: Configured for cross-origin requests
5. **Session Fallback**: Session authentication also supported

## Default Admin Account

- **Username**: `admin`
- **Password**: `admin`
- **Type**: Superuser with staff privileges
- **Creation**: Run `python manage.py create_admin`

## API Usage Example

```bash
# 1. Register/Login to get token
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'

# Response: {"access": "...", "refresh": "..."}

# 2. Use token for authenticated requests
curl -X GET http://localhost:8000/api/passengers/ \
  -H "Authorization: Bearer <access_token>"

# 3. Refresh token when expired
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "<refresh_token>"}'
```
