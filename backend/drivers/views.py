from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from accounts.permissions import IsOperatorOrAdmin
from audit.utils import log_action
from audit.models import AuditLog
from vehicles.models import Vehicle
from .models import Driver, DriverAssignment
from .serializers import DriverSerializer, DriverAssignmentSerializer, AssignDriverSerializer


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.filter(is_deleted=False)
    serializer_class = DriverSerializer
    permission_classes = [IsOperatorOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if status_param:
            qs = qs.filter(status=status_param)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(national_id__icontains=search) |
                Q(phone__icontains=search) |
                Q(license_number__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        driver = serializer.save()
        log_action(
            action=AuditLog.Action.CREATE,
            module='السائقون',
            object_repr=f"إضافة سائق: {driver}",
            object_id=str(driver.id),
            request=self.request
        )

    def perform_update(self, serializer):
        driver = serializer.save()
        log_action(
            action=AuditLog.Action.UPDATE,
            module='السائقون',
            object_repr=f"تعديل بيانات سائق: {driver}",
            object_id=str(driver.id),
            request=self.request
        )

    def perform_destroy(self, instance):
        instance.soft_delete()
        log_action(
            action=AuditLog.Action.DELETE,
            module='السائقون',
            object_repr=f"حذف سائق: {instance}",
            object_id=str(instance.id),
            request=self.request
        )

    @action(detail=True, methods=['post'], url_path='assign-vehicle')
    def assign_vehicle(self, request, pk=None):
        driver = self.get_object()
        serializer = AssignDriverSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vehicle_id = serializer.validated_data['vehicle_id']
        start_date = serializer.validated_data.get('start_date') or timezone.now().date()
        notes = serializer.validated_data.get('notes', '')

        try:
            vehicle = Vehicle.objects.get(id=vehicle_id, is_deleted=False)
        except Vehicle.DoesNotExist:
            return Response({'detail': 'المركبة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        # Deactivate current assignments for this driver and this vehicle
        today = timezone.now().date()
        DriverAssignment.objects.filter(driver=driver, is_active=True).update(is_active=False, end_date=today)
        DriverAssignment.objects.filter(vehicle=vehicle, is_active=True).update(is_active=False, end_date=today)

        # Create new assignment
        new_assignment = DriverAssignment.objects.create(
            driver=driver,
            vehicle=vehicle,
            start_date=start_date,
            is_active=True,
            notes=notes,
            assigned_by=request.user
        )

        # Update vehicle assigned driver
        vehicle.assigned_driver = driver
        vehicle.save(update_fields=['assigned_driver', 'updated_at'])

        log_action(
            action=AuditLog.Action.STATUS_CHANGE,
            module='السائقون',
            object_repr=f"إسناد سائق: {driver.full_name} إلى مركبة {vehicle.plate_number}",
            object_id=str(driver.id),
            details={'vehicle_id': vehicle.id, 'plate_number': vehicle.plate_number},
            request=request
        )

        return Response({
            'success': True,
            'message': f"تم إسناد المركبة {vehicle.plate_number} للسائق {driver.full_name} بنجاح",
            'assignment': DriverAssignmentSerializer(new_assignment).data
        })

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        driver = self.get_object()
        assignments = driver.assignments.all()
        return Response(DriverAssignmentSerializer(assignments, many=True).data)


class DriverAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DriverAssignment.objects.all().select_related('driver', 'vehicle', 'assigned_by')
    serializer_class = DriverAssignmentSerializer
    permission_classes = [IsOperatorOrAdmin]
