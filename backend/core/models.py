from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Abstract model with created_at and updated_at timestamps"""
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التحديث")

    class Meta:
        abstract = True


class SoftDeleteModel(TimeStampedModel):
    """Abstract model supporting soft deletion"""
    is_deleted = models.BooleanField(default=False, verbose_name="محذوف")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الحذف")

    class Meta:
        abstract = True

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save()


class SystemSetting(TimeStampedModel):
    """Configurable system settings such as maintenance alert thresholds"""
    key = models.CharField(max_length=100, unique=True, verbose_name="مفتاح الإعداد")
    value = models.CharField(max_length=255, verbose_name="القيمة")
    description = models.TextField(blank=True, default="", verbose_name="الوصف")

    class Meta:
        verbose_name = "إعداد نظام"
        verbose_name_plural = "إعدادات النظام"
        ordering = ['key']

    def __str__(self):
        return f"{self.key}: {self.value}"

    @classmethod
    def get_setting(cls, key, default=None):
        try:
            setting = cls.objects.get(key=key)
            return setting.value
        except cls.DoesNotExist:
            return default

    @classmethod
    def get_int(cls, key, default=0):
        val = cls.get_setting(key, default)
        try:
            return int(val)
        except (ValueError, TypeError):
            return default
