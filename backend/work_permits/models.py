import uuid
from django.db import models, transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TimeStampedModel, SoftDeleteModel
from vehicles.models import Vehicle, OdometerReading
from drivers.models import Driver


class WorkPermit(SoftDeleteModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        APPROVED = 'APPROVED', 'معتمد'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ (في الرحلة)'
        COMPLETED = 'COMPLETED', 'مكتمل'
        CANCELLED = 'CANCELLED', 'ملغي'

    permit_number = models.CharField(max_length=50, unique=True, verbose_name="رقم إذن التشغيل")
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name='work_permits',
        verbose_name="المركبة"
    )
    driver = models.ForeignKey(
        Driver,
        on_delete=models.PROTECT,
        related_name='work_permits',
        verbose_name="السائق"
    )
    requesting_department = models.CharField(max_length=150, verbose_name="الجهة / القسم الطالب")
    departure_location = models.CharField(max_length=255, default="المقر الرئيسي", verbose_name="مكان انطلاق الرحلة")
    destination = models.CharField(max_length=255, verbose_name="الوجهة / مسار الرحلة")
    purpose = models.CharField(max_length=255, verbose_name="الغرض من الرحلة / المهمة")
    description = models.TextField(blank=True, default="", verbose_name="تفاصيل إضافية")

    # Planned / Actual Timings
    departure_date = models.DateField(default=timezone.now, verbose_name="تاريخ الانطلاق")
    departure_time = models.TimeField(null=True, blank=True, verbose_name="وقت الانطلاق الفعلي")
    return_date = models.DateField(null=True, blank=True, verbose_name="تاريخ العودة")
    return_time = models.TimeField(null=True, blank=True, verbose_name="وقت العودة الفعلي")

    # Odometers
    starting_odometer = models.PositiveIntegerField(null=True, blank=True, verbose_name="قراءة عداد البداية (كم)")
    ending_odometer = models.PositiveIntegerField(null=True, blank=True, verbose_name="قراءة عداد العودة (كم)")
    distance_traveled = models.PositiveIntegerField(default=0, verbose_name="المسافة المقطوعة (كم)")

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT, verbose_name="حالة الإذن")
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_permits',
        verbose_name="مُنشئ الإذن"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_permits',
        verbose_name="المسؤول المعتمد"
    )
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات ختامية")

    class Meta:
        verbose_name = "إذن تشغيل / رحلة"
        verbose_name_plural = "أذونات التشغيل والرحلات"
        ordering = ['-departure_date', '-created_at']

    def __str__(self):
        return f"[{self.permit_number}] {self.vehicle.plate_number} - {self.destination} ({self.get_status_display()})"

    @classmethod
    def generate_permit_number(cls):
        year = timezone.now().year
        count = cls.objects.filter(permit_number__startswith=f"WP-{year}").count() + 1
        return f"WP-{year}-{count:04d}"

    def approve(self, user=None):
        if self.status != self.Status.DRAFT:
            raise ValidationError("يمكن اعتماد أذونات التشغيل في حالة المسودة فقط")
        self.status = self.Status.APPROVED
        self.approved_by = user
        self.save(update_fields=['status', 'approved_by', 'updated_at'])

    @transaction.atomic
    def start_trip(self, departure_time=None, starting_odometer=None, user=None):
        """
        Transitions permit to IN_PROGRESS.
        Validates vehicle readiness.
        """
        if self.status not in [self.Status.DRAFT, self.Status.APPROVED]:
            raise ValidationError(f"لا يمكن بدء الرحلة لإذن بحالة {self.get_status_display()}")

        # Check vehicle operational status
        if self.vehicle.status == Vehicle.Status.OUT_OF_SERVICE:
            raise ValidationError("لا يمكن بدء رحلة لمركبة بحالة (خارج الخدمة)")
        if self.vehicle.status == Vehicle.Status.IN_MAINTENANCE:
            raise ValidationError("المركبة قيد الصيانة حالياً ولا يمكن استخدامها")

        # Check if vehicle has another running permit
        active_permits = WorkPermit.objects.filter(
            vehicle=self.vehicle,
            status=self.Status.IN_PROGRESS
        ).exclude(pk=self.pk)
        if active_permits.exists():
            raise ValidationError(f"المركبة مرتبطة حالياً بإذن تشغيل قيد التنفيذ رقم ({active_permits.first().permit_number})")

        current_km = self.vehicle.current_odometer
        if starting_odometer is not None:
            if starting_odometer < current_km:
                raise ValidationError(f"عداد البداية ({starting_odometer} كم) لا يمكن أن يكون أقل من عداد المركبة الحالي ({current_km} كم)")
            self.starting_odometer = starting_odometer
        else:
            self.starting_odometer = current_km

        now = timezone.now()
        self.departure_date = now.date()
        self.departure_time = departure_time or now.time()
        self.status = self.Status.IN_PROGRESS
        self.save()

    @transaction.atomic
    def complete_trip(self, ending_odometer, return_time=None, return_date=None, notes="", user=None):
        """
        Completes the trip:
        - Validates ending_odometer >= starting_odometer
        - Computes distance_traveled
        - Updates vehicle odometer & creates OdometerReading
        - Re-evaluates vehicle maintenance rules
        """
        if self.status not in [self.Status.IN_PROGRESS, self.Status.APPROVED]:
            raise ValidationError("يمكن إنهاء الرحلات التي تكون في حالة (قيد التنفيذ) أو (معتمد) فقط")

        if self.starting_odometer is None:
            self.starting_odometer = self.vehicle.current_odometer
        if not self.departure_time:
            self.departure_time = timezone.now().time()

        if ending_odometer < self.starting_odometer:
            raise ValidationError(
                f"قراءة عداد العودة ({ending_odometer} كم) لا يمكن أن تكون أقل من قراءة عداد البداية ({self.starting_odometer} كم)"
            )

        now = timezone.now()
        self.return_date = return_date or now.date()
        self.return_time = return_time or now.time()
        self.ending_odometer = ending_odometer
        self.distance_traveled = ending_odometer - self.starting_odometer
        self.status = self.Status.COMPLETED
        if notes:
            self.notes = f"{self.notes}\n{notes}".strip()
        self.save()

        # Update vehicle odometer safely
        self.vehicle.update_odometer(
            new_reading=ending_odometer,
            source=OdometerReading.Source.TRIP,
            user=user,
            notes=f"إتمام إذن التشغيل رقم {self.permit_number} - المسافة المقطوعة: {self.distance_traveled} كم"
        )

        # Trigger Maintenance Rule Engine
        from maintenance.services import MaintenanceRuleEngine
        MaintenanceRuleEngine.evaluate_vehicle(self.vehicle)

    def cancel(self, notes=""):
        if self.status == self.Status.COMPLETED:
            raise ValidationError("لا يمكن إلغاء إذن تشغيل مكتمل")
        self.status = self.Status.CANCELLED
        if notes:
            self.notes = f"{self.notes}\n[تم الإلغاء]: {notes}".strip()
        self.save(update_fields=['status', 'notes', 'updated_at'])
