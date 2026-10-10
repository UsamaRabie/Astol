from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FuelRecordViewSet

router = DefaultRouter()
router.register(r'fuel-records', FuelRecordViewSet, basename='fuel_record')

urlpatterns = [
    path('', include(router.urls)),
]
