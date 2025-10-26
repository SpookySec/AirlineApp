from django.contrib import admin
from .models import Staff, Aircraft, Flight, FlightStaff, Passenger, FlightTicket

admin.site.register([Staff, Aircraft, Flight, FlightStaff, Passenger, FlightTicket])
