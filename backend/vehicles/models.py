from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TimeStampedModel, SoftDeleteModel


class VehicleType(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True, verbose_name="نوع المركبة")
    description = models.TextField(blank=True, default="", verbose_name="الوصف")
    icon = models.CharField(max_length=50, blank=True, default="truck", verbose_name="أيقونة")

    class Meta:
        verbose_name = "تصنيف المركبة"
        verbose_name_plural = "تصنيفات المركبات"
        ordering = ['name']

    def __str__(self):
        return self.name


class Vehicle(SoftDeleteModel):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشطة (في الخدمة)'
        IN_MAINTENANCE = 'IN_MAINTENANCE', 'في الصيانة'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'خارج الخدمة'
        RETIRED = 'RETIRED', 'مستبعدة / خردة'

    class FuelType(models.TextChoices):
        GASOLINE_91 = 'GASOLINE_91', 'بنزين 91'
        GASOLINE_95 = 'GASOLINE_95', 'بنزين 95'
        DIESEL = 'DIESEL', 'ديزل'
        ELECTRIC = 'ELECTRIC', 'كهربائي'
        HYBRID = 'HYBRID', 'هجين'

    internal_fleet_number = models.CharField(max_length=50, unique=True, verbose_name="الرقم الداخلي للأسطول")
    plate_number = models.CharField(max_length=50, unique=True, verbose_name="رقم اللوحة")
    vehicle_type = models.ForeignKey(
        VehicleType,
        on_delete=models.PROTECT,
        related_name='vehicles',
        verbose_name="نوع المركبة"
    )
    make = models.CharField(max_length=100, verbose_name="الشركة الصانعة")
    model = models.CharField(max_length=100, verbose_name="طراز المركبة")
    year = models.PositiveIntegerField(verbose_name="سنة الصنع")
    color = models.CharField(max_length=50, verbose_name="اللون")
    vin = models.CharField(max_length=100, unique=True, verbose_name="رقم الهيكل (VIN)")
    engine_number = models.CharField(max_length=100, blank=True, default="", verbose_name="رقم المحرك")
    
    current_odometer = models.PositiveIntegerField(default=0, verbose_name="قراءة العداد الحالية (كم)")
    fuel_type = models.CharField(max_length=30, choices=FuelType.choices, default=FuelType.DIESEL, verbose_name="نوع الوقود")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE, verbose_name="حالة المركبة")
    
    assigned_driver = models.ForeignKey(
        'drivers.Driver',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_vehicles',
        verbose_name="السائق المعين"
    )
    department = models.CharField(max_length=100, blank=True, default="", verbose_name="القسم / الإدارة")
    purchase_date = models.DateField(null=True, blank=True, verbose_name="تاريخ الشراء")
    registration_expiry_date = models.DateField(null=True, blank=True, verbose_name="تاريخ انتهاء الاستمارة")
    insurance_expiry_date = models.DateField(null=True, blank=True, verbose_name="تاريخ انتهاء التأمين")
    periodic_inspection_expiry_date = models.DateField(null=True, blank=True, verbose_name="تاريخ انتهاء الفحص الدوري")
    
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات")

    class Meta:
        verbose_name = "مركبة"
        verbose_name_plural = "المركبات"
        ordering = ['internal_fleet_number']

    def __str__(self):
        return f"[{self.internal_fleet_number}] {self.make} {self.model} ({self.plate_number})"

    def clean(self):
        super().clean()
        # Ensure that odometer does not decrease below recorded history
        if self.pk:
            latest_reading = self.odometer_readings.order_by('-reading').first()
            if latest_reading and self.current_odometer < latest_reading.reading:
                raise ValidationError({
                    'current_odometer': f'لا يمكن أن تكون قراءة العداد ({self.current_odometer}) أقل من آخر قراءة مسجلة ({latest_reading.reading} كم)'
                })

    def update_odometer(self, new_reading, source='MANUAL', user=None, notes="", date_time=None):
        """
        Safe method to update the vehicle's odometer and record history.
        Enforces strict non-decreasing business rule.
        """
        if new_reading < self.current_odometer:
            raise ValidationError(
                f"قراءة العداد الجديدة ({new_reading} كم) لا يمكن أن تكون أقل من القراءة الحالية ({self.current_odometer} كم)"
            )

        previous_reading = self.current_odometer
        self.current_odometer = new_reading
        self.save(update_fields=['current_odometer', 'updated_at'])

        # Record in history
        reading_entry = OdometerReading.objects.create(
            vehicle=self,
            reading=new_reading,
            date_time=date_time or timezone.now(),
            source=source,
            user=user,
            notes=notes or f"تحديث من {previous_reading} إلى {new_reading} كم ({source})"
        )
        return reading_entry


class OdometerReading(TimeStampedModel):
    class Source(models.TextChoices):
        MANUAL = 'MANUAL', 'تحديث يدوي'
        TRIP = 'TRIP', 'رحلة عمل (إذن تشغيل)'
        MAINTENANCE = 'MAINTENANCE', 'عملية صيانة'
        FUEL = 'FUEL', 'تعبئة وقود'
        INITIAL = 'INITIAL', 'قراءة افتتاحية'

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='odometer_readings',
        verbose_name="المركبة"
    )
    reading = models.PositiveIntegerField(verbose_name="قراءة العداد (كم)")
    date_time = models.DateTimeField(default=timezone.now, verbose_name="تاريخ ووقت القراءة")
    source = models.CharField(max_length=30, choices=Source.choices, default=Source.MANUAL, verbose_name="المصدر")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="المستخدم المسجل"
    )
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات")

    class Meta:
        verbose_name = "سجل قراءة العداد"
        verbose_name_plural = "سجل قراءات العداد"
        ordering = ['-date_time', '-id']

    def __str__(self):
        return f"{self.vehicle.internal_fleet_number} - {self.reading:,} كم ({self.get_source_display()})"


class VehicleDocument(TimeStampedModel):
    class DocType(models.TextChoices):
        REGISTRATION = 'REGISTRATION', 'استمارة المركبة'
        INSURANCE = 'INSURANCE', 'وثيقة التأمين'
        PERIODIC_INSPECTION = 'PERIODIC_INSPECTION', 'شهادة الفحص الدوري'
        OPERATION_CARD = 'OPERATION_CARD', 'بطاقة التشغيل'
        OTHER = 'OTHER', 'أخرى'

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name="المركبة"
    )
    doc_type = models.CharField(max_length=50, choices=DocType.choices, verbose_name="نوع الوثيقة")
    document_number = models.CharField(max_length=100, blank=True, default="", verbose_name="رقم الوثيقة")
    issue_date = models.DateField(null=True, blank=True, verbose_name="تاريخ الإصدار")
    expiry_date = models.DateField(verbose_name="تاريخ الانتهاء")
    file = models.FileField(upload_to='vehicle_docs/', null=True, blank=True, verbose_name="ملف الوثيقة")
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات")

    class Meta:
        verbose_name = "وثيقة مركبة"
        verbose_name_plural = "وثائق المركبات"
        ordering = ['expiry_date']

    def __str__(self):
        return f"{self.vehicle.internal_fleet_number} - {self.get_doc_type_display()} (تنتهي في {self.expiry_date})"

    @property
    def is_expired(self):
        return self.expiry_date < timezone.now().date()

    @property
    def days_until_expiry(self):
        return (self.expiry_date - timezone.now().date()).days
