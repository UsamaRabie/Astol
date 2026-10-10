from rest_framework import viewsets
from accounts.permissions import IsAdminUserRole
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin-only view for audit logs with rich filters.
    """
    queryset = AuditLog.objects.all().select_related('user').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        qs = super().get_queryset()
        action = self.request.query_params.get('action')
        module = self.request.query_params.get('module')
        user_id = self.request.query_params.get('user_id')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')

        if action:
            qs = qs.filter(action=action)
        if module:
            qs = qs.filter(module=module)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(object_repr__icontains=search) |
                Q(object_id__icontains=search) |
                Q(user__full_name__icontains=search) |
                Q(user__username__icontains=search)
            )
        return qs
