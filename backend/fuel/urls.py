from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FuelRecordViewSet, FuelTypeViewSet

router = DefaultRouter()
router.register(r'fuel-records', FuelRecordViewSet, basename='fuel_record')
router.register(r'fuel-types', FuelTypeViewSet, basename='fuel_type')

urlpatterns = [
    path('', include(router.urls)),
]
