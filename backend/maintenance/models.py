from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import TimeStampedModel, SoftDeleteModel


class MaintenanceType(TimeStampedModel):
    name = models.CharField(max_length=150, unique=True, verbose_name="نوع الصيانة")
    description = models.TextField(blank=True, default="", verbose_name="الوصف")
    is_periodic = models.BooleanField(default=True, verbose_name="صيانة دورية")
    recommended_km = models.PositiveIntegerField(default=10000, verbose_name="المسافة المقترحة (كم)")
    recommended_days = models.PositiveIntegerField(default=180, verbose_name="المدة المقترحة (أيام)")

    class Meta:
        verbose_name = "نوع الصيانة"
        verbose_name_plural = "أنواع الصيانة"
        ordering = ['name']

    def __str__(self):
        return self.name


class MaintenanceRecord(SoftDeleteModel):
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'مجدولة'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        COMPLETED = 'COMPLETED', 'مكتملة'
        CANCELLED = 'CANCELLED', 'ملغاة'

    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='maintenance_records',
        verbose_name="المركبة"
    )
    maintenance_type = models.ForeignKey(
        MaintenanceType,
        on_delete=models.PROTECT,
        related_name='records',
        verbose_name="نوع الصيانة"
    )
    maintenance_date = models.DateField(default=timezone.now, verbose_name="تاريخ الصيانة")
    odometer = models.PositiveIntegerField(verbose_name="قراءة العداد عند الصيانة (كم)")
    description = models.TextField(blank=True, default="", verbose_name="تفاصيل الصيانة والأعمال المنجزة")
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="التكلفة الإجمالية (ر.س)")
    service_provider = models.CharField(max_length=200, blank=True, default="", verbose_name="مزود الخدمة / الورشة / الوكالة")
    technician = models.CharField(max_length=150, blank=True, default="", verbose_name="اسم الفني / المهندس")
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات إضافية")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.COMPLETED, verbose_name="حالة الصيانة")
    
    parts_replaced = models.ManyToManyField(
        'parts.VehiclePart',
        blank=True,
        related_name='maintenance_events',
        verbose_name="القطع المستبدلة"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="المسؤول المدخل"
    )

    class Meta:
        verbose_name = "سجل صيانة"
        verbose_name_plural = "سجلات الصيانة"
        ordering = ['-maintenance_date', '-odometer']

    def __str__(self):
        return f"{self.vehicle.internal_fleet_number} - {self.maintenance_type.name} ({self.maintenance_date}) - {self.cost} ر.س"
