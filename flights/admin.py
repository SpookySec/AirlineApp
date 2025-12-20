from django.contrib import admin
from .models import (
	Airport,
	PlaneType,
	MenuItem,
	Flight,
	Pilot,
	CabinCrew,
	Passenger,
	FlightTicket,
	Roster,
	RosterCrewAssignment,
	RosterPassengerAssignment,
)


admin.site.register([
	Airport,
	PlaneType,
	MenuItem,
	Flight,
	Pilot,
	CabinCrew,
	Passenger,
	FlightTicket,
	Roster,
	RosterCrewAssignment,
	RosterPassengerAssignment,
])
