from django.utils import timezone
from core.models import SystemSetting
from notifications.models import VehicleAlert


class MaintenanceRuleEngine:
    @staticmethod
    def get_thresholds():
        return {
            'due_soon_km': SystemSetting.get_int('MAINTENANCE_DUE_SOON_KM', 1000),
            'due_soon_days': SystemSetting.get_int('MAINTENANCE_DUE_SOON_DAYS', 14),
            'upcoming_km': SystemSetting.get_int('MAINTENANCE_UPCOMING_KM', 2500),
            'upcoming_days': SystemSetting.get_int('MAINTENANCE_UPCOMING_DAYS', 30),
        }

    @classmethod
    def evaluate_vehicle(cls, vehicle):
        """
        Evaluates all parts and document expirations for a single vehicle.
        Updates statuses and creates/resolves alerts.
        """
        thresholds = cls.get_thresholds()
        parts = vehicle.parts.select_related('part').all()
        results = []

        for vehicle_part in parts:
            health = vehicle_part.calculate_health(
                current_odometer=vehicle.current_odometer,
                due_soon_km=thresholds['due_soon_km'],
                due_soon_days=thresholds['due_soon_days'],
                upcoming_km=thresholds['upcoming_km'],
                upcoming_days=thresholds['upcoming_days']
            )
            vehicle_part.save(update_fields=['current_status'])

            part_name = vehicle_part.part.name
            fleet_num = vehicle.internal_fleet_number
            rem_km = health['remaining_km']
            rem_days = health['remaining_days']

            # Handle Alerts
            if health['status'] == vehicle_part.HealthStatus.OVERDUE:
                cls._create_or_update_alert(
                    vehicle=vehicle,
                    alert_type=VehicleAlert.AlertType.MAINTENANCE_OVERDUE,
                    severity=VehicleAlert.Severity.CRITICAL,
                    title=f"صيانة متأخرة: {part_name} للسيارة رقم {fleet_num}",
                    message=f"السيارة رقم {fleet_num} تجاوزت موعد صيانة {part_name} (المتبقي: {rem_km} كم، {rem_days} يوم)"
                )
            elif health['status'] == vehicle_part.HealthStatus.DUE_SOON:
                cls._create_or_update_alert(
                    vehicle=vehicle,
                    alert_type=VehicleAlert.AlertType.MAINTENANCE_DUE_SOON,
                    severity=VehicleAlert.Severity.WARNING,
                    title=f"صيانة مستحقة قريباً: {part_name} للسيارة رقم {fleet_num}",
                    message=f"السيارة رقم {fleet_num} تحتاج صيانة {part_name} خلال {max(rem_km, 0)} كم أو {max(rem_days, 0)} يوم"
                )
            elif health['status'] == vehicle_part.HealthStatus.OK:
                # Resolve overdue/due soon alerts for this part if any
                VehicleAlert.objects.filter(
                    vehicle=vehicle,
                    alert_type__in=[VehicleAlert.AlertType.MAINTENANCE_OVERDUE, VehicleAlert.AlertType.MAINTENANCE_DUE_SOON],
                    title__contains=part_name,
                    is_resolved=False
                ).update(is_resolved=True, resolved_at=timezone.now())

            results.append({
                'part_id': vehicle_part.id,
                'part_name': part_name,
                'status': health['status'],
                'remaining_km': rem_km,
                'remaining_days': rem_days,
                'next_replacement_km': health['next_replacement_km'],
                'next_replacement_date': health['next_replacement_date'],
            })

        # Evaluate Document Expirations
        today = timezone.now().date()
        doc_alerts = [
            ('استمارة المركبة', vehicle.registration_expiry_date),
            ('وثيقة التأمين', vehicle.insurance_expiry_date),
            ('الفحص الدوري', vehicle.periodic_inspection_expiry_date),
        ]
        for doc_name, expiry_date in doc_alerts:
            if not expiry_date:
                continue
            days_left = (expiry_date - today).days
            fleet_num = vehicle.internal_fleet_number
            if days_left < 0:
                cls._create_or_update_alert(
                    vehicle=vehicle,
                    alert_type=VehicleAlert.AlertType.DOCUMENT_EXPIRED,
                    severity=VehicleAlert.Severity.CRITICAL,
                    title=f"وثيقة منتهية: {doc_name} للسيارة رقم {fleet_num}",
                    message=f"انتهت صلاحية {doc_name} للمركبة رقم {fleet_num} منذ {abs(days_left)} يوم (تاريخ الانتهاء: {expiry_date})"
                )
            elif days_left <= 30:
                cls._create_or_update_alert(
                    vehicle=vehicle,
                    alert_type=VehicleAlert.AlertType.DOCUMENT_EXPIRING,
                    severity=VehicleAlert.Severity.WARNING,
                    title=f"قرب انتهاء وثيقة: {doc_name} للسيارة رقم {fleet_num}",
                    message=f"تنتهي صلاحية {doc_name} للمركبة رقم {fleet_num} خلال {days_left} يوم (تاريخ الانتهاء: {expiry_date})"
                )

        return results

    @classmethod
    def evaluate_fleet(cls):
        """Evaluates all active vehicles across the fleet"""
        from vehicles.models import Vehicle
        vehicles = Vehicle.objects.filter(is_deleted=False).prefetch_related('parts__part')
        fleet_results = {}
        for vehicle in vehicles:
            fleet_results[vehicle.id] = cls.evaluate_vehicle(vehicle)
        return fleet_results

    @staticmethod
    def _create_or_update_alert(vehicle, alert_type, severity, title, message):
        alert, created = VehicleAlert.objects.get_or_create(
            vehicle=vehicle,
            alert_type=alert_type,
            title=title,
            is_resolved=False,
            defaults={
                'severity': severity,
                'message': message,
            }
        )
        if not created and alert.message != message:
            alert.message = message
            alert.severity = severity
            alert.is_read = False
            alert.save(update_fields=['message', 'severity', 'is_read', 'updated_at'])
        return alert
