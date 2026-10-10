from django.db import models
from django.utils import timezone
from datetime import timedelta
from core.models import TimeStampedModel, SoftDeleteModel


class PartCatalog(TimeStampedModel):
    class Category(models.TextChoices):
        ENGINE = 'ENGINE', 'المحرك وملحقاته'
        BRAKES = 'BRAKES', 'نظام الفرامل'
        SUSPENSION = 'SUSPENSION', 'نظام التعليق والإطارات'
        ELECTRICAL = 'ELECTRICAL', 'النظام الكهربائي والبطاريات'
        FLUIDS = 'FLUIDS', 'الزيوت والسوائل'
        FILTERS = 'FILTERS', 'الفلاتر والمرشحات'
        TRANSMISSION = 'TRANSMISSION', 'ناقل الحركة'
        COOLING = 'COOLING', 'نظام التبريد'
        BODY = 'BODY', 'الهيكل والإكسسوارات'
        OTHER = 'OTHER', 'أخرى'

    name = models.CharField(max_length=150, unique=True, verbose_name="اسم قطعة الغيار")
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.OTHER, verbose_name="الفئة")
    default_interval_km = models.PositiveIntegerField(default=10000, verbose_name="الفاصل الافتراضي بالكيلومتر (تتغير كل كام كم)")
    warning_threshold_km = models.PositiveIntegerField(default=1000, verbose_name="عتبة التحذير للسماحية قبل موعد التغيير (كم)")
    default_interval_days = models.PositiveIntegerField(default=180, verbose_name="الفاصل الافتراضي بالأيام")
    unit = models.CharField(max_length=30, default="قطعة", verbose_name="وحدة القياس")
    description = models.TextField(blank=True, default="", verbose_name="الوصف والمواصفات")

    class Meta:
        verbose_name = "قطعة غيار في الكتالوج"
        verbose_name_plural = "كتالوج قطع الغيار"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class VehiclePart(TimeStampedModel):
    class HealthStatus(models.TextChoices):
        OK = 'OK', 'سليم'
        UPCOMING = 'UPCOMING', 'قادم'
        DUE_SOON = 'DUE_SOON', 'مستحق قريباً'
        OVERDUE = 'OVERDUE', 'متأخر الصيانة'

    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='parts',
        verbose_name="المركبة"
    )
    part = models.ForeignKey(
        PartCatalog,
        on_delete=models.PROTECT,
        related_name='vehicle_installations',
        verbose_name="قطعة الغيار"
    )
    part_number = models.CharField(max_length=100, blank=True, default="", verbose_name="الرقم التسلسلي للقطعة")
    brand = models.CharField(max_length=100, blank=True, default="", verbose_name="الماركة / الشركة المصنعة")
    
    installation_date = models.DateField(default=timezone.now, verbose_name="تاريخ التركيب")
    installation_odometer = models.PositiveIntegerField(default=0, verbose_name="قراءة العداد عند التركيب (كم)")
    
    interval_km = models.PositiveIntegerField(default=10000, verbose_name="فاصل الاستبدال بالكيلومتر")
    interval_days = models.PositiveIntegerField(default=180, verbose_name="فاصل الاستبدال بالأيام")
    
    next_replacement_km = models.PositiveIntegerField(verbose_name="قراءة العداد القادمة للاستبدال")
    next_replacement_date = models.DateField(verbose_name="تاريخ الاستبدال القادم")
    
    current_status = models.CharField(max_length=30, choices=HealthStatus.choices, default=HealthStatus.OK, verbose_name="الحالة التشغيلية")
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات")

    class Meta:
        verbose_name = "قطعة مركبة"
        verbose_name_plural = "قطع غيار المركبات"
        unique_together = ('vehicle', 'part')
        ordering = ['next_replacement_km']

    def __str__(self):
        return f"{self.vehicle.internal_fleet_number} - {self.part.name} ({self.get_current_status_display()})"

    def save(self, *args, **kwargs):
        if not self.next_replacement_km:
            self.next_replacement_km = self.installation_odometer + self.interval_km
        if not self.next_replacement_date:
            self.next_replacement_date = self.installation_date + timedelta(days=self.interval_days)
        super().save(*args, **kwargs)

    def calculate_health(self, current_odometer=None, due_soon_km=1000, due_soon_days=14, upcoming_km=2500, upcoming_days=30):
        """
        Calculates and updates status based on odometer and date.
        """
        today = timezone.now().date()
        if current_odometer is None:
            current_odometer = self.vehicle.current_odometer

        remaining_km = self.next_replacement_km - current_odometer
        remaining_days = (self.next_replacement_date - today).days

        if remaining_km <= 0 or remaining_days <= 0:
            status = self.HealthStatus.OVERDUE
        elif remaining_km <= due_soon_km or remaining_days <= due_soon_days:
            status = self.HealthStatus.DUE_SOON
        elif remaining_km <= upcoming_km or remaining_days <= upcoming_days:
            status = self.HealthStatus.UPCOMING
        else:
            status = self.HealthStatus.OK

        self.current_status = status
        return {
            'status': status,
            'remaining_km': remaining_km,
            'remaining_days': remaining_days,
            'next_replacement_km': self.next_replacement_km,
            'next_replacement_date': self.next_replacement_date,
        }

    def record_replacement(self, new_odometer, replacement_date=None, notes=""):
        """Resets the part after replacement"""
        date = replacement_date or timezone.now().date()
        self.installation_date = date
        self.installation_odometer = new_odometer
        self.next_replacement_km = new_odometer + self.interval_km
        self.next_replacement_date = date + timedelta(days=self.interval_days)
        self.current_status = self.HealthStatus.OK
        if notes:
            self.notes = f"{self.notes}\n[تم الاستبدال في {date} عند العداد {new_odometer} كم]: {notes}".strip()
        self.save()
