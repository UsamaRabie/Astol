from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('vehicles.urls')),
    path('api/', include('drivers.urls')),
    path('api/', include('work_permits.urls')),
    path('api/', include('parts.urls')),
    path('api/', include('maintenance.urls')),
    path('api/', include('fuel.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('audit.urls')),
    path('api/', include('reports.urls')),
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
