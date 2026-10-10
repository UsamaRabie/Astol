from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsOperatorOrAdmin, IsAdminOrReadOnly
from audit.utils import log_action
from audit.models import AuditLog
from .models import MaintenanceType, MaintenanceRecord
from .serializers import (
    MaintenanceTypeSerializer, MaintenanceRecordSerializer,
    MaintenanceRecordCreateUpdateSerializer
)
from .services import MaintenanceRuleEngine


class MaintenanceTypeViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceType.objects.all()
    serializer_class = MaintenanceTypeSerializer
    permission_classes = [IsAdminOrReadOnly]


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.filter(is_deleted=False).select_related('vehicle', 'maintenance_type', 'created_by').prefetch_related('parts_replaced__part')
    permission_classes = [IsOperatorOrAdmin]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MaintenanceRecordCreateUpdateSerializer
        return MaintenanceRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle')
        type_id = self.request.query_params.get('maintenance_type')
        status_param = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')

        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        if type_id:
            qs = qs.filter(maintenance_type_id=type_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if date_from:
            qs = qs.filter(maintenance_date__gte=date_from)
        if date_to:
            qs = qs.filter(maintenance_date__lte=date_to)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(description__icontains=search) |
                Q(service_provider__icontains=search) |
                Q(technician__icontains=search) |
                Q(vehicle__plate_number__icontains=search) |
                Q(vehicle__internal_fleet_number__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        record = serializer.save()
        log_action(
            action=AuditLog.Action.MAINTENANCE_RECORD,
            module='الصيانة',
            object_repr=f"تسجيل صيانة: {record}",
            object_id=str(record.id),
            details={'cost': str(record.cost), 'vehicle': record.vehicle.plate_number},
            request=self.request
        )

    def perform_update(self, serializer):
        record = serializer.save()
        MaintenanceRuleEngine.evaluate_vehicle(record.vehicle)
        log_action(
            action=AuditLog.Action.UPDATE,
            module='الصيانة',
            object_repr=f"تعديل سجل صيانة: {record}",
            object_id=str(record.id),
            details={'cost': str(record.cost), 'vehicle': record.vehicle.plate_number},
            request=self.request
        )

    def perform_destroy(self, instance):
        vehicle = instance.vehicle
        instance.soft_delete()
        MaintenanceRuleEngine.evaluate_vehicle(vehicle)
        log_action(
            action=AuditLog.Action.DELETE,
            module='الصيانة',
            object_repr=f"حذف سجل صيانة: {instance}",
            object_id=str(instance.id),
            request=self.request
        )

    @action(detail=False, methods=['post'], url_path='evaluate-fleet')
    def evaluate_fleet(self, request):
        results = MaintenanceRuleEngine.evaluate_fleet()
        return Response({
            'success': True,
            'message': 'تم فحص أسطول المركبات بالكامل وتحديث حالات الصيانة والتنبيهات',
            'vehicles_evaluated': len(results)
        })
