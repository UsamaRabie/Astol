from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VehicleViewSet, VehicleTypeViewSet, OdometerReadingViewSet,
    VehicleDocumentViewSet, VehicleModelViewSet, VehicleColorViewSet,
    DepartmentViewSet
)

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'vehicle-types', VehicleTypeViewSet, basename='vehicle_type')
router.register(r'vehicle-models', VehicleModelViewSet, basename='vehicle_model')
router.register(r'vehicle-colors', VehicleColorViewSet, basename='vehicle_color')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'odometer-readings', OdometerReadingViewSet, basename='odometer_reading')
router.register(r'vehicle-documents', VehicleDocumentViewSet, basename='vehicle_document')

urlpatterns = [
    path('', include(router.urls)),
]
