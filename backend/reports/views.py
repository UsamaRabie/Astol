from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .services import ReportGeneratorService


class ReportDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get('report_type', 'VEHICLES')
        filters = {
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
            'vehicle': request.query_params.get('vehicle'),
            'driver': request.query_params.get('driver'),
            'status': request.query_params.get('status'),
            'type': request.query_params.get('type'),
            'department': request.query_params.get('department'),
        }

        report_data = ReportGeneratorService.generate_report_data(
            report_type=report_type,
            filters=filters,
            user=request.user
        )
        return Response(report_data)


class ReportExcelExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get('report_type', 'VEHICLES')
        filters = {
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
            'vehicle': request.query_params.get('vehicle'),
            'driver': request.query_params.get('driver'),
            'status': request.query_params.get('status'),
            'type': request.query_params.get('type'),
            'department': request.query_params.get('department'),
        }

        excel_file = ReportGeneratorService.export_excel(
            report_type=report_type,
            filters=filters,
            user=request.user
        )

        response = HttpResponse(
            excel_file.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="astol_{report_type.lower()}_report.xlsx"'
        return response
