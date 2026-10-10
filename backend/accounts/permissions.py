from rest_framework import permissions


class IsAdminUserRole(permissions.BasePermission):
    """Allows access only to users with the ADMIN role"""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsOperatorOrAdmin(permissions.BasePermission):
    """
    Allows read-only access to Reporters.
    Allows read/write access to Operators and Admins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        # Read-only safe methods are allowed for all authenticated users (including Reporter)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write methods (POST, PUT, PATCH, DELETE) are forbidden for Reporters
        return request.user.is_admin or request.user.is_operator


class IsReporterReadOnly(permissions.BasePermission):
    """
    Strictly forbids Reporters from modifying any data.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.is_reporter and request.method not in permissions.SAFE_METHODS:
            return False

        return True
