from rest_framework import serializers
from .models import SystemSetting


class CleanNullFieldsMixin:
    """
    Sanitizes incoming JSON payload:
    - Replaces null with "" for optional CharField/TextField fields with allow_blank=True.
    - Replaces "" with None for optional DateField, TimeField, DateTimeField.
    - Replaces "" with default or None for optional numeric fields.
    """
    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        for k, f in self.fields.items():
            if k in data:
                v = data[k]
                if isinstance(f, serializers.CharField):
                    if (getattr(f, 'allow_blank', False) or getattr(f, 'allow_null', False)) and v is None:
                        data[k] = ''
                elif isinstance(f, (serializers.DateField, serializers.TimeField, serializers.DateTimeField)):
                    if v == '' or v is None:
                        data[k] = None
                elif isinstance(f, (serializers.DecimalField, serializers.IntegerField, serializers.FloatField)):
                    if v == '' or v is None:
                        if getattr(f, 'default', serializers.empty) is not serializers.empty and f.default is not None:
                            data[k] = f.default
                        elif getattr(f, 'allow_null', False) or not f.required:
                            data[k] = None
        return super().to_internal_value(data)


class SystemSettingSerializer(CleanNullFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description', 'updated_at']
