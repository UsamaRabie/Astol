from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from core.models import SystemSetting
from vehicles.models import Vehicle, VehicleType, OdometerReading
from drivers.models import Driver
from work_permits.models import WorkPermit
from parts.models import PartCatalog, VehiclePart
from maintenance.models import MaintenanceType, MaintenanceRecord
from maintenance.services import MaintenanceRuleEngine
from fuel.models import FuelRecord
from notifications.models import VehicleAlert
from reports.services import ReportGeneratorService


class AstolFleetTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_user(
            username='test_admin', password='Password@123', full_name='مدير الاختبار', role=User.Role.ADMIN
        )
        self.operator = User.objects.create_user(
            username='test_operator', password='Password@123', full_name='مشغل الاختبار', role=User.Role.OPERATOR
        )
        self.reporter = User.objects.create_user(
            username='test_reporter', password='Password@123', full_name='مراقب الاختبار', role=User.Role.REPORTER
        )

        # Settings
        SystemSetting.objects.create(key='MAINTENANCE_DUE_SOON_KM', value='1000')
        SystemSetting.objects.create(key='MAINTENANCE_DUE_SOON_DAYS', value='14')

        # Vehicle Type
        self.vtype = VehicleType.objects.create(name='شاحنة نقل', icon='truck')

        # Driver
        self.driver = Driver.objects.create(
            full_name='سائق تجريبي',
            national_id='1010101010',
            phone='0500000000',
            license_number='DL-999',
            license_expiry_date=timezone.now().date() + timedelta(days=365)
        )

        # Vehicle
        self.vehicle = Vehicle.objects.create(
            internal_fleet_number='TST-100',
            plate_number='ت س ت 100',
            vehicle_type=self.vtype,
            make='مرسيدس',
            model='أكتروس',
            year=2024,
            color='أبيض',
            vin='VIN1234567890TST1',
            current_odometer=100000,
            status=Vehicle.Status.ACTIVE,
            assigned_driver=self.driver,
            registration_expiry_date=timezone.now().date() + timedelta(days=200),
            insurance_expiry_date=timezone.now().date() + timedelta(days=200),
        )

        # Part Catalog & Vehicle Part
        self.part_catalog = PartCatalog.objects.create(
            name='زيت محرك ديزل 15W-40',
            category=PartCatalog.Category.FLUIDS,
            default_interval_km=10000,
            default_interval_days=180
        )
        self.vehicle_part = VehiclePart.objects.create(
            vehicle=self.vehicle,
            part=self.part_catalog,
            installation_date=timezone.now().date() - timedelta(days=30),
            installation_odometer=95000,
            interval_km=10000,
            interval_days=180,
            next_replacement_km=105000,
            next_replacement_date=timezone.now().date() + timedelta(days=150)
        )

    # -------------------------------------------------------------
    # 1. AUTHENTICATION & RBAC PERMISSION TESTS
    # -------------------------------------------------------------
    def test_jwt_authentication_success(self):
        resp = self.client.post('/api/auth/login/', {'username': 'test_admin', 'password': 'Password@123'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertEqual(resp.data['user']['role'], User.Role.ADMIN)

    def test_reporter_cannot_modify_vehicles(self):
        self.client.force_authenticate(user=self.reporter)
        # Attempt to create vehicle
        resp = self.client.post('/api/vehicles/', {
            'internal_fleet_number': 'TST-999',
            'plate_number': 'ع ع ع 999',
            'vehicle_type': self.vtype.id,
            'make': 'تويوتا',
            'model': 'كورولا',
            'year': 2023,
            'color': 'أزرق',
            'vin': 'VIN999999999',
            'current_odometer': 5000,
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to delete vehicle
        resp = self.client.delete(f'/api/vehicles/{self.vehicle.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_reporter_can_read_vehicles(self):
        self.client.force_authenticate(user=self.reporter)
        resp = self.client.get('/api/vehicles/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_operator_cannot_access_user_management(self):
        self.client.force_authenticate(user=self.operator)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_operator_cannot_access_audit_logs(self):
        self.client.force_authenticate(user=self.operator)
        resp = self.client.get('/api/audit-logs/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_has_full_access_to_users_and_settings(self):
        self.client.force_authenticate(user=self.admin)
        users_resp = self.client.get('/api/users/')
        self.assertEqual(users_resp.status_code, status.HTTP_200_OK)
        settings_resp = self.client.get('/api/settings/')
        self.assertEqual(settings_resp.status_code, status.HTTP_200_OK)

    # -------------------------------------------------------------
    # 2. ODOMETER BUSINESS RULES
    # -------------------------------------------------------------
    def test_odometer_cannot_decrease(self):
        # Current odometer is 100,000 km
        with self.assertRaises(ValidationError):
            self.vehicle.update_odometer(99500)

        # Verify current odometer is still 100,000
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.current_odometer, 100000)

    def test_odometer_endpoint_rejects_lower_reading(self):
        self.client.force_authenticate(user=self.operator)
        resp = self.client.post(f'/api/vehicles/{self.vehicle.id}/odometer/', {
            'new_reading': 98000,
            'notes': 'محاولة إدخال خاطئة'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_odometer_update_records_history(self):
        self.client.force_authenticate(user=self.operator)
        resp = self.client.post(f'/api/vehicles/{self.vehicle.id}/odometer/', {
            'new_reading': 102500,
            'source': 'MANUAL',
            'notes': 'قراءة فحص'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.current_odometer, 102500)
        self.assertTrue(OdometerReading.objects.filter(vehicle=self.vehicle, reading=102500).exists())

    # -------------------------------------------------------------
    # 3. WORK PERMIT & TRIP WORKFLOW RULES
    # -------------------------------------------------------------
    def test_work_permit_complete_lifecycle(self):
        # 1. Create Draft
        permit = WorkPermit.objects.create(
            permit_number='WP-TEST-001',
            vehicle=self.vehicle,
            driver=self.driver,
            requesting_department='العمليات',
            destination='الرياض - الخرج',
            purpose='فحص مشاريع',
            status=WorkPermit.Status.DRAFT,
            created_by=self.operator
        )
        self.assertEqual(permit.status, WorkPermit.Status.DRAFT)

        # 2. Approve
        permit.approve(user=self.admin)
        self.assertEqual(permit.status, WorkPermit.Status.APPROVED)

        # 3. Start Trip
        permit.start_trip(starting_odometer=100000, user=self.operator)
        self.assertEqual(permit.status, WorkPermit.Status.IN_PROGRESS)
        self.assertEqual(permit.starting_odometer, 100000)

        # 4. Reject complete trip if ending_odometer < starting_odometer
        with self.assertRaises(ValidationError):
            permit.complete_trip(ending_odometer=99000, user=self.operator)

        # 5. Complete Trip successfully
        permit.complete_trip(ending_odometer=100850, user=self.operator)
        permit.refresh_from_db()
        self.assertEqual(permit.status, WorkPermit.Status.COMPLETED)
        self.assertEqual(permit.distance_traveled, 850)

        # Verify vehicle odometer updated to 100,850 km
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.current_odometer, 100850)

        # Verify OdometerReading created with source TRIP
        latest_reading = self.vehicle.odometer_readings.latest('created_at')
        self.assertEqual(latest_reading.reading, 100850)
        self.assertEqual(latest_reading.source, OdometerReading.Source.TRIP)

    def test_out_of_service_vehicle_cannot_start_trip(self):
        self.vehicle.status = Vehicle.Status.OUT_OF_SERVICE
        self.vehicle.save()

        permit = WorkPermit.objects.create(
            permit_number='WP-TEST-002',
            vehicle=self.vehicle,
            driver=self.driver,
            requesting_department='العمليات',
            destination='الرياض',
            purpose='مهمة',
            status=WorkPermit.Status.APPROVED
        )

        with self.assertRaises(ValidationError):
            permit.start_trip()

    def test_in_maintenance_vehicle_cannot_start_trip(self):
        self.vehicle.status = Vehicle.Status.IN_MAINTENANCE
        self.vehicle.save()

        permit = WorkPermit.objects.create(
            permit_number='WP-TEST-003',
            vehicle=self.vehicle,
            driver=self.driver,
            requesting_department='العمليات',
            destination='الرياض',
            purpose='مهمة',
            status=WorkPermit.Status.APPROVED
        )

        with self.assertRaises(ValidationError):
            permit.start_trip()

    # -------------------------------------------------------------
    # 4. MAINTENANCE RULE ENGINE & ALERTS
    # -------------------------------------------------------------
    def test_maintenance_due_soon_and_overdue_detection(self):
        # next_replacement_km is 105,000 km
        # Current odometer is 100,000 -> remaining = 5,000 km (OK)
        health = self.vehicle_part.calculate_health(current_odometer=100000, due_soon_km=1000)
        self.assertEqual(health['status'], VehiclePart.HealthStatus.OK)

        # When odometer becomes 104,200 -> remaining = 800 km <= 1000 (DUE_SOON)
        health = self.vehicle_part.calculate_health(current_odometer=104200, due_soon_km=1000)
        self.assertEqual(health['status'], VehiclePart.HealthStatus.DUE_SOON)

        # When odometer becomes 105,100 -> remaining = -100 km <= 0 (OVERDUE)
        health = self.vehicle_part.calculate_health(current_odometer=105100, due_soon_km=1000)
        self.assertEqual(health['status'], VehiclePart.HealthStatus.OVERDUE)

    def test_maintenance_engine_generates_alerts(self):
        # Update vehicle odometer to 105,200 km (exceeds next_replacement_km 105,000)
        self.vehicle.update_odometer(105200, source='MANUAL', user=self.admin)
        MaintenanceRuleEngine.evaluate_vehicle(self.vehicle)

        # An overdue critical alert must be created
        self.vehicle_part.refresh_from_db()
        self.assertEqual(self.vehicle_part.current_status, VehiclePart.HealthStatus.OVERDUE)
        alert = VehicleAlert.objects.filter(
            vehicle=self.vehicle,
            alert_type=VehicleAlert.AlertType.MAINTENANCE_OVERDUE,
            severity=VehicleAlert.Severity.CRITICAL
        ).first()
        self.assertIsNotNone(alert)

    def test_part_replacement_resets_health_and_alert(self):
        self.vehicle_part.record_replacement(new_odometer=105200)
        self.vehicle_part.refresh_from_db()
        self.assertEqual(self.vehicle_part.current_status, VehiclePart.HealthStatus.OK)
        self.assertEqual(self.vehicle_part.installation_odometer, 105200)
        self.assertEqual(self.vehicle_part.next_replacement_km, 115200)

    # -------------------------------------------------------------
    # 5. FUEL MANAGEMENT RULES
    # -------------------------------------------------------------
    def test_fuel_record_auto_cost_calculation(self):
        fuel = FuelRecord.objects.create(
            vehicle=self.vehicle,
            odometer=100500,
            quantity=Decimal('50.00'),
            price_per_unit=Decimal('2.18'),
            created_by=self.operator
        )
        self.assertEqual(fuel.total_cost, Decimal('109.00'))

    # -------------------------------------------------------------
    # 6. REPORTING & DASHBOARD
    # -------------------------------------------------------------
    def test_dashboard_api_returns_kpis(self):
        self.client.force_authenticate(user=self.reporter)
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('kpis', resp.data)
        self.assertIn('status_chart', resp.data)
        self.assertIn('monthly_trends', resp.data)

    def test_report_service_all_types(self):
        report_types = [
            'VEHICLES', 'VEHICLE_USAGE', 'WORK_PERMITS', 'TRIPS',
            'MAINTENANCE', 'MAINTENANCE_COST', 'PARTS_REPLACEMENT',
            'FUEL', 'FUEL_COST', 'ODOMETER', 'DRIVER_ACTIVITY',
            'EXPIRING_DOCUMENTS', 'OVERDUE_MAINTENANCE', 'UPCOMING_MAINTENANCE'
        ]
        for rtype in report_types:
            res = ReportGeneratorService.generate_report_data(rtype, {}, self.admin)
            self.assertIn('columns', res)
            self.assertIn('data', res)
            self.assertIn('summary', res)

    def test_report_excel_export_bytes(self):
        excel_stream = ReportGeneratorService.export_excel('VEHICLES', {}, self.admin)
        self.assertGreater(len(excel_stream.getvalue()), 0)
