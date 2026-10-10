from .models import AuditLog
from .middleware import get_current_request, get_current_user, get_client_ip


def log_action(action, module, object_repr, object_id="", details=None, user=None, request=None):
    """
    Central utility to log an audit event.
    """
    if request is None:
        request = get_current_request()
    if user is None:
        user = get_current_user()

    ip_address = get_client_ip(request) if request else None

    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            module=module,
            object_repr=str(object_repr)[:255],
            object_id=str(object_id)[:100],
            details=details or {},
            ip_address=ip_address
        )
    except Exception as e:
        # Don't let audit logging fail the primary business operation
        print(f"Audit log error: {e}")
