from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError('اسم المستخدم مطلوب')
        email = self.normalize_email(email) if email else ''
        user = self.model(username=username, email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('المسؤول يجب أن يملك is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('المسؤول يجب أن يملك is_superuser=True')

        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'مدير النظام (Admin)'
        OPERATOR = 'OPERATOR', 'مسؤول التشغيل (Operator)'
        REPORTER = 'REPORTER', 'مراقب التقارير (Reporter)'

    username = models.CharField(max_length=150, unique=True, verbose_name="اسم المستخدم")
    email = models.EmailField(blank=True, default="", verbose_name="البريد الإلكتروني")
    full_name = models.CharField(max_length=255, verbose_name="الاسم الكامل")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.OPERATOR, verbose_name="الدور")
    phone = models.CharField(max_length=20, blank=True, default="", verbose_name="رقم الهاتف")
    department = models.CharField(max_length=100, blank=True, default="", verbose_name="القسم")
    
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    is_staff = models.BooleanField(default=False, verbose_name="موظف لوحة التحكم")
    date_joined = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الانضمام")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التحديث")

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        verbose_name = "مستخدم"
        verbose_name_plural = "المستخدمون"
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.full_name} ({self.username}) - {self.get_role_display()}"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    @property
    def is_operator(self):
        return self.role == self.Role.OPERATOR

    @property
    def is_reporter(self):
        return self.role == self.Role.REPORTER
