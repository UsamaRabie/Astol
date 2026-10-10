from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from accounts.permissions import IsOperatorOrAdmin
from audit.utils import log_action
from audit.models import AuditLog
from .models import WorkPermit
from .serializers import (
    WorkPermitListSerializer, WorkPermitDetailSerializer,
    WorkPermitCreateUpdateSerializer, StartTripSerializer,
    CompleteTripSerializer, CancelPermitSerializer
)


class WorkPermitViewSet(viewsets.ModelViewSet):
    queryset = WorkPermit.objects.filter(is_deleted=False).select_related('vehicle', 'driver', 'created_by', 'approved_by')
    permission_classes = [IsOperatorOrAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkPermitListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return WorkPermitCreateUpdateSerializer
        return WorkPermitDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        vehicle_id = self.request.query_params.get('vehicle')
        driver_id = self.request.query_params.get('driver')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')

        if status_param:
            qs = qs.filter(status=status_param)
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        if driver_id:
            qs = qs.filter(driver_id=driver_id)
        if date_from:
            qs = qs.filter(departure_date__gte=date_from)
        if date_to:
            qs = qs.filter(departure_date__lte=date_to)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(permit_number__icontains=search) |
                Q(destination__icontains=search) |
                Q(purpose__icontains=search) |
                Q(vehicle__plate_number__icontains=search) |
                Q(vehicle__internal_fleet_number__icontains=search) |
                Q(driver__full_name__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        permit = serializer.save()
        log_action(
            action=AuditLog.Action.CREATE,
            module='أذونات التشغيل',
            object_repr=f"إنشاء إذن تشغيل: {permit.permit_number}",
            object_id=str(permit.id),
            details={'vehicle': permit.vehicle.plate_number, 'driver': permit.driver.full_name},
            request=self.request
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.status == WorkPermit.Status.COMPLETED and not self.request.user.is_admin:
            raise ValidationError("لا يمكن تعديل إذن تشغيل مكتمل إلا من خلال مدير النظام")
        permit = serializer.save()
        log_action(
            action=AuditLog.Action.UPDATE,
            module='أذونات التشغيل',
            object_repr=f"تعديل إذن تشغيل: {permit.permit_number}",
            object_id=str(permit.id),
            request=self.request
        )

    def perform_destroy(self, instance):
        if instance.status == WorkPermit.Status.IN_PROGRESS:
            raise ValidationError("لا يمكن حذف إذن تشغيل لرحلة قيد التنفيذ حالياً")
        instance.soft_delete()
        log_action(
            action=AuditLog.Action.DELETE,
            module='أذونات التشغيل',
            object_repr=f"حذف إذن تشغيل: {instance.permit_number}",
            object_id=str(instance.id),
            request=self.request
        )

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_permit(self, request, pk=None):
        permit = self.get_object()
        try:
            permit.approve(user=request.user)
            log_action(
                action=AuditLog.Action.STATUS_CHANGE,
                module='أذونات التشغيل',
                object_repr=f"اعتماد إذن تشغيل: {permit.permit_number}",
                object_id=str(permit.id),
                request=request
            )
            return Response({'success': True, 'message': 'تم اعتماد إذن التشغيل بنجاح'})
        except ValidationError as e:
            return Response({'detail': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='start-trip')
    def start_trip(self, request, pk=None):
        permit = self.get_object()
        serializer = StartTripSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        starting_odometer = serializer.validated_data.get('starting_odometer')
        departure_time = serializer.validated_data.get('departure_time')

        try:
            permit.start_trip(
                departure_time=departure_time,
                starting_odometer=starting_odometer,
                user=request.user
            )
            log_action(
                action=AuditLog.Action.TRIP_START,
                module='أذونات التشغيل',
                object_repr=f"انطلاق رحلة: {permit.permit_number}",
                object_id=str(permit.id),
                details={'starting_odometer': permit.starting_odometer, 'vehicle': permit.vehicle.plate_number},
                request=request
            )
            return Response({
                'success': True,
                'message': f"تم بدء الرحلة بنجاح عند العداد {permit.starting_odometer:,} كم",
                'status': permit.status,
                'starting_odometer': permit.starting_odometer
            })
        except ValidationError as e:
            return Response({'detail': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='complete-trip')
    def complete_trip(self, request, pk=None):
        permit = self.get_object()
        serializer = CompleteTripSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ending_odometer = serializer.validated_data['ending_odometer']
        return_time = serializer.validated_data.get('return_time')
        return_date = serializer.validated_data.get('return_date')
        notes = serializer.validated_data.get('notes', '')

        try:
            permit.complete_trip(
                ending_odometer=ending_odometer,
                return_time=return_time,
                return_date=return_date,
                notes=notes,
                user=request.user
            )
            log_action(
                action=AuditLog.Action.TRIP_COMPLETE,
                module='أذونات التشغيل',
                object_repr=f"إتمام رحلة: {permit.permit_number}",
                object_id=str(permit.id),
                details={
                    'starting_odometer': permit.starting_odometer,
                    'ending_odometer': permit.ending_odometer,
                    'distance_traveled': permit.distance_traveled,
                    'vehicle': permit.vehicle.plate_number
                },
                request=request
            )
            return Response({
                'success': True,
                'message': f"تم إنهاء الرحلة بنجاح. المسافة المقطوعة: {permit.distance_traveled:,} كم",
                'distance_traveled': permit.distance_traveled,
                'ending_odometer': permit.ending_odometer,
                'vehicle_odometer': permit.vehicle.current_odometer
            })
        except ValidationError as e:
            return Response({'detail': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_permit(self, request, pk=None):
        permit = self.get_object()
        serializer = CancelPermitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        notes = serializer.validated_data.get('notes', '')
        try:
            permit.cancel(notes=notes)
            log_action(
                action=AuditLog.Action.TRIP_CANCEL,
                module='أذونات التشغيل',
                object_repr=f"إلغاء إذن تشغيل: {permit.permit_number}",
                object_id=str(permit.id),
                details={'notes': notes},
                request=request
            )
            return Response({'success': True, 'message': 'تم إلغاء إذن التشغيل بنجاح'})
        except ValidationError as e:
            return Response({'detail': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
