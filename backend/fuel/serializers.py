from decimal import Decimal
from rest_framework import serializers
from .models import FuelRecord
from vehicles.serializers import VehicleListSerializer
from drivers.serializers import DriverSerializer


class FuelRecordSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    fleet_number = serializers.CharField(source='vehicle.internal_fleet_number', read_only=True)
    driver_name = serializers.CharField(source='driver.full_name', read_only=True, default='غير محدد')
    fuel_type_display = serializers.CharField(source='get_fuel_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')

    class Meta:
        model = FuelRecord
        fields = [
            'id', 'vehicle', 'vehicle_plate', 'fleet_number', 'date', 'odometer',
            'fuel_type', 'fuel_type_display', 'quantity', 'price_per_unit',
            'total_cost', 'station', 'driver', 'driver_name', 'notes',
            'created_by_name', 'created_at'
        ]


class FuelRecordCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelRecord
        fields = [
            'id', 'vehicle', 'date', 'odometer', 'fuel_type', 'quantity',
            'price_per_unit', 'total_cost', 'station', 'driver', 'notes'
        ]
        read_only_fields = ['total_cost']

    def create(self, validated_data):
        user = self.context['request'].user if 'request' in self.context else None
        validated_data['created_by'] = user
        quantity = Decimal(str(validated_data.get('quantity', 0)))
        price = Decimal(str(validated_data.get('price_per_unit', 0)))
        validated_data['total_cost'] = round(quantity * price, 2)
        return super().create(validated_data)
