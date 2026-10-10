from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, VehicleTypeViewSet, OdometerReadingViewSet, VehicleDocumentViewSet

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'vehicle-types', VehicleTypeViewSet, basename='vehicle_type')
router.register(r'odometer-readings', OdometerReadingViewSet, basename='odometer_reading')
router.register(r'vehicle-documents', VehicleDocumentViewSet, basename='vehicle_document')

urlpatterns = [
    path('', include(router.urls)),
]
