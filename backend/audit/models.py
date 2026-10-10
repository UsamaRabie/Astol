from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'CREATE', 'إنشاء'
        UPDATE = 'UPDATE', 'تعديل'
        DELETE = 'DELETE', 'حذف'
        STATUS_CHANGE = 'STATUS_CHANGE', 'تغيير حالة'
        ODOMETER_UPDATE = 'ODOMETER_UPDATE', 'تحديث عداد'
        TRIP_START = 'TRIP_START', 'بدء رحلة'
        TRIP_COMPLETE = 'TRIP_COMPLETE', 'إتمام رحلة'
        TRIP_CANCEL = 'TRIP_CANCEL', 'إلغاء رحلة'
        MAINTENANCE_RECORD = 'MAINTENANCE_RECORD', 'تسجيل صيانة'
        PART_REPLACEMENT = 'PART_REPLACEMENT', 'استبدال قطعة'
        LOGIN = 'LOGIN', 'تسجيل دخول'
        LOGOUT = 'LOGOUT', 'تسجيل خروج'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name="المستخدم"
    )
    action = models.CharField(max_length=50, choices=Action.choices, verbose_name="نوع الإجراء")
    module = models.CharField(max_length=100, verbose_name="النظام / الوحدة")
    object_repr = models.CharField(max_length=255, verbose_name="وصف الكائن")
    object_id = models.CharField(max_length=100, blank=True, default="", verbose_name="معرّف الكائن")
    details = models.JSONField(default=dict, blank=True, verbose_name="التفاصيل والتغييرات")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="عنوان IP")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="وقت العملية")

    class Meta:
        verbose_name = "سجل تدقيق"
        verbose_name_plural = "سجلات التدقيق"
        ordering = ['-timestamp']

    def __str__(self):
        user_str = self.user.full_name if self.user else "نظام"
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {user_str} - {self.get_action_display()} - {self.module} - {self.object_repr}"
