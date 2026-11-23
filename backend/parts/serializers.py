from rest_framework import serializers
from core.serializers import CleanNullFieldsMixin
from .models import PartCatalog, VehiclePart, PartMovement


class PartCatalogSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    usage_count = serializers.IntegerField(source='vehicle_installations.count', read_only=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    unit = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="قطعة")

    class Meta:
        model = PartCatalog
        fields = [
            'id', 'name', 'category', 'category_display', 'default_interval_km',
            'warning_threshold_km', 'default_interval_days', 'unit', 'description',
            'usage_count', 'created_at'
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


class VehiclePartCreateSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    part_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    brand = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")

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
        vp = super().create(validated_data)

        user = self.context['request'].user if 'request' in self.context else None
        PartMovement.objects.create(
            vehicle=vp.vehicle,
            part=vp.part,
            vehicle_part=vp,
            movement_type=PartMovement.MovementType.INITIAL,
            movement_date=vp.installation_date,
            odometer=vp.installation_odometer,
            previous_odometer=0,
            distance_served=0,
            part_number=vp.part_number,
            brand=vp.brand,
            performed_by=user,
            notes=vp.notes or "التركيب الأولي للقطعة على المركبة"
        )
        return vp


class ReplacePartSerializer(CleanNullFieldsMixin, serializers.Serializer):
    new_odometer = serializers.IntegerField(required=True, min_value=0)
    replacement_date = serializers.DateField(required=False, allow_null=True)
    cost = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0.00)
    service_provider = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")


class PartMovementSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    fleet_number = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True)
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_category = serializers.CharField(source='part.get_category_display', read_only=True)
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True, default='')

    class Meta:
        model = PartMovement
        fields = [
            'id', 'vehicle', 'vehicle_plate', 'fleet_number', 'part', 'part_name',
            'part_category', 'vehicle_part', 'movement_type', 'movement_type_display',
            'movement_date', 'odometer', 'previous_odometer', 'distance_served',
            'cost', 'part_number', 'brand', 'service_provider', 'maintenance_record',
            'performed_by_name', 'notes', 'created_at'
        ]
