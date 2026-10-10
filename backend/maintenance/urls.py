from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceTypeViewSet, MaintenanceRecordViewSet

router = DefaultRouter()
router.register(r'maintenance-types', MaintenanceTypeViewSet, basename='maintenance_type')
router.register(r'maintenance-records', MaintenanceRecordViewSet, basename='maintenance_record')

urlpatterns = [
    path('', include(router.urls)),
]
