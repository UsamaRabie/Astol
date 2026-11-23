class APICSRFExemptMiddleware:
    """
    Exempts stateless REST API requests (/api/) from CSRF checks.
    Authentication for API endpoints is handled via cryptographically signed JWT Bearer tokens.
    CSRF remains fully active for Django Admin and session-based forms.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path_info.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return self.get_response(request)
