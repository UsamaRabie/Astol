from rest_framework import serializers
from .models import VehicleAlert


class VehicleAlertSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True, default='')
    fleet_number = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True, default='')
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)

    class Meta:
        model = VehicleAlert
        fields = [
            'id', 'vehicle', 'vehicle_plate', 'fleet_number', 'alert_type',
            'alert_type_display', 'severity', 'severity_display', 'title',
            'message', 'is_read', 'is_resolved', 'resolved_at', 'created_at'
        ]
