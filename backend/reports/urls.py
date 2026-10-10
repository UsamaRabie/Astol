from django.urls import path
from .views import ReportDataView, ReportExcelExportView

urlpatterns = [
    path('reports/data/', ReportDataView.as_view(), name='report_data'),
    path('reports/export-excel/', ReportExcelExportView.as_view(), name='report_export_excel'),
]
