from django.db import models
from django.conf import settings
from core.models import TimeStampedModel, SoftDeleteModel


class Driver(SoftDeleteModel):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشط'
        ON_LEAVE = 'ON_LEAVE', 'في إجازة'
        SUSPENDED = 'SUSPENDED', 'موقوف عن العمل'
        TERMINATED = 'TERMINATED', 'منتهي الخدمة'

    full_name = models.CharField(max_length=255, verbose_name="الاسم الكامل")
    national_id = models.CharField(max_length=50, unique=True, verbose_name="رقم الهوية / الإقامة")
    phone = models.CharField(max_length=30, verbose_name="رقم الهاتف")
    license_number = models.CharField(max_length=50, unique=True, verbose_name="رقم رخصة القيادة")
    license_expiry_date = models.DateField(verbose_name="تاريخ انتهاء الرخصة")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, verbose_name="حالة السائق")
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات")

    class Meta:
        verbose_name = "سائق"
        verbose_name_plural = "السائقون"
        ordering = ['full_name']

    def __str__(self):
        return f"{self.full_name} ({self.national_id})"

    @property
    def current_vehicle(self):
        assignment = self.assignments.filter(is_active=True).first()
        return assignment.vehicle if assignment else None


class DriverAssignment(TimeStampedModel):
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name="السائق"
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='driver_assignments',
        verbose_name="المركبة"
    )
    start_date = models.DateField(verbose_name="تاريخ بدء الإسناد")
    end_date = models.DateField(null=True, blank=True, verbose_name="تاريخ انتهاء الإسناد")
    is_active = models.BooleanField(default=True, verbose_name="إسناد نشط حالياً")
    notes = models.TextField(blank=True, default="", verbose_name="ملاحظات")
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="المسؤول عن الإسناد"
    )

    class Meta:
        verbose_name = "إسناد سائق"
        verbose_name_plural = "سجلات إسناد السائقين"
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.driver.full_name} -> {self.vehicle.plate_number} ({'نشط' if self.is_active else 'منتهي'})"
