from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    AirportViewSet,
    MenuItemViewSet,
    PlaneTypeViewSet,
    FlightViewSet,
    PilotViewSet,
    CabinCrewViewSet,
    PassengerViewSet,
    TicketViewSet,
    RosterViewSet,
    whoami,
)

router = DefaultRouter()
router.register(r'airports', AirportViewSet, basename='airport')
router.register(r'menu-items', MenuItemViewSet, basename='menu-item')
router.register(r'plane-types', PlaneTypeViewSet, basename='plane-type')
router.register(r'flights', FlightViewSet, basename='flight')
router.register(r'pilots', PilotViewSet, basename='pilot')
router.register(r'cabin-crew', CabinCrewViewSet, basename='cabin-crew')
router.register(r'passengers', PassengerViewSet, basename='passenger')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'rosters', RosterViewSet, basename='roster')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/me/', whoami, name='whoami'),
]
