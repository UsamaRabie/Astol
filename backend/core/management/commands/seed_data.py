import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from core.models import SystemSetting
from vehicles.models import VehicleType, Vehicle, OdometerReading, VehicleDocument
from drivers.models import Driver, DriverAssignment
from parts.models import PartCatalog, VehiclePart
from maintenance.models import MaintenanceType, MaintenanceRecord
from maintenance.services import MaintenanceRuleEngine
from work_permits.models import WorkPermit
from fuel.models import FuelRecord
from audit.models import AuditLog


class Command(BaseCommand):
    help = 'بذر البيانات التأسيسية والواقعية لنظام أسطول'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('بدء إدخال البيانات التأسيسية...'))

        # 1. System Settings
        self.stdout.write('1. إعدادات النظام...')
        settings_data = [
            ('MAINTENANCE_DUE_SOON_KM', '1000', 'حد الكيلومترات للتنبيه بالصيانة المستحقة قريباً'),
            ('MAINTENANCE_DUE_SOON_DAYS', '14', 'حد الأيام للتنبيه بالصيانة المستحقة قريباً'),
            ('MAINTENANCE_UPCOMING_KM', '2500', 'حد الكيلومترات للتنبيه بالصيانة القادمة'),
            ('MAINTENANCE_UPCOMING_DAYS', '30', 'حد الأيام للتنبيه بالصيانة القادمة'),
            ('COMPANY_NAME', 'شركة أسطول اللوجستية لنقل وتوزيع البضائع', 'اسم الشركة في التقارير والترويسة'),
        ]
        for key, val, desc in settings_data:
            SystemSetting.objects.update_or_create(key=key, defaults={'value': val, 'description': desc})

        # 2. Users
        self.stdout.write('2. حسابات المستخدمين...')
        admin_user, _ = User.objects.update_or_create(
            username='admin',
            defaults={
                'email': 'admin@astol.sa',
                'full_name': 'م. عبدالله السالم (مدير عام الأسطول)',
                'role': User.Role.ADMIN,
                'phone': '0501234567',
                'department': 'الإدارة العامة والتشغيل',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_user.set_password('Admin@123456')
        admin_user.save()

        operator_user, _ = User.objects.update_or_create(
            username='operator',
            defaults={
                'email': 'operator@astol.sa',
                'full_name': 'أ. محمد القحطاني (مسؤول حركة وتشغيل)',
                'role': User.Role.OPERATOR,
                'phone': '0559876543',
                'department': 'قسم الحركة والتشغيل الميداني',
                'is_staff': False,
                'is_superuser': False,
            }
        )
        operator_user.set_password('Operator@123456')
        operator_user.save()

        reporter_user, _ = User.objects.update_or_create(
            username='reporter',
            defaults={
                'email': 'reporter@astol.sa',
                'full_name': 'أ. سارة الدوسري (مدقق الجودة والتقارير)',
                'role': User.Role.REPORTER,
                'phone': '0543322110',
                'department': 'إدارة المتابعة والجودة والتقارير',
                'is_staff': False,
                'is_superuser': False,
            }
        )
        reporter_user.set_password('Reporter@123456')
        reporter_user.save()

        # 3. Vehicle Types
        self.stdout.write('3. تصنيفات المركبات...')
        vtypes = {
            'sedan': VehicleType.objects.update_or_create(name='سيدان (سيارات الإشراف والمتابعة)', defaults={'description': 'مركبات ركاب خفيفة للمهندسين والمشرفين', 'icon': 'car'})[0],
            'pickup': VehicleType.objects.update_or_create(name='بيك أب (نقل خفيف وصيانة سريعة)', defaults={'description': 'سيارات حوض لنقل المعدات الخفيفة وفرق الدعم', 'icon': 'truck'})[0],
            'truck': VehicleType.objects.update_or_create(name='شاحنة نقل ثقيل (تريلات وقلابات)', defaults={'description': 'شاحنات نقل البضائع والشحن لمسافات طويلة', 'icon': 'container'})[0],
            'bus': VehicleType.objects.update_or_create(name='حافلة ركاب (نقل الموظفين والعمالة)', defaults={'description': 'حافلات لنقل الكوادر والموظفين بين الفروع', 'icon': 'bus'})[0],
            'van': VehicleType.objects.update_or_create(name='فان بضائع ومبرد', defaults={'description': 'مركبات نقل وتوزيع مغلقة ومبردة', 'icon': 'package'})[0],
        }

        # 4. Part Catalog
        self.stdout.write('4. كتالوج قطع الغيار والصيانة...')
        parts_catalog_data = [
            ('زيت المحرك التخليقي 10W-40', PartCatalog.Category.FLUIDS, 10000, 180, 'لتر', 'زيت محرك معتمد عالي الجودة للخدمة الشاقة'),
            ('فلتر زيت المحرك', PartCatalog.Category.FILTERS, 10000, 180, 'حبة', 'فلتر زيت أصلي وكالة'),
            ('فلتر هواء المحرك', PartCatalog.Category.FILTERS, 20000, 365, 'حبة', 'فلتر لتنقية الهواء الداخل لحجرة الاحتراق'),
            ('فحمات الفرامل الأمامية', PartCatalog.Category.BRAKES, 30000, 365, 'طقم', 'فحمات كبح سيراميك عالية التحمل'),
            ('فحمات الفرامل الخلفية', PartCatalog.Category.BRAKES, 40000, 365, 'طقم', 'فحمات كبح خلفية'),
            ('طقم الإطارات (4 إطارات)', PartCatalog.Category.SUSPENSION, 50000, 730, 'طقم', 'إطارات مخصصة للأجواء الحارة والحمولات الثقيلة'),
            ('بطارية المركبة 12V / 80Ah', PartCatalog.Category.ELECTRICAL, 40000, 540, 'حبة', 'بطارية خالية من الصيانة جافة'),
            ('سائل تبريد المحرك (ماء الرديتر)', PartCatalog.Category.COOLING, 40000, 365, 'لتر', 'سائل تبريد مضاد للتجمد والصدأ الأصلي'),
            ('شمعات الاحتراق (بواجي)', PartCatalog.Category.ENGINE, 30000, 365, 'طقم', 'شمعات إيريديوم طويلة العمر'),
            ('سير المحرك الرئيسي (دينامو/مكيف)', PartCatalog.Category.ENGINE, 60000, 730, 'حبة', 'سير محرك أصلي مدعم'),
        ]
        created_parts = {}
        for name, cat, km, days, unit, desc in parts_catalog_data:
            p, _ = PartCatalog.objects.update_or_create(
                name=name,
                defaults={
                    'category': cat,
                    'default_interval_km': km,
                    'default_interval_days': days,
                    'unit': unit,
                    'description': desc
                }
            )
            created_parts[name] = p

        # 5. Maintenance Types
        self.stdout.write('5. أنواع الصيانة...')
        maint_types_data = [
            ('صيانة دورية 10,000 كم (زيت وفلتر وفحص)', True, 10000, 180, 'تغيير زيت المحرك وفلتر الزيت وفحص السوائل'),
            ('صيانة دورية 20,000 كم (زيوت وفلاتر هواء)', True, 20000, 360, 'تغيير الزيوت وفلتر الهواء وفحص نظام التعليق'),
            ('خدمة صيانة نظام الكبح والفرامل', True, 30000, 360, 'خرط هوبات واستبدال فحمات وتغيير زيت الفرامل'),
            ('استبدال الإطارات والترصيص والوزن', True, 50000, 720, 'استبدال طقم الإطارات مع ميزان ليزر وترصيص'),
            ('فحص وصيانة المنظومة الكهربائية والبطارية', False, 40000, 540, 'اختبار الدينامو واستبدال البطارية وفحص الأسلاك'),
            ('الفحص الفني الدوري الشامل', True, 25000, 365, 'فحص وقائي شامل للمركبة وإعداد تقرير السلامة'),
            ('إصلاح عطل طارئ / ميكانيكا', False, 0, 0, 'إصلاحات طارئة غير مجدولة في المحرك أو ناقل الحركة'),
        ]
        created_maint_types = {}
        for name, periodic, km, days, desc in maint_types_data:
            mt, _ = MaintenanceType.objects.update_or_create(
                name=name,
                defaults={
                    'is_periodic': periodic,
                    'recommended_km': km,
                    'recommended_days': days,
                    'description': desc
                }
            )
            created_maint_types[name] = mt

        # 6. Drivers
        self.stdout.write('6. السائقون...')
        drivers_data = [
            ('خالد بن سعد العتيبي', '1087654321', '0551122334', 'DL-88201', date(2027, 8, 15), Driver.Status.ACTIVE),
            ('فهد بن ناصر الحربي', '1098765432', '0552233445', 'DL-77312', date(2027, 4, 10), Driver.Status.ACTIVE),
            ('أحمد بن سعيد الشهري', '1076543210', '0553344556', 'DL-66423', date(2026, 11, 25), Driver.Status.ACTIVE),
            ('عمر بن سالم الغامدي', '1065432109', '0554455667', 'DL-55534', date(2026, 10, 5), Driver.Status.ACTIVE), # license expiring soon
            ('سلطان بن عبدالعزيز المطيري', '1054321098', '0555566778', 'DL-44645', date(2028, 1, 20), Driver.Status.ACTIVE),
            ('راشد بن محمد المري', '1043210987', '0556677889', 'DL-33756', date(2027, 6, 30), Driver.Status.ACTIVE),
            ('ياسر بن علي الزهراني', '1032109876', '0557788990', 'DL-22867', date(2026, 8, 1), Driver.Status.ON_LEAVE),
            ('طارق بن حمود الرشيدي', '1021098765', '0558899001', 'DL-11978', date(2027, 12, 12), Driver.Status.ACTIVE),
        ]
        created_drivers = []
        for name, nid, phone, lic_no, lic_exp, status in drivers_data:
            d, _ = Driver.objects.update_or_create(
                national_id=nid,
                defaults={
                    'full_name': name,
                    'phone': phone,
                    'license_number': lic_no,
                    'license_expiry_date': lic_exp,
                    'status': status,
                    'notes': 'سائق معتمد برخصة نقل عمومي وثقيل'
                }
            )
            created_drivers.append(d)

        # 7. Vehicles
        self.stdout.write('7. أسطول المركبات...')
        today = timezone.now().date()
        vehicles_data = [
            {
                'fleet_no': 'FL-101', 'plate': 'أ ب ج 1021', 'vtype': vtypes['sedan'], 'make': 'تويوتا', 'model': 'كامري',
                'year': 2024, 'color': 'أبيض لؤلؤي', 'vin': '4T1B11HK5PU101001', 'engine': '2AR-FE-901',
                'odometer': 34500, 'fuel': Vehicle.FuelType.GASOLINE_91, 'status': Vehicle.Status.ACTIVE,
                'driver_idx': 0, 'dept': 'إدارة العمليات', 'reg_exp': today + timedelta(days=180),
                'ins_exp': today + timedelta(days=90), 'insp_exp': today + timedelta(days=120)
            },
            {
                'fleet_no': 'FL-102', 'plate': 'د هـ و 2045', 'vtype': vtypes['sedan'], 'make': 'هيونداي', 'model': 'سوناتا',
                'year': 2023, 'color': 'فضي ميتاليك', 'vin': 'KMHE24LA4PA202002', 'engine': 'G4KJ-882',
                'odometer': 58200, 'fuel': Vehicle.FuelType.GASOLINE_91, 'status': Vehicle.Status.ACTIVE,
                'driver_idx': 1, 'dept': 'قسم السلامة والإشراف', 'reg_exp': today + timedelta(days=45),
                'ins_exp': today + timedelta(days=10), 'insp_exp': today + timedelta(days=60) # insurance expiring soon
            },
            {
                'fleet_no': 'FL-201', 'plate': 'س ص ط 3099', 'vtype': vtypes['pickup'], 'make': 'تويوتا', 'model': 'هايلكس غمارتين 4x4',
                'year': 2024, 'color': 'أبيض', 'vin': 'MROER8CD1P1303003', 'engine': '1GD-FTV-771',
                'odometer': 42800, 'fuel': Vehicle.FuelType.DIESEL, 'status': Vehicle.Status.ACTIVE,
                'driver_idx': 2, 'dept': 'فرق الصيانة الميدانية', 'reg_exp': today + timedelta(days=240),
                'ins_exp': today + timedelta(days=200), 'insp_exp': today + timedelta(days=150)
            },
            {
                'fleet_no': 'FL-202', 'plate': 'ع غ ف 4012', 'vtype': vtypes['pickup'], 'make': 'إيسوزو', 'model': 'ديماكس GT',
                'year': 2022, 'color': 'رمادي غامق', 'vin': 'MPATE12Y7N5404004', 'engine': '4JJ3-TCX-551',
                'odometer': 89500, 'fuel': Vehicle.FuelType.DIESEL, 'status': Vehicle.Status.IN_MAINTENANCE,
                'driver_idx': 3, 'dept': 'الدعم اللوجستي', 'reg_exp': today - timedelta(days=15), # registration expired!
                'ins_exp': today + timedelta(days=110), 'insp_exp': today - timedelta(days=5) # inspection expired!
            },
            {
                'fleet_no': 'FL-301', 'plate': 'ق ك ل 5088', 'vtype': vtypes['truck'], 'make': 'مرسيدس-بنز', 'model': 'أكتروس 2040 راس تريلا',
                'year': 2023, 'color': 'أزرق كحلي', 'vin': 'WDB9634031L505005', 'engine': 'OM471LA-331',
                'odometer': 125400, 'fuel': Vehicle.FuelType.DIESEL, 'status': Vehicle.Status.ACTIVE,
                'driver_idx': 4, 'dept': 'الشحن الثقيل بين المدن', 'reg_exp': today + timedelta(days=300),
                'ins_exp': today + timedelta(days=250), 'insp_exp': today + timedelta(days=200)
            },
            {
                'fleet_no': 'FL-302', 'plate': 'م ن هـ 6077', 'vtype': vtypes['truck'], 'make': 'فولفو', 'model': 'FH16 540 Globetrotter',
                'year': 2024, 'color': 'أبيض ثلجي', 'vin': 'YV2RT40A9PB606006', 'engine': 'D16K540-119',
                'odometer': 64100, 'fuel': Vehicle.FuelType.DIESEL, 'status': Vehicle.Status.ACTIVE,
                'driver_idx': 5, 'dept': 'النقل المبرد للمستودعات', 'reg_exp': today + timedelta(days=210),
                'ins_exp': today + timedelta(days=180), 'insp_exp': today + timedelta(days=140)
            },
            {
                'fleet_no': 'FL-401', 'plate': 'و ي أ 7033', 'vtype': vtypes['bus'], 'make': 'تويوتا', 'model': 'كوستر 30 راكب',
                'year': 2023, 'color': 'أبيض مع خط أزرق', 'vin': 'JTEDB42P2P8707007', 'engine': '1HZ-420-994',
                'odometer': 72300, 'fuel': Vehicle.FuelType.DIESEL, 'status': Vehicle.Status.ACTIVE,
                'driver_idx': 7, 'dept': 'نقل الكوادر والموظفين', 'reg_exp': today + timedelta(days=140),
                'ins_exp': today + timedelta(days=110), 'insp_exp': today + timedelta(days=80)
            },
            {
                'fleet_no': 'FL-501', 'plate': 'ب ت ث 8022', 'vtype': vtypes['van'], 'make': 'فورد', 'model': 'ترانزيت كارجو فان مقفل',
                'year': 2023, 'color': 'أبيض ناصع', 'vin': '1FTYR2Y84PKA80808', 'engine': 'EcoBlue-20-41',
                'odometer': 49600, 'fuel': Vehicle.FuelType.DIESEL, 'status': Vehicle.Status.ACTIVE,
                'driver_idx': 0, 'dept': 'التوزيع والتوصيل السريع', 'reg_exp': today + timedelta(days=95),
                'ins_exp': today + timedelta(days=85), 'insp_exp': today + timedelta(days=70)
            },
            {
                'fleet_no': 'FL-502', 'plate': 'ج ح خ 9011', 'vtype': vtypes['van'], 'make': 'تويوتا', 'model': 'هايس مبرد ثلاجة',
                'year': 2022, 'color': 'أبيض', 'vin': 'JTFRH22P4N8909009', 'engine': '2TR-FE-612',
                'odometer': 118900, 'fuel': Vehicle.FuelType.GASOLINE_91, 'status': Vehicle.Status.OUT_OF_SERVICE,
                'driver_idx': None, 'dept': 'النقل والتوزيع', 'reg_exp': today - timedelta(days=40),
                'ins_exp': today - timedelta(days=10), 'insp_exp': today - timedelta(days=30),
                'notes': 'مركبة متوقفة بحاجة إلى صيانة شاملة لناقل الحركة وعمرة محرك'
            },
        ]

        created_vehicles = []
        for vd in vehicles_data:
            assigned_d = created_drivers[vd['driver_idx']] if vd['driver_idx'] is not None else None
            v, _ = Vehicle.objects.update_or_create(
                internal_fleet_number=vd['fleet_no'],
                defaults={
                    'plate_number': vd['plate'],
                    'vehicle_type': vd['vtype'],
                    'make': vd['make'],
                    'model': vd['model'],
                    'year': vd['year'],
                    'color': vd['color'],
                    'vin': vd['vin'],
                    'engine_number': vd['engine'],
                    'current_odometer': vd['odometer'],
                    'fuel_type': vd['fuel'],
                    'status': vd['status'],
                    'assigned_driver': assigned_d,
                    'department': vd['dept'],
                    'purchase_date': date(vd['year'], 1, 15),
                    'registration_expiry_date': vd['reg_exp'],
                    'insurance_expiry_date': vd['ins_exp'],
                    'periodic_inspection_expiry_date': vd['insp_exp'],
                    'notes': vd.get('notes', 'مركبة معتمدة في الأسطول التشغيلي')
                }
            )
            created_vehicles.append(v)

            # Record initial / current odometer reading history
            if not v.odometer_readings.exists():
                OdometerReading.objects.create(
                    vehicle=v,
                    reading=vd['odometer'] - 1200,
                    date_time=timezone.now() - timedelta(days=15),
                    source=OdometerReading.Source.INITIAL,
                    user=admin_user,
                    notes='قراءة افتتاحية مسجلة بالنظام'
                )
                OdometerReading.objects.create(
                    vehicle=v,
                    reading=vd['odometer'],
                    date_time=timezone.now() - timedelta(days=1),
                    source=OdometerReading.Source.MANUAL,
                    user=operator_user,
                    notes='قراءة فحص وتحديث دوري'
                )

            # Assign Driver history if assigned
            if assigned_d and not v.driver_assignments.exists():
                DriverAssignment.objects.create(
                    driver=assigned_d,
                    vehicle=v,
                    start_date=today - timedelta(days=60),
                    is_active=True,
                    assigned_by=operator_user,
                    notes='إسناد رسمي للمركبة'
                )

            # Add Vehicle Document
            if not v.documents.exists():
                VehicleDocument.objects.create(
                    vehicle=v,
                    doc_type=VehicleDocument.DocType.REGISTRATION,
                    document_number=f"REG-{v.internal_fleet_number}",
                    issue_date=today - timedelta(days=300),
                    expiry_date=vd['reg_exp'],
                    notes='استمارة سير المركبة'
                )
                VehicleDocument.objects.create(
                    vehicle=v,
                    doc_type=VehicleDocument.DocType.INSURANCE,
                    document_number=f"INS-{v.internal_fleet_number}",
                    issue_date=today - timedelta(days=300),
                    expiry_date=vd['ins_exp'],
                    notes='وثيقة تأمين شامل أسطول'
                )

        # 8. Configure Vehicle Parts & Intervals
        self.stdout.write('8. تركيب وجدولة قطع الغيار للمركبات...')
        # For each vehicle, attach essential parts with realistic past installations
        for v in created_vehicles:
            odo = v.current_odometer
            part_configs = [
                ('زيت المحرك التخليقي 10W-40', 10000, 180, odo - 8500), # depending on vehicle, some will be due soon
                ('فلتر زيت المحرك', 10000, 180, odo - 8500),
                ('فلتر هواء المحرك', 20000, 365, odo - 12000),
                ('فحمات الفرامل الأمامية', 30000, 365, odo - 29200 if v.internal_fleet_number == 'FL-101' else odo - 15000), # FL-101 will be DUE SOON on brake pads!
                ('طقم الإطارات (4 إطارات)', 50000, 730, odo - 51000 if v.internal_fleet_number == 'FL-202' else odo - 22000), # FL-202 will be OVERDUE on tires!
                ('بطارية المركبة 12V / 80Ah', 40000, 540, odo - 38800 if v.internal_fleet_number == 'FL-102' else odo - 18000), # FL-102 will be DUE SOON on battery!
                ('سائل تبريد المحرك (ماء الرديتر)', 40000, 365, odo - 10000),
            ]
            for part_name, interval_km, interval_days, inst_odo in part_configs:
                p_cat = created_parts.get(part_name)
                if not p_cat:
                    continue
                safe_inst_odo = max(inst_odo, 0)
                inst_date = today - timedelta(days=int((odo - safe_inst_odo) / 45)) # approx 45 km per day
                next_km = safe_inst_odo + interval_km
                next_date = inst_date + timedelta(days=interval_days)

                VehiclePart.objects.update_or_create(
                    vehicle=v,
                    part=p_cat,
                    defaults={
                        'part_number': f"PN-{v.internal_fleet_number}-{p_cat.id}",
                        'brand': 'أصلي وكالة OEM',
                        'installation_date': inst_date,
                        'installation_odometer': safe_inst_odo,
                        'interval_km': interval_km,
                        'interval_days': interval_days,
                        'next_replacement_km': next_km,
                        'next_replacement_date': next_date,
                    }
                )

        # 9. Maintenance Records
        self.stdout.write('9. سجلات الصيانة السابقة...')
        v1 = created_vehicles[0]
        v3 = created_vehicles[2]
        v5 = created_vehicles[4]

        MaintenanceRecord.objects.get_or_create(
            vehicle=v1,
            odometer=25000,
            maintenance_type=created_maint_types['صيانة دورية 10,000 كم (زيت وفلتر وفحص)'],
            defaults={
                'maintenance_date': today - timedelta(days=70),
                'description': 'تغيير زيت المحرك التخليقي وفلتر الزيت وفحص الإضاءة وضغط الإطارات',
                'cost': Decimal('480.00'),
                'service_provider': 'مركز بترومين إكسبريس - فرع التخصصي',
                'technician': 'أحمد رضوان',
                'status': MaintenanceRecord.Status.COMPLETED,
                'created_by': operator_user,
                'notes': 'تمت الصيانة بنجاح وحالة المحرك ممتازة'
            }
        )

        MaintenanceRecord.objects.get_or_create(
            vehicle=v3,
            odometer=30000,
            maintenance_type=created_maint_types['خدمة صيانة نظام الكبح والفرامل'],
            defaults={
                'maintenance_date': today - timedelta(days=45),
                'description': 'استبدال فحمات الفرامل الأمامية وخرط الهوبات وتغيير زيت الفرامل DOT 4',
                'cost': Decimal('750.00'),
                'service_provider': 'وكالة تويوتا - عبداللطيف جميل',
                'technician': 'م. طارق العسيري',
                'status': MaintenanceRecord.Status.COMPLETED,
                'created_by': admin_user,
                'notes': 'قطع أصلية مع ضمان 6 أشهر'
            }
        )

        MaintenanceRecord.objects.get_or_create(
            vehicle=v5,
            odometer=110000,
            maintenance_type=created_maint_types['صيانة دورية 20,000 كم (زيوت وفلاتر هواء)'],
            defaults={
                'maintenance_date': today - timedelta(days=30),
                'description': 'صيانة شاحنة ثقيلة: استبدال فلاتر الديزل وفلتر الهواء وزيت المحرك الديزل',
                'cost': Decimal('2400.00'),
                'service_provider': 'شركة الجفالي للسيارات والمعدات',
                'technician': 'م. كمال الدين',
                'status': MaintenanceRecord.Status.COMPLETED,
                'created_by': operator_user,
                'notes': 'فحص كمبيوتر وحالة التيربو سليمة'
            }
        )

        # 10. Work Permits & Trips
        self.stdout.write('10. أذونات التشغيل والرحلات...')
        # Completed Trip 1
        WorkPermit.objects.get_or_create(
            permit_number='WP-2026-0001',
            defaults={
                'vehicle': created_vehicles[0],
                'driver': created_drivers[0],
                'requesting_department': 'إدارة المشتريات والتوريد',
                'destination': 'الرياض -> الخرج -> حوطة بني تميم',
                'purpose': 'معاينة وفحص مستودعات التوزيع الإقليمية وتسليم وثائق المناقصة',
                'departure_date': today - timedelta(days=5),
                'departure_time': '08:00:00',
                'return_date': today - timedelta(days=5),
                'return_time': '17:30:00',
                'starting_odometer': 33800,
                'ending_odometer': 34500,
                'distance_traveled': 700,
                'status': WorkPermit.Status.COMPLETED,
                'created_by': operator_user,
                'approved_by': admin_user,
                'notes': 'تم إنجاز المهمة بنجاح وعودة المركبة بحالة ممتازة'
            }
        )

        # Completed Trip 2
        WorkPermit.objects.get_or_create(
            permit_number='WP-2026-0002',
            defaults={
                'vehicle': created_vehicles[4],
                'driver': created_drivers[4],
                'requesting_department': 'قطاع الشحن اللوجستي',
                'destination': 'مستودع الرياض المركزي -> ميناء الملك عبدالعزيز بالدمام',
                'purpose': 'نقل شحنة حاويات مواد خام ومعدات صناعية',
                'departure_date': today - timedelta(days=3),
                'departure_time': '06:00:00',
                'return_date': today - timedelta(days=2),
                'return_time': '20:00:00',
                'starting_odometer': 124500,
                'ending_odometer': 125400,
                'distance_traveled': 900,
                'status': WorkPermit.Status.COMPLETED,
                'created_by': operator_user,
                'approved_by': admin_user,
                'notes': 'رحلة شحن بضائع موثقة'
            }
        )

        # Active In-Progress Trip
        WorkPermit.objects.get_or_create(
            permit_number='WP-2026-0003',
            defaults={
                'vehicle': created_vehicles[2], # FL-201
                'driver': created_drivers[2], # أحمد الشهري
                'requesting_department': 'إدارة الصيانة الهندسية',
                'destination': 'الرياض -> القصيم (بريدة وعنيزة)',
                'purpose': 'دعم طوارئ وصيانة محطات الضخ الميدانية',
                'departure_date': today,
                'departure_time': '07:30:00',
                'starting_odometer': 42800,
                'status': WorkPermit.Status.IN_PROGRESS,
                'created_by': operator_user,
                'approved_by': admin_user,
                'notes': 'الرحلة جارية حالياً ومتابعة عبر الـ GPS'
            }
        )

        # Approved Trip (Waiting Departure)
        WorkPermit.objects.get_or_create(
            permit_number='WP-2026-0004',
            defaults={
                'vehicle': created_vehicles[5], # FL-302
                'driver': created_drivers[5], # راشد المري
                'requesting_department': 'التوزيع وسلاسل الإمداد',
                'destination': 'الرياض -> جدة (المستودع الرئيسي)',
                'purpose': 'نقل أدوية ومواد غذائية مبردة',
                'departure_date': today + timedelta(days=1),
                'status': WorkPermit.Status.APPROVED,
                'created_by': operator_user,
                'approved_by': admin_user,
                'notes': 'تم اعتماد مسار الرحلة وتخصيص السائق'
            }
        )

        # Draft Trip
        WorkPermit.objects.get_or_create(
            permit_number='WP-2026-0005',
            defaults={
                'vehicle': created_vehicles[7], # FL-501
                'driver': created_drivers[0],
                'requesting_department': 'خدمة العملاء والتوصيل',
                'destination': 'جولات التوزيع داخل مدينة الرياض (شمال وشرق الرياض)',
                'purpose': 'توصيل شحنات المستندات وطرود العملاء',
                'departure_date': today + timedelta(days=2),
                'status': WorkPermit.Status.DRAFT,
                'created_by': operator_user,
                'notes': 'بانتظار موافقة مدير الحركة'
            }
        )

        # 11. Fuel Records
        self.stdout.write('11. سجلات الوقود...')
        fuel_entries = [
            (created_vehicles[0], today - timedelta(days=5), 33800, Vehicle.FuelType.GASOLINE_91, Decimal('55.00'), Decimal('2.18'), 'محطة الدريس - مخرج 16', created_drivers[0]),
            (created_vehicles[0], today - timedelta(days=2), 34500, Vehicle.FuelType.GASOLINE_91, Decimal('60.00'), Decimal('2.18'), 'محطة ساسكو - طريق الخرج', created_drivers[0]),
            (created_vehicles[2], today - timedelta(days=4), 42000, Vehicle.FuelType.DIESEL, Decimal('80.00'), Decimal('1.15'), 'محطة نفط - الدائري الشرقي', created_drivers[2]),
            (created_vehicles[4], today - timedelta(days=3), 124500, Vehicle.FuelType.DIESEL, Decimal('320.00'), Decimal('1.15'), 'محطة التسهيلات - طريق الدمام', created_drivers[4]),
            (created_vehicles[4], today - timedelta(days=2), 125400, Vehicle.FuelType.DIESEL, Decimal('290.00'), Decimal('1.15'), 'محطة ساسكو بالميرا - الدمام', created_drivers[4]),
            (created_vehicles[6], today - timedelta(days=1), 72300, Vehicle.FuelType.DIESEL, Decimal('110.00'), Decimal('1.15'), 'محطة بترومين - طريق الملك خالد', created_drivers[7]),
        ]
        for v, dt, odo, ftype, qty, price, station, drv in fuel_entries:
            FuelRecord.objects.get_or_create(
                vehicle=v,
                date=dt,
                odometer=odo,
                defaults={
                    'fuel_type': ftype,
                    'quantity': qty,
                    'price_per_unit': price,
                    'total_cost': round(qty * price, 2),
                    'station': station,
                    'driver': drv,
                    'created_by': operator_user,
                    'notes': 'تعبئة منتظمة معتمدة ببطاقة الوقود الذكية'
                }
            )

        # 12. Audit Log Seed
        self.stdout.write('12. سجلات التدقيق الأولي...')
        AuditLog.objects.get_or_create(
            action=AuditLog.Action.LOGIN,
            module='المصادقة والأمان',
            object_repr='تسجيل دخول ناجح للنظام',
            object_id='admin',
            defaults={
                'user': admin_user,
                'details': {'auth_method': 'JWT', 'client': 'Mozilla/5.0 Enterprise Fleet Client'},
                'ip_address': '192.168.1.100'
            }
        )
        AuditLog.objects.get_or_create(
            action=AuditLog.Action.TRIP_START,
            module='أذونات التشغيل',
            object_repr='انطلاق رحلة العمل رقم WP-2026-0003',
            object_id='WP-2026-0003',
            defaults={
                'user': operator_user,
                'details': {'vehicle': 'FL-201', 'driver': 'أحمد الشهري', 'starting_odometer': 42800},
                'ip_address': '192.168.1.105'
            }
        )

        # 13. Run Maintenance Rule Engine across the entire fleet
        self.stdout.write('13. تشغيل محرك قواعد الصيانة وتوليد التنبيهات الذكية...')
        eval_results = MaintenanceRuleEngine.evaluate_fleet()
        self.stdout.write(f'تم تقييم {len(eval_results)} مركبة بنجاح وتوليد التنبيهات.')

        self.stdout.write(self.style.SUCCESS('تم بذر بيانات نظام أسطول بنجاح 100%!'))
        self.stdout.write(self.style.SUCCESS('بيانات تسجيل الدخول:'))
        self.stdout.write(self.style.SUCCESS('- مدير النظام (Admin): admin / Admin@123456'))
        self.stdout.write(self.style.SUCCESS('- مسؤول التشغيل (Operator): operator / Operator@123456'))
        self.stdout.write(self.style.SUCCESS('- مراقب التقارير (Reporter): reporter / Reporter@123456'))
