from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from accounts.permissions import IsOperatorOrAdmin, IsAdminOrReadOnly, IsAdminUserRole
from audit.utils import log_action
from audit.models import AuditLog
from maintenance.services import MaintenanceRuleEngine
from .models import (
    Vehicle, VehicleType, OdometerReading, VehicleDocument,
    VehicleModel, VehicleColor, Department
)
from .serializers import (
    VehicleListSerializer, VehicleDetailSerializer,
    VehicleCreateUpdateSerializer, VehicleTypeSerializer,
    OdometerReadingSerializer, VehicleDocumentSerializer,
    UpdateOdometerSerializer, VehicleModelSerializer,
    VehicleColorSerializer, DepartmentSerializer
)


class VehicleTypeViewSet(viewsets.ModelViewSet):
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer
    permission_classes = [IsAdminOrReadOnly]


class VehicleModelViewSet(viewsets.ModelViewSet):
    queryset = VehicleModel.objects.all()
    serializer_class = VehicleModelSerializer
    permission_classes = [IsAdminOrReadOnly]


class VehicleColorViewSet(viewsets.ModelViewSet):
    queryset = VehicleColor.objects.all()
    serializer_class = VehicleColorSerializer
    permission_classes = [IsAdminOrReadOnly]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.filter(is_deleted=False).select_related('vehicle_type', 'assigned_driver')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserRole()]
        return [IsOperatorOrAdmin()]

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return VehicleCreateUpdateSerializer
        return VehicleDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        vehicle_type = self.request.query_params.get('vehicle_type')
        department = self.request.query_params.get('department')
        driver = self.request.query_params.get('driver')
        search = self.request.query_params.get('search')

        if status_param:
            qs = qs.filter(status=status_param)
        if vehicle_type:
            qs = qs.filter(vehicle_type_id=vehicle_type)
        if department:
            qs = qs.filter(department__icontains=department)
        if driver:
            qs = qs.filter(assigned_driver_id=driver)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(plate_number__icontains=search) |
                Q(internal_fleet_number__icontains=search) |
                Q(vin__icontains=search) |
                Q(make__icontains=search) |
                Q(model__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        vehicle = serializer.save()
        log_action(
            action=AuditLog.Action.CREATE,
            module='المركبات',
            object_repr=f"إضافة مركبة: {vehicle}",
            object_id=str(vehicle.id),
            details={'internal_fleet_number': vehicle.internal_fleet_number, 'plate_number': vehicle.plate_number},
            request=self.request
        )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        vehicle = serializer.save()
        if old_status != vehicle.status:
            log_action(
                action=AuditLog.Action.STATUS_CHANGE,
                module='المركبات',
                object_repr=f"تغيير حالة المركبة: {vehicle}",
                object_id=str(vehicle.id),
                details={'old_status': old_status, 'new_status': vehicle.status},
                request=self.request
            )
        else:
            log_action(
                action=AuditLog.Action.UPDATE,
                module='المركبات',
                object_repr=f"تعديل بيانات مركبة: {vehicle}",
                object_id=str(vehicle.id),
                request=self.request
            )

    def perform_destroy(self, instance):
        instance.soft_delete()
        log_action(
            action=AuditLog.Action.DELETE,
            module='المركبات',
            object_repr=f"حذف مركبة: {instance}",
            object_id=str(instance.id),
            request=self.request
        )

    @action(detail=False, methods=['get'], url_path='next-fleet-number')
    def next_fleet_number(self, request):
        next_num = Vehicle.generate_next_fleet_number()
        return Response({'next_fleet_number': next_num})

    @action(detail=True, methods=['get', 'post'], url_path='odometer')
    def odometer(self, request, pk=None):
        vehicle = self.get_object()

        if request.method == 'GET':
            readings = vehicle.odometer_readings.all()
            serializer = OdometerReadingSerializer(readings, many=True)
            return Response(serializer.data)

        # POST: update odometer reading
        serializer = UpdateOdometerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_reading = serializer.validated_data['new_reading']
        source = serializer.validated_data.get('source', OdometerReading.Source.MANUAL)
        notes = serializer.validated_data.get('notes', '')
        date_time = serializer.validated_data.get('date_time')

        try:
            reading_entry = vehicle.update_odometer(
                new_reading=new_reading,
                source=source,
                user=request.user,
                notes=notes,
                date_time=date_time
            )
            # Re-evaluate maintenance rules
            MaintenanceRuleEngine.evaluate_vehicle(vehicle)

            log_action(
                action=AuditLog.Action.ODOMETER_UPDATE,
                module='المركبات',
                object_repr=f"تحديث عداد: {vehicle}",
                object_id=str(vehicle.id),
                details={'new_reading': new_reading, 'source': source, 'notes': notes},
                request=request
            )

            return Response({
                'success': True,
                'message': f"تم تحديث قراءة العداد بنجاح إلى {new_reading:,} كم",
                'current_odometer': vehicle.current_odometer,
                'reading': OdometerReadingSerializer(reading_entry).data
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'detail': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='parts')
    def parts(self, request, pk=None):
        vehicle = self.get_object()
        from parts.models import PartCatalog, VehiclePart
        existing_cat_ids = set(vehicle.parts.values_list('part_id', flat=True))
        all_cats = PartCatalog.objects.all()
        for cat in all_cats:
            if cat.id not in existing_cat_ids:
                VehiclePart.objects.create(
                    vehicle=vehicle,
                    part=cat,
                    part_number=f"PN-{vehicle.internal_fleet_number}-{cat.id}",
                    installation_odometer=vehicle.current_odometer,
                    interval_km=cat.default_interval_km,
                    interval_days=cat.default_interval_days
                )
        from parts.serializers import VehiclePartSerializer
        parts = vehicle.parts.select_related('part').all()
        return Response(VehiclePartSerializer(parts, many=True).data)

    @action(detail=True, methods=['get'], url_path='maintenance')
    def maintenance(self, request, pk=None):
        vehicle = self.get_object()
        from maintenance.serializers import MaintenanceRecordSerializer
        records = vehicle.maintenance_records.filter(is_deleted=False).select_related('maintenance_type')
        return Response(MaintenanceRecordSerializer(records, many=True).data)

    @action(detail=True, methods=['get'], url_path='fuel')
    def fuel(self, request, pk=None):
        vehicle = self.get_object()
        from fuel.serializers import FuelRecordSerializer
        records = vehicle.fuel_records.filter(is_deleted=False).select_related('driver')
        return Response(FuelRecordSerializer(records, many=True).data)

    @action(detail=True, methods=['get'], url_path='documents')
    def documents(self, request, pk=None):
        vehicle = self.get_object()
        docs = vehicle.documents.all()
        return Response(VehicleDocumentSerializer(docs, many=True).data)

    @action(detail=True, methods=['post'], url_path='evaluate')
    def evaluate(self, request, pk=None):
        vehicle = self.get_object()
        results = MaintenanceRuleEngine.evaluate_vehicle(vehicle)
        return Response({
            'success': True,
            'vehicle': vehicle.internal_fleet_number,
            'evaluations': results
        })


class OdometerReadingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OdometerReading.objects.all().select_related('vehicle', 'user')
    serializer_class = OdometerReadingSerializer
    permission_classes = [IsOperatorOrAdmin]


class VehicleDocumentViewSet(viewsets.ModelViewSet):
    queryset = VehicleDocument.objects.all().select_related('vehicle')
    serializer_class = VehicleDocumentSerializer
    permission_classes = [IsOperatorOrAdmin]
