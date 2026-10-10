from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DriverViewSet, DriverAssignmentViewSet

router = DefaultRouter()
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'driver-assignments', DriverAssignmentViewSet, basename='driver_assignment')

urlpatterns = [
    path('', include(router.urls)),
]
