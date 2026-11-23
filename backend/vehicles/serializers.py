from rest_framework import serializers
from core.serializers import CleanNullFieldsMixin
from .models import (
    Vehicle, VehicleType, OdometerReading, VehicleDocument,
    VehicleModel, VehicleColor, Department
)
from drivers.models import Driver


class VehicleModelSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")

    class Meta:
        model = VehicleModel
        fields = ['id', 'name', 'make', 'description', 'created_at']


class VehicleColorSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")

    class Meta:
        model = VehicleColor
        fields = ['id', 'name', 'code', 'created_at']


class DepartmentSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at']


class VehicleTypeSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    vehicle_count = serializers.IntegerField(source='vehicles.count', read_only=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    icon = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="truck")

    class Meta:
        model = VehicleType
        fields = ['id', 'name', 'description', 'icon', 'vehicle_count', 'created_at']


class OdometerReadingSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='النظام')
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")

    class Meta:
        model = OdometerReading
        fields = [
            'id', 'vehicle', 'reading', 'date_time', 'source',
            'source_display', 'user', 'user_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class VehicleDocumentSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")

    class Meta:
        model = VehicleDocument
        fields = [
            'id', 'vehicle', 'doc_type', 'doc_type_display',
            'document_number', 'issue_date', 'expiry_date',
            'file', 'notes', 'is_expired', 'days_until_expiry', 'created_at'
        ]


class VehicleListSerializer(serializers.ModelSerializer):
    vehicle_type_name = serializers.CharField(source='vehicle_type.name', read_only=True)
    driver_name = serializers.CharField(source='assigned_driver.full_name', read_only=True, default='غير معين')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    fuel_type_display = serializers.CharField(source='get_fuel_type_display', read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'internal_fleet_number', 'plate_number', 'vehicle_type',
            'vehicle_type_name', 'make', 'model', 'year', 'color', 'vin',
            'current_odometer', 'fuel_type', 'fuel_type_display', 'status',
            'status_display', 'assigned_driver', 'driver_name', 'department',
            'registration_expiry_date', 'insurance_expiry_date',
            'periodic_inspection_expiry_date', 'created_at'
        ]


class VehicleDetailSerializer(serializers.ModelSerializer):
    vehicle_type_name = serializers.CharField(source='vehicle_type.name', read_only=True)
    driver_name = serializers.CharField(source='assigned_driver.full_name', read_only=True, default='غير معين')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    fuel_type_display = serializers.CharField(source='get_fuel_type_display', read_only=True)
    documents = VehicleDocumentSerializer(many=True, read_only=True)
    recent_readings = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'internal_fleet_number', 'plate_number', 'vehicle_type',
            'vehicle_type_name', 'make', 'model', 'year', 'color', 'vin',
            'engine_number', 'current_odometer', 'fuel_type', 'fuel_type_display',
            'status', 'status_display', 'assigned_driver', 'driver_name',
            'department', 'purchase_date', 'registration_expiry_date',
            'insurance_expiry_date', 'periodic_inspection_expiry_date',
            'notes', 'documents', 'recent_readings', 'created_at', 'updated_at'
        ]

    def get_recent_readings(self, obj):
        readings = obj.odometer_readings.all()[:5]
        return OdometerReadingSerializer(readings, many=True).data


class VehicleCreateUpdateSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    internal_fleet_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    fuel_type = serializers.CharField(required=False, default='ديزل', allow_null=True, allow_blank=True)
    vin = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    color = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    engine_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    purchase_date = serializers.DateField(required=False, allow_null=True)
    registration_expiry_date = serializers.DateField(required=False, allow_null=True)
    insurance_expiry_date = serializers.DateField(required=False, allow_null=True)
    periodic_inspection_expiry_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'internal_fleet_number', 'plate_number', 'vehicle_type',
            'make', 'model', 'year', 'color', 'vin', 'engine_number',
            'current_odometer', 'fuel_type', 'status', 'assigned_driver',
            'department', 'purchase_date', 'registration_expiry_date',
            'insurance_expiry_date', 'periodic_inspection_expiry_date', 'notes'
        ]

    def validate_fuel_type(self, value):
        if not value:
            return 'ديزل'
        mapping = {
            'GASOLINE_91': 'بنزين 91',
            'GASOLINE_95': 'بنزين 95',
            'DIESEL': 'ديزل',
            'ELECTRIC': 'كهربائي',
            'HYBRID': 'هجين',
        }
        return mapping.get(value, value)

    def create(self, validated_data):
        if not validated_data.get('internal_fleet_number'):
            validated_data.pop('internal_fleet_number', None)
        if not validated_data.get('vin'):
            validated_data.pop('vin', None)
        initial_odometer = validated_data.get('current_odometer', 0)
        vehicle = Vehicle.objects.create(**validated_data)
        if initial_odometer > 0:
            OdometerReading.objects.create(
                vehicle=vehicle,
                reading=initial_odometer,
                source=OdometerReading.Source.INITIAL,
                user=self.context['request'].user if 'request' in self.context else None,
                notes="قراءة العداد الافتتاحية للمركبة"
            )
        return vehicle

    def update(self, instance, validated_data):
        if not validated_data.get('vin'):
            validated_data.pop('vin', None)
        if not validated_data.get('internal_fleet_number'):
            validated_data.pop('internal_fleet_number', None)
        return super().update(instance, validated_data)


class UpdateOdometerSerializer(CleanNullFieldsMixin, serializers.Serializer):
    new_reading = serializers.IntegerField(min_value=0, required=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
