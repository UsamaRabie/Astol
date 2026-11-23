import os
import mimetypes
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend' / 'dist' / 'astol-frontend' / 'browser'

def serve_spa(request, path=''):
    file_path = FRONTEND_DIR / path
    if path and file_path.is_file():
        if path.endswith('.js'):
            mime_type = 'application/javascript'
        elif path.endswith('.css'):
            mime_type = 'text/css'
        elif path.endswith('.ico'):
            mime_type = 'image/x-icon'
        elif path.endswith('.json'):
            mime_type = 'application/json'
        else:
            mime_type, _ = mimetypes.guess_type(str(file_path))
        with open(file_path, 'rb') as f:
            return HttpResponse(f.read(), content_type=mime_type or 'application/octet-stream')

    index_file = FRONTEND_DIR / 'index.html'
    if index_file.is_file():
        with open(index_file, 'rb') as f:
            return HttpResponse(f.read(), content_type='text/html')

    return HttpResponse("Frontend build not found. Run 'npm run build' inside frontend directory.", status=404)

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
    path('api/ai-assistant/', include('ai_assistant.urls')),
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    re_path(r'^(?P<path>.*)$', serve_spa),
]
