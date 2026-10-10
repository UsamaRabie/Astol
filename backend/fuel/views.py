from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count
from accounts.permissions import IsOperatorOrAdmin
from audit.utils import log_action
from audit.models import AuditLog
from .models import FuelRecord
from .serializers import FuelRecordSerializer, FuelRecordCreateUpdateSerializer


class FuelRecordViewSet(viewsets.ModelViewSet):
    queryset = FuelRecord.objects.filter(is_deleted=False).select_related('vehicle', 'driver', 'created_by')
    permission_classes = [IsOperatorOrAdmin]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FuelRecordCreateUpdateSerializer
        return FuelRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle')
        driver_id = self.request.query_params.get('driver')
        fuel_type = self.request.query_params.get('fuel_type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')

        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        if driver_id:
            qs = qs.filter(driver_id=driver_id)
        if fuel_type:
            qs = qs.filter(fuel_type=fuel_type)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(station__icontains=search) |
                Q(vehicle__plate_number__icontains=search) |
                Q(vehicle__internal_fleet_number__icontains=search) |
                Q(driver__full_name__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        record = serializer.save()
        log_action(
            action=AuditLog.Action.CREATE,
            module='الوقود',
            object_repr=f"تسجيل وقود: {record}",
            object_id=str(record.id),
            details={'cost': str(record.total_cost), 'quantity': str(record.quantity)},
            request=self.request
        )

    def perform_destroy(self, instance):
        instance.soft_delete()
        log_action(
            action=AuditLog.Action.DELETE,
            module='الوقود',
            object_repr=f"حذف سجل وقود: {instance}",
            object_id=str(instance.id),
            request=self.request
        )

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        qs = self.get_queryset()
        aggregates = qs.aggregate(
            total_cost=Sum('total_cost'),
            total_quantity=Sum('quantity'),
            total_records=Count('id'),
            avg_price=Avg('price_per_unit')
        )
        return Response({
            'total_cost': aggregates['total_cost'] or 0,
            'total_quantity': aggregates['total_quantity'] or 0,
            'total_records': aggregates['total_records'] or 0,
            'avg_price': round(aggregates['avg_price'] or 0, 2)
        })
