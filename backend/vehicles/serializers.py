from rest_framework import serializers
from .models import (
    Vehicle, VehicleType, OdometerReading, VehicleDocument,
    VehicleModel, VehicleColor, Department
)
from drivers.models import Driver


class VehicleModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleModel
        fields = ['id', 'name', 'make', 'description', 'created_at']


class VehicleColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleColor
        fields = ['id', 'name', 'code', 'created_at']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at']


class VehicleTypeSerializer(serializers.ModelSerializer):
    vehicle_count = serializers.IntegerField(source='vehicles.count', read_only=True)

    class Meta:
        model = VehicleType
        fields = ['id', 'name', 'description', 'icon', 'vehicle_count', 'created_at']


class OdometerReadingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='النظام')
    source_display = serializers.CharField(source='get_source_display', read_only=True)

    class Meta:
        model = OdometerReading
        fields = [
            'id', 'vehicle', 'reading', 'date_time', 'source',
            'source_display', 'user', 'user_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class VehicleDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)

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


class VehicleCreateUpdateSerializer(serializers.ModelSerializer):
    internal_fleet_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'internal_fleet_number', 'plate_number', 'vehicle_type',
            'make', 'model', 'year', 'color', 'vin', 'engine_number',
            'current_odometer', 'fuel_type', 'status', 'assigned_driver',
            'department', 'purchase_date', 'registration_expiry_date',
            'insurance_expiry_date', 'periodic_inspection_expiry_date', 'notes'
        ]

    def create(self, validated_data):
        if not validated_data.get('internal_fleet_number'):
            validated_data.pop('internal_fleet_number', None)
        initial_odometer = validated_data.get('current_odometer', 0)
        vehicle = Vehicle.objects.create(**validated_data)
        if initial_odometer > 0:
            OdometerReading.objects.create(
                vehicle=vehicle,
                reading=initial_odometer,
                source=OdometerReading.Source.INITIAL,
                notes="قراءة العداد الافتتاحية عند تسجيل المركبة"
            )
        return vehicle


class UpdateOdometerSerializer(serializers.Serializer):
    new_reading = serializers.IntegerField(min_value=0, required=True)
    date_time = serializers.DateTimeField(required=False)
    source = serializers.ChoiceField(choices=OdometerReading.Source.choices, default=OdometerReading.Source.MANUAL)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
