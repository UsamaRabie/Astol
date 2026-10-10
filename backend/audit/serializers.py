from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='النظام')
    user_role = serializers.CharField(source='user.get_role_display', read_only=True, default='')
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'user_role', 'action', 'action_display',
            'module', 'object_repr', 'object_id', 'details', 'ip_address', 'timestamp'
        ]
