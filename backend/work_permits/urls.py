from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkPermitViewSet

router = DefaultRouter()
router.register(r'work-permits', WorkPermitViewSet, basename='work_permit')

urlpatterns = [
    path('', include(router.urls)),
]
