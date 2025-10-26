from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import AircraftViewSet, FlightViewSet, StaffViewSet, PassengerViewSet, TicketViewSet

router = DefaultRouter()
router.register(r'aircraft', AircraftViewSet, basename='aircraft')
router.register(r'flights', FlightViewSet, basename='flight')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'passengers', PassengerViewSet, basename='passenger')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    path('', include(router.urls)),
]
