from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import VehicleAlert
from .serializers import VehicleAlertSerializer


class VehicleAlertViewSet(viewsets.ModelViewSet):
    queryset = VehicleAlert.objects.all().select_related('vehicle').order_by('-created_at')
    serializer_class = VehicleAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        severity = self.request.query_params.get('severity')
        is_read = self.request.query_params.get('is_read')
        is_resolved = self.request.query_params.get('is_resolved')
        vehicle_id = self.request.query_params.get('vehicle')

        if severity:
            qs = qs.filter(severity=severity)
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')
        if is_resolved is not None:
            qs = qs.filter(is_resolved=is_resolved.lower() == 'true')
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return qs

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=['is_read', 'updated_at'])
        return Response({'success': True, 'message': 'تم تعليم التنبيه كمقروء'})

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve_alert(self, request, pk=None):
        alert = self.get_object()
        alert.resolve()
        return Response({'success': True, 'message': 'تم تعليم التنبيه كمعالج وتم حل المشكلة'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        VehicleAlert.objects.filter(is_read=False).update(is_read=True)
        return Response({'success': True, 'message': 'تم تعليم جميع التنبيهات كمقروءة'})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = VehicleAlert.objects.filter(is_read=False).count()
        critical_count = VehicleAlert.objects.filter(is_read=False, severity=VehicleAlert.Severity.CRITICAL).count()
        return Response({
            'unread_count': count,
            'critical_count': critical_count
        })
