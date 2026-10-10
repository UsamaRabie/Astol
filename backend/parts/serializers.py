from rest_framework import serializers
from .models import PartCatalog, VehiclePart


class PartCatalogSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    usage_count = serializers.IntegerField(source='vehicle_installations.count', read_only=True)

    class Meta:
        model = PartCatalog
        fields = [
            'id', 'name', 'category', 'category_display', 'default_interval_km',
            'default_interval_days', 'unit', 'description', 'usage_count', 'created_at'
        ]


class VehiclePartSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_category = serializers.CharField(source='part.get_category_display', read_only=True)
    vehicle_fleet = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    status_display = serializers.CharField(source='get_current_status_display', read_only=True)
    remaining_km = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = VehiclePart
        fields = [
            'id', 'vehicle', 'vehicle_fleet', 'vehicle_plate', 'part', 'part_name',
            'part_category', 'part_number', 'brand', 'installation_date',
            'installation_odometer', 'interval_km', 'interval_days',
            'next_replacement_km', 'next_replacement_date', 'current_status',
            'status_display', 'remaining_km', 'remaining_days', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'current_status', 'created_at']

    def get_remaining_km(self, obj):
        return obj.next_replacement_km - obj.vehicle.current_odometer

    def get_remaining_days(self, obj):
        from django.utils import timezone
        return (obj.next_replacement_date - timezone.now().date()).days


class VehiclePartCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehiclePart
        fields = [
            'id', 'vehicle', 'part', 'part_number', 'brand', 'installation_date',
            'installation_odometer', 'interval_km', 'interval_days', 'notes'
        ]

    def create(self, validated_data):
        part = validated_data['part']
        if not validated_data.get('interval_km'):
            validated_data['interval_km'] = part.default_interval_km
        if not validated_data.get('interval_days'):
            validated_data['interval_days'] = part.default_interval_days
        return super().create(validated_data)


class ReplacePartSerializer(serializers.Serializer):
    new_odometer = serializers.IntegerField(required=True, min_value=0)
    replacement_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
