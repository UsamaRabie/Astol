from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsOperatorOrAdmin, IsAdminOrReadOnly
from audit.utils import log_action
from audit.models import AuditLog
from maintenance.services import MaintenanceRuleEngine
from .models import PartCatalog, VehiclePart
from .serializers import (
    PartCatalogSerializer, VehiclePartSerializer,
    VehiclePartCreateSerializer, ReplacePartSerializer
)


class PartCatalogViewSet(viewsets.ModelViewSet):
    queryset = PartCatalog.objects.all()
    serializer_class = PartCatalogSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class VehiclePartViewSet(viewsets.ModelViewSet):
    queryset = VehiclePart.objects.all().select_related('vehicle', 'part')
    permission_classes = [IsOperatorOrAdmin]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return VehiclePartCreateSerializer
        return VehiclePartSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle')
        part_id = self.request.query_params.get('part')
        status_param = self.request.query_params.get('status')

        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        if part_id:
            qs = qs.filter(part_id=part_id)
        if status_param:
            qs = qs.filter(current_status=status_param)
        return qs

    def perform_create(self, serializer):
        vp = serializer.save()
        MaintenanceRuleEngine.evaluate_vehicle(vp.vehicle)
        log_action(
            action=AuditLog.Action.CREATE,
            module='قطع الغيار',
            object_repr=f"إضافة قطعة للمركبة: {vp}",
            object_id=str(vp.id),
            request=self.request
        )

    def perform_destroy(self, instance):
        vehicle = instance.vehicle
        instance_id = instance.id
        repr_str = str(instance)
        instance.delete()
        MaintenanceRuleEngine.evaluate_vehicle(vehicle)
        log_action(
            action=AuditLog.Action.DELETE,
            module='قطع الغيار',
            object_repr=f"حذف قطعة مركبة: {repr_str}",
            object_id=str(instance_id),
            request=self.request
        )

    @action(detail=True, methods=['post'], url_path='replace')
    def replace_part(self, request, pk=None):
        vp = self.get_object()
        serializer = ReplacePartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_odometer = serializer.validated_data['new_odometer']
        replacement_date = serializer.validated_data.get('replacement_date')
        notes = serializer.validated_data.get('notes', '')

        vp.record_replacement(new_odometer=new_odometer, replacement_date=replacement_date, notes=notes)
        MaintenanceRuleEngine.evaluate_vehicle(vp.vehicle)

        log_action(
            action=AuditLog.Action.PART_REPLACEMENT,
            module='قطع الغيار',
            object_repr=f"استبدال قطعة: {vp.part.name} للمركبة {vp.vehicle.plate_number}",
            object_id=str(vp.id),
            details={'new_odometer': new_odometer, 'replacement_date': str(replacement_date)},
            request=request
        )

        return Response({
            'success': True,
            'message': f"تم تسجيل استبدال {vp.part.name} بنجاح",
            'part': VehiclePartSerializer(vp).data
        })
