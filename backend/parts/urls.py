from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartCatalogViewSet, VehiclePartViewSet, PartMovementViewSet

router = DefaultRouter()
router.register(r'part-catalog', PartCatalogViewSet, basename='part_catalog')
router.register(r'vehicle-parts', VehiclePartViewSet, basename='vehicle_part')
router.register(r'part-movements', PartMovementViewSet, basename='part_movement')

urlpatterns = [
    path('', include(router.urls)),
]
