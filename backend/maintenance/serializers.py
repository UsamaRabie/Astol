from rest_framework import serializers
from .models import MaintenanceType, MaintenanceRecord
from parts.models import VehiclePart


class MaintenanceTypeSerializer(serializers.ModelSerializer):
    record_count = serializers.IntegerField(source='records.count', read_only=True)

    class Meta:
        model = MaintenanceType
        fields = [
            'id', 'name', 'description', 'is_periodic', 'recommended_km',
            'recommended_days', 'record_count', 'created_at'
        ]


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    fleet_number = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True)
    maintenance_type_name = serializers.CharField(source='maintenance_type.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    parts_replaced_details = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRecord
        fields = [
            'id', 'vehicle', 'vehicle_plate', 'fleet_number', 'maintenance_type',
            'maintenance_type_name', 'maintenance_date', 'odometer', 'description',
            'cost', 'service_provider', 'technician', 'notes', 'status',
            'status_display', 'parts_replaced', 'parts_replaced_details',
            'created_by_name', 'created_at'
        ]

    def get_parts_replaced_details(self, obj):
        return [{'id': p.id, 'name': p.part.name} for p in obj.parts_replaced.all()]


class MaintenanceRecordCreateUpdateSerializer(serializers.ModelSerializer):
    reset_parts_intervals = serializers.BooleanField(default=True, write_only=True, required=False)

    class Meta:
        model = MaintenanceRecord
        fields = [
            'id', 'vehicle', 'maintenance_type', 'maintenance_date', 'odometer',
            'description', 'cost', 'service_provider', 'technician', 'notes',
            'status', 'parts_replaced', 'reset_parts_intervals'
        ]

    def create(self, validated_data):
        reset_parts = validated_data.pop('reset_parts_intervals', True)
        parts = validated_data.pop('parts_replaced', [])
        user = self.context['request'].user if 'request' in self.context else None
        validated_data['created_by'] = user

        record = MaintenanceRecord.objects.create(**validated_data)
        if parts:
            record.parts_replaced.set(parts)

        # If reset_parts is true, reset each replaced part's interval
        if reset_parts and parts:
            for vp in parts:
                vp.record_replacement(
                    new_odometer=record.odometer,
                    replacement_date=record.maintenance_date,
                    notes=f"صيانة: {record.maintenance_type.name}"
                )

        # If odometer at maintenance is greater than vehicle odometer, update it
        if record.odometer > record.vehicle.current_odometer:
            from vehicles.models import OdometerReading
            record.vehicle.update_odometer(
                new_reading=record.odometer,
                source=OdometerReading.Source.MAINTENANCE,
                user=user,
                notes=f"صيانة {record.maintenance_type.name} - الورشة: {record.service_provider}"
            )

        # Trigger maintenance rule engine
        from maintenance.services import MaintenanceRuleEngine
        MaintenanceRuleEngine.evaluate_vehicle(record.vehicle)

        return record

    def update(self, instance, validated_data):
        reset_parts = validated_data.pop('reset_parts_intervals', False)
        parts = validated_data.pop('parts_replaced', None)

        record = super().update(instance, validated_data)
        if parts is not None:
            record.parts_replaced.set(parts)
            if reset_parts:
                for vp in parts:
                    vp.record_replacement(
                        new_odometer=record.odometer,
                        replacement_date=record.maintenance_date,
                        notes=f"صيانة: {record.maintenance_type.name}"
                    )

        if record.odometer > record.vehicle.current_odometer:
            from vehicles.models import OdometerReading
            user = self.context['request'].user if 'request' in self.context else None
            record.vehicle.update_odometer(
                new_reading=record.odometer,
                source=OdometerReading.Source.MAINTENANCE,
                user=user,
                notes=f"تعديل صيانة {record.maintenance_type.name} - الورشة: {record.service_provider}"
            )

        from maintenance.services import MaintenanceRuleEngine
        MaintenanceRuleEngine.evaluate_vehicle(record.vehicle)
        return record
