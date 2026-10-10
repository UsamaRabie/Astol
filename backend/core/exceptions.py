from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'success': False,
            'status_code': response.status_code,
            'message': 'حدث خطأ في معالجة الطلب',
            'errors': response.data
        }

        # Format error messages cleanly for frontend
        if isinstance(response.data, dict):
            detail = response.data.get('detail', None)
            if detail:
                custom_data['message'] = str(detail)
            else:
                first_key = next(iter(response.data))
                first_val = response.data[first_key]
                if isinstance(first_val, list) and len(first_val) > 0:
                    custom_data['message'] = f"{first_key}: {first_val[0]}"
                elif isinstance(first_val, str):
                    custom_data['message'] = f"{first_key}: {first_val}"

        response.data = custom_data

    return response
