from rest_framework import serializers
from core.serializers import CleanNullFieldsMixin
from .models import WorkPermit
from vehicles.serializers import VehicleListSerializer
from drivers.serializers import DriverSerializer


class WorkPermitListSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    fleet_number = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    driver_phone = serializers.CharField(source='driver.phone', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')

    class Meta:
        model = WorkPermit
        fields = [
            'id', 'permit_number', 'vehicle', 'vehicle_plate', 'fleet_number',
            'driver', 'driver_name', 'driver_phone', 'requesting_department',
            'departure_location', 'destination', 'purpose', 'departure_date', 'departure_time',
            'return_date', 'return_time', 'starting_odometer', 'ending_odometer',
            'distance_traveled', 'status', 'status_display', 'created_by_name',
            'created_at'
        ]


class WorkPermitDetailSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    fleet_number = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True)
    vehicle_details = VehicleListSerializer(source='vehicle', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True)
    driver_details = DriverSerializer(source='driver', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default='')

    class Meta:
        model = WorkPermit
        fields = [
            'id', 'permit_number', 'vehicle', 'vehicle_plate', 'fleet_number',
            'vehicle_details', 'driver', 'driver_name', 'driver_details',
            'requesting_department', 'departure_location', 'destination', 'purpose', 'description',
            'departure_date', 'departure_time', 'return_date', 'return_time',
            'starting_odometer', 'ending_odometer', 'distance_traveled',
            'status', 'status_display', 'created_by', 'created_by_name',
            'approved_by', 'approved_by_name', 'notes', 'created_at', 'updated_at'
        ]


class WorkPermitCreateUpdateSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    permit_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    departure_location = serializers.CharField(required=False, allow_blank=True, default="المقر الرئيسي")

    class Meta:
        model = WorkPermit
        fields = [
            'id', 'permit_number', 'vehicle', 'driver', 'requesting_department',
            'departure_location', 'destination', 'purpose', 'description', 'departure_date', 'status', 'notes'
        ]

    def create(self, validated_data):
        if not validated_data.get('permit_number'):
            validated_data['permit_number'] = WorkPermit.generate_permit_number()
        user = self.context['request'].user if 'request' in self.context else None
        validated_data['created_by'] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get('permit_number'):
            validated_data.pop('permit_number', None)
        return super().update(instance, validated_data)


class StartTripSerializer(CleanNullFieldsMixin, serializers.Serializer):
    starting_odometer = serializers.IntegerField(required=False, allow_null=True)
    departure_time = serializers.TimeField(required=False, allow_null=True)


class CompleteTripSerializer(CleanNullFieldsMixin, serializers.Serializer):
    ending_odometer = serializers.IntegerField(required=True)
    return_time = serializers.TimeField(required=False, allow_null=True)
    return_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")


class CancelPermitSerializer(CleanNullFieldsMixin, serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
