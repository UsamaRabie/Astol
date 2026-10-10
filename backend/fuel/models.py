from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TimeStampedModel, SoftDeleteModel
from vehicles.models import Vehicle, OdometerReading
from drivers.models import Driver


class FuelType(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True, verbose_name="نوع الوقود")
    price_per_liter = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('2.18'), verbose_name="سعر اللتر")
    currency = models.CharField(max_length=20, default="ر.س", verbose_name="العملة")
    description = models.TextField(blank=True, default="", verbose_name="الوصف")

    class Meta:
        verbose_name = "نوع وقود"
        verbose_name_plural = "أنواع الوقود"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.price_per_liter} {self.currency}/لتر)"


class FuelRecord(SoftDeleteModel):
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='fuel_records',
        verbose_name="المركبة"
    )
    date = models.DateField(default=timezone.now, verbose_name="تاريخ التعبئة")
    odometer = models.PositiveIntegerField(verbose_name="قراءة العداد عند التعبئة (كم)")
    fuel_type = models.CharField(
        max_length=100,
        default="ديزل",
        verbose_name="نوع الوقود"
    )
    quantity = models.DecimalField(max_digits=8, decimal_places=2, verbose_name="الكمية باللتر")
    price_per_unit = models.DecimalField(max_digits=6, decimal_places=2, verbose_name="سعر اللتر (ر.س)")
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="التكلفة الإجمالية (ر.س)")
    station = models.CharField(max_length=150, blank=True, default="", verbose_name="محطة الوقود")
    driver = models.ForeignKey(
        Driver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fuel_records',
        verbose_name="السائق"
    )
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="مسؤول الإدخال"
    )

    class Meta:
        verbose_name = "سجل تعبئة وقود"
        verbose_name_plural = "سجلات الوقود"
        ordering = ['-date', '-odometer']

    def __str__(self):
        return f"{self.vehicle.internal_fleet_number} - {self.quantity} لتر ({self.total_cost} ر.س) في {self.date}"

    def clean(self):
        super().clean()
        if self.quantity and self.price_per_unit:
            self.total_cost = round(Decimal(str(self.quantity)) * Decimal(str(self.price_per_unit)), 2)

    def save(self, *args, **kwargs):
        if self.quantity and self.price_per_unit and not self.total_cost:
            self.total_cost = round(Decimal(str(self.quantity)) * Decimal(str(self.price_per_unit)), 2)

        is_new = self.pk is None
        super().save(*args, **kwargs)

        # If odometer reading is greater than vehicle's current reading, update it
        if is_new and self.odometer > self.vehicle.current_odometer:
            self.vehicle.update_odometer(
                new_reading=self.odometer,
                source=OdometerReading.Source.FUEL,
                user=self.created_by,
                notes=f"تعبئة وقود: {self.quantity} لتر بمحطة {self.station}"
            )
