from django.db import models
from django.utils import timezone
from core.models import TimeStampedModel


class VehicleAlert(TimeStampedModel):
    class Severity(models.TextChoices):
        NORMAL = 'NORMAL', 'عادي'
        WARNING = 'WARNING', 'تحذير'
        CRITICAL = 'CRITICAL', 'حرج'

    class AlertType(models.TextChoices):
        MAINTENANCE_OVERDUE = 'MAINTENANCE_OVERDUE', 'صيانة متأخرة'
        MAINTENANCE_DUE_SOON = 'MAINTENANCE_DUE_SOON', 'صيانة مستحقة قريباً'
        MAINTENANCE_UPCOMING = 'MAINTENANCE_UPCOMING', 'صيانة قادمة'
        DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED', 'وثيقة منتهية الصلاحية'
        DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING', 'وثيقة تقترب من الانتهاء'
        LICENSE_EXPIRING = 'LICENSE_EXPIRING', 'رخصة سائق تقترب من الانتهاء'
        ODOMETER_ANOMALY = 'ODOMETER_ANOMALY', 'ملاحظة على قراءة العداد'
        SYSTEM = 'SYSTEM', 'إشعار نظام'

    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='alerts',
        null=True,
        blank=True,
        verbose_name="المركبة"
    )
    alert_type = models.CharField(max_length=50, choices=AlertType.choices, verbose_name="نوع التنبيه")
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.NORMAL, verbose_name="مستوى الأهمية")
    title = models.CharField(max_length=255, verbose_name="عنوان التنبيه")
    message = models.TextField(verbose_name="نص التنبيه")
    
    is_read = models.BooleanField(default=False, verbose_name="تمت القراءة")
    is_resolved = models.BooleanField(default=False, verbose_name="تمت المعالجة")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ المعالجة")

    class Meta:
        verbose_name = "تنبيه مركبة"
        verbose_name_plural = "تنبيهات المركبات"
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_severity_display()}] {self.title}"

    def resolve(self):
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.save()
