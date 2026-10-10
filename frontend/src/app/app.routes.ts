import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { LoginComponent } from './pages/auth/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { VehicleListComponent } from './pages/vehicles/vehicle-list.component';
import { VehicleDetailComponent } from './pages/vehicles/vehicle-detail.component';
import { WorkPermitsComponent } from './pages/work-permits/work-permits.component';
import { MaintenanceComponent } from './pages/maintenance/maintenance.component';
import { PartsComponent } from './pages/parts/parts.component';
import { FuelComponent } from './pages/fuel/fuel.component';
import { DriversComponent } from './pages/drivers/drivers.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { AuditComponent } from './pages/audit/audit.component';
import { SettingsComponent } from './pages/settings/settings.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'vehicles', component: VehicleListComponent },
      { path: 'vehicles/:id', component: VehicleDetailComponent },
      { path: 'work-permits', component: WorkPermitsComponent },
      { path: 'maintenance', component: MaintenanceComponent },
      { path: 'parts', component: PartsComponent },
      { path: 'fuel', component: FuelComponent },
      { path: 'drivers', component: DriversComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'audit-logs', component: AuditComponent, canActivate: [adminGuard] },
      { path: 'settings', component: SettingsComponent, canActivate: [adminGuard] }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
