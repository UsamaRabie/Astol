from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, permissions
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from accounts.permissions import IsAdminUserRole, IsOperatorOrAdmin
from vehicles.models import Vehicle
from work_permits.models import WorkPermit
from work_permits.serializers import WorkPermitListSerializer
from maintenance.models import MaintenanceRecord
from parts.models import VehiclePart
from fuel.models import FuelRecord
from notifications.models import VehicleAlert
from notifications.serializers import VehicleAlertSerializer
from .models import SystemSetting
from .serializers import SystemSettingSerializer


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1. Vehicle Counts
        vehicles_qs = Vehicle.objects.filter(is_deleted=False)
        total_vehicles = vehicles_qs.count()
        active_vehicles = vehicles_qs.filter(status=Vehicle.Status.ACTIVE).count()
        in_maintenance_vehicles = vehicles_qs.filter(status=Vehicle.Status.IN_MAINTENANCE).count()
        out_of_service_vehicles = vehicles_qs.filter(status=Vehicle.Status.OUT_OF_SERVICE).count()
        retired_vehicles = vehicles_qs.filter(status=Vehicle.Status.RETIRED).count()

        # 2. Trip Counts
        permits_qs = WorkPermit.objects.filter(is_deleted=False)
        active_trips = permits_qs.filter(status=WorkPermit.Status.IN_PROGRESS).count()
        completed_trips = permits_qs.filter(status=WorkPermit.Status.COMPLETED).count()

        # 3. Maintenance Part Statuses
        due_maintenance = VehiclePart.objects.filter(current_status=VehiclePart.HealthStatus.DUE_SOON).count()
        upcoming_maintenance = VehiclePart.objects.filter(current_status=VehiclePart.HealthStatus.UPCOMING).count()
        overdue_maintenance = VehiclePart.objects.filter(current_status=VehiclePart.HealthStatus.OVERDUE).count()

        # 4. Aggregates
        total_distance = permits_qs.filter(status=WorkPermit.Status.COMPLETED).aggregate(s=Sum('distance_traveled'))['s'] or 0
        total_maintenance_cost = MaintenanceRecord.objects.filter(is_deleted=False).aggregate(s=Sum('cost'))['s'] or 0
        total_fuel_cost = FuelRecord.objects.filter(is_deleted=False).aggregate(s=Sum('total_cost'))['s'] or 0
        total_fuel_liters = FuelRecord.objects.filter(is_deleted=False).aggregate(s=Sum('quantity'))['s'] or 0

        # 5. Recent Items
        recent_permits = WorkPermitListSerializer(permits_qs.order_by('-created_at')[:6], many=True).data
        critical_alerts = VehicleAlertSerializer(
            VehicleAlert.objects.filter(is_resolved=False).order_by('-created_at')[:6],
            many=True
        ).data

        # 6. Chart: Vehicle Status Distribution
        status_chart = [
            {'label': 'نشطة (في الخدمة)', 'count': active_vehicles, 'color': '#10B981'},
            {'label': 'في الصيانة', 'count': in_maintenance_vehicles, 'color': '#F59E0B'},
            {'label': 'خارج الخدمة', 'count': out_of_service_vehicles, 'color': '#EF4444'},
            {'label': 'مستبعدة', 'count': retired_vehicles, 'color': '#6B7280'},
        ]

        # 7. Chart: Monthly Trends (Past 6 Months)
        today = timezone.now().date()
        monthly_trends = []
        for i in range(5, -1, -1):
            # calculate year and month
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            month_label = f"{y}-{m:02d}"

            m_trips = permits_qs.filter(
                departure_date__year=y,
                departure_date__month=m,
                status=WorkPermit.Status.COMPLETED
            ).count()

            m_dist = permits_qs.filter(
                departure_date__year=y,
                departure_date__month=m,
                status=WorkPermit.Status.COMPLETED
            ).aggregate(s=Sum('distance_traveled'))['s'] or 0

            m_maint_cost = MaintenanceRecord.objects.filter(
                is_deleted=False,
                maintenance_date__year=y,
                maintenance_date__month=m
            ).aggregate(s=Sum('cost'))['s'] or 0

            m_fuel_cost = FuelRecord.objects.filter(
                is_deleted=False,
                date__year=y,
                date__month=m
            ).aggregate(s=Sum('total_cost'))['s'] or 0

            monthly_trends.append({
                'month': month_label,
                'trips': m_trips,
                'distance': m_dist,
                'maintenance_cost': float(m_maint_cost),
                'fuel_cost': float(m_fuel_cost),
            })

        return Response({
            'kpis': {
                'total_vehicles': total_vehicles,
                'active_vehicles': active_vehicles,
                'in_maintenance_vehicles': in_maintenance_vehicles,
                'out_of_service_vehicles': out_of_service_vehicles,
                'active_trips': active_trips,
                'completed_trips': completed_trips,
                'due_maintenance': due_maintenance,
                'upcoming_maintenance': upcoming_maintenance,
                'overdue_maintenance': overdue_maintenance,
                'total_distance': total_distance,
                'total_maintenance_cost': float(total_maintenance_cost),
                'total_fuel_cost': float(total_fuel_cost),
                'total_fuel_liters': float(total_fuel_liters),
            },
            'status_chart': status_chart,
            'monthly_trends': monthly_trends,
            'recent_permits': recent_permits,
            'critical_alerts': critical_alerts,
        })


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAdminUserRole]
