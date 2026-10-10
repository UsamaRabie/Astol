from rest_framework import serializers
from .models import Driver, DriverAssignment
from vehicles.models import Vehicle


class DriverAssignmentSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    fleet_number = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True, default='')

    class Meta:
        model = DriverAssignment
        fields = [
            'id', 'driver', 'driver_name', 'vehicle', 'vehicle_plate',
            'fleet_number', 'start_date', 'end_date', 'is_active',
            'notes', 'assigned_by', 'assigned_by_name', 'created_at'
        ]


class DriverSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_vehicle_plate = serializers.SerializerMethodField()
    current_vehicle_fleet = serializers.SerializerMethodField()
    current_vehicle_id = serializers.SerializerMethodField()

    class Meta:
        model = Driver
        fields = [
            'id', 'full_name', 'national_id', 'phone', 'license_number',
            'license_expiry_date', 'status', 'status_display',
            'current_vehicle_id', 'current_vehicle_plate', 'current_vehicle_fleet',
            'notes', 'created_at', 'updated_at'
        ]

    def get_current_vehicle_id(self, obj):
        v = obj.current_vehicle
        return v.id if v else None

    def get_current_vehicle_plate(self, obj):
        v = obj.current_vehicle
        return v.plate_number if v else None

    def get_current_vehicle_fleet(self, obj):
        v = obj.current_vehicle
        return v.internal_fleet_number if v else None


class AssignDriverSerializer(serializers.Serializer):
    vehicle_id = serializers.IntegerField(required=True)
    start_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
