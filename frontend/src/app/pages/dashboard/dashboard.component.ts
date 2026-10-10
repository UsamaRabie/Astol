import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { timeout, catchError, throwError } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardData } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Executive Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            لوحة التحكم والمؤشرات التشغيلية
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            نظرة عامة ومباشرة على أداء أسطول المركبات، أذونات التشغيل، ومؤشرات الصيانة الوقائية
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button *ngIf="canWrite"
                  (click)="evaluateFleet()"
                  [disabled]="evaluating"
                  class="btn btn-secondary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="refresh" [size]="15" [className]="evaluating ? 'spin' : ''"></app-icon>
            <span *ngIf="!evaluating">فحص صيانة الأسطول</span>
            <span *ngIf="evaluating">جاري الفحص الميداني...</span>
          </button>

          <a *ngIf="canWrite"
             routerLink="/work-permits"
             class="btn btn-primary"
             style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>إصدار إذن تشغيل</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="card" style="text-align: center; padding: 4rem 2rem;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; color: #0284c7; margin-bottom: 1rem;">
          <app-icon name="refresh" [size]="24" className="spin"></app-icon>
        </div>
        <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.35rem;">جاري تحميل مؤشرات لوحة التحكم...</div>
        <div style="font-size: 0.85rem; color: #64748b;">يرجى الانتظار بينما يتم تدقيق أحدث بيانات الأسطول والعمليات الميدانية</div>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && error" class="card" style="text-align: center; padding: 3rem 2rem; border: 1px solid #fecaca; background: #fff5f5;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; color: #ef4444; margin-bottom: 1rem;">
          <app-icon name="alert-triangle" [size]="24"></app-icon>
        </div>
        <h3 style="color: #991b1b; font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem;">تعذر تحميل بيانات لوحة التحكم</h3>
        <p style="color: #b91c1c; font-size: 0.875rem; margin-bottom: 1.25rem; max-width: 500px; margin-left: auto; margin-right: auto;">
          {{ errorMessage || 'يرجى التأكد من تشغيل خادم النظام (Backend API) والاتصال بالشبكة.' }}
        </p>
        <button (click)="loadDashboard()" class="btn btn-primary" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;">
          <app-icon name="refresh" [size]="15"></app-icon>
          <span>إعادة المحاولة الآن</span>
        </button>
      </div>

      <ng-container *ngIf="!loading && !error && data">
        <!-- Section 1: Executive KPI Cards (Row 1 - Primary 4 Cards) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
          <!-- Card 1: Total Fleet & Active Rate -->
          <div class="card stat-card">
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
              <div>
                <span class="stat-label">إجمالي أسطول المركبات</span>
                <div class="stat-value" style="color: #0f172a;">{{ data.kpis.total_vehicles }}</div>
              </div>
              <div style="width: 42px; height: 42px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
                <app-icon name="truck" [size]="22"></app-icon>
              </div>
            </div>
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
              <span style="color: #10b981; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <app-icon name="check" [size]="14"></app-icon>
                {{ data.kpis.active_vehicles }} في الخدمة النشطة
              </span>
              <span style="color: #64748b;">{{ getPercent(data.kpis.active_vehicles, data.kpis.total_vehicles) }}% جاهزية</span>
            </div>
          </div>

          <!-- Card 2: Active & Completed Trips -->
          <div class="card stat-card">
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
              <div>
                <span class="stat-label">الرحلات التشغيلية الحالية</span>
                <div class="stat-value" style="color: #0284c7;">{{ data.kpis.active_trips }}</div>
              </div>
              <div style="width: 42px; height: 42px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
                <app-icon name="clipboard-list" [size]="22"></app-icon>
              </div>
            </div>
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
              <span style="color: #475569; font-weight: 600;">
                {{ data.kpis.completed_trips }} رحلة مكتملة
              </span>
              <span style="color: #64748b;">ميدانياً</span>
            </div>
          </div>

          <!-- Card 3: Overdue Maintenance Warnings -->
          <div class="card stat-card" [style.background]="data.kpis.overdue_maintenance > 0 ? '#fffafb' : '#ffffff'">
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
              <div>
                <span class="stat-label" [style.color]="data.kpis.overdue_maintenance > 0 ? '#be123c' : '#64748b'">صيانات متأخرة عاجلة</span>
                <div class="stat-value" [style.color]="data.kpis.overdue_maintenance > 0 ? '#e11d48' : '#0f172a'">
                  {{ data.kpis.overdue_maintenance }}
                </div>
              </div>
              <div [style.background]="data.kpis.overdue_maintenance > 0 ? '#ffe4e6' : '#f1f5f9'"
                   [style.color]="data.kpis.overdue_maintenance > 0 ? '#e11d48' : '#64748b'"
                   style="width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <app-icon name="wrench" [size]="22"></app-icon>
              </div>
            </div>
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
              <span style="color: #b45309; font-weight: 600;">
                {{ data.kpis.due_maintenance }} مستحقة قريباً
              </span>
              <span style="color: #64748b;">{{ data.kpis.upcoming_maintenance }} قادمة</span>
            </div>
          </div>

          <!-- Card 4: Total Operational Expenses -->
          <div class="card stat-card">
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
              <div>
                <span class="stat-label">إجمالي المصروفات التشغيلية</span>
                <div class="stat-value" style="color: #0f172a; font-size: 1.5rem;">
                  {{ (data.kpis.total_maintenance_cost + data.kpis.total_fuel_cost) | number:'1.0-0' }} <span style="font-size: 13px; font-weight: 600; color: #64748b;">ر.س</span>
                </div>
              </div>
              <div style="width: 42px; height: 42px; border-radius: 10px; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
                <app-icon name="bar-chart" [size]="22"></app-icon>
              </div>
            </div>
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
              <span style="color: #0284c7; font-weight: 600;">
                صيانة: {{ data.kpis.total_maintenance_cost | number:'1.0-0' }} ر.س
              </span>
              <span style="color: #ea580c; font-weight: 600;">
                وقود: {{ data.kpis.total_fuel_cost | number:'1.0-0' }} ر.س
              </span>
            </div>
          </div>
        </div>

        <!-- Section 1b: Secondary Operational Metrics (Row 2 - 4 Cards) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <!-- Distance -->
          <div class="card" style="padding: 1rem; border-radius: 10px; display: flex; align-items: center; gap: 14px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <app-icon name="gauge" [size]="20"></app-icon>
            </div>
            <div>
              <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">إجمالي المسافة المقطوعة</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">{{ data.kpis.total_distance | number }} <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">كم</span></div>
            </div>
          </div>

          <!-- In Maintenance -->
          <div class="card" style="padding: 1rem; border-radius: 10px; display: flex; align-items: center; gap: 14px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: #fffbeb; color: #d97706; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <app-icon name="alert-triangle" [size]="20"></app-icon>
            </div>
            <div>
              <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">مركبات في ورشة الصيانة</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #d97706;">{{ data.kpis.in_maintenance_vehicles }} <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">مركبة</span></div>
            </div>
          </div>

          <!-- Out of Service -->
          <div class="card" style="padding: 1rem; border-radius: 10px; display: flex; align-items: center; gap: 14px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: #fff1f2; color: #e11d48; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <app-icon name="x-circle" [size]="20"></app-icon>
            </div>
            <div>
              <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">مركبات متوقفة وخارج الخدمة</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #e11d48;">{{ data.kpis.out_of_service_vehicles }} <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">مركبة</span></div>
            </div>
          </div>

          <!-- Fuel Liters -->
          <div class="card" style="padding: 1rem; border-radius: 10px; display: flex; align-items: center; gap: 14px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <app-icon name="fuel" [size]="20"></app-icon>
            </div>
            <div>
              <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">إجمالي استهلاك الوقود</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #ea580c;">{{ data.kpis.total_fuel_liters | number:'1.0-0' }} <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">لتر</span></div>
            </div>
          </div>
        </div>

        <!-- Section 2: Distribution & Monthly Performance -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
          <!-- Vehicle Status Breakdown -->
          <div class="card">
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <app-icon name="truck" [size]="18" style="color: #0284c7;"></app-icon>
                <span style="font-weight: 700; font-size: 14px; color: #0f172a;">توزيع حالات أسطول المركبات</span>
              </div>
              <a routerLink="/vehicles" style="color: #0284c7; font-size: 12px; font-weight: 600; text-decoration: none;">عرض الأسطول</a>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div *ngFor="let s of data.status_chart" style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600;">
                  <span style="color: #334155;">{{ s.label }}</span>
                  <span style="color: #64748b;">{{ s.count }} مركبة ({{ getPercent(s.count, data.kpis.total_vehicles) }}%)</span>
                </div>
                <div style="background: #f1f5f9; height: 8px; border-radius: 9999px; overflow: hidden;">
                  <div [style.width.%]="getPercent(s.count, data.kpis.total_vehicles)"
                       [style.background-color]="s.color"
                       style="height: 100%; border-radius: 9999px; transition: width 0.4s ease;">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Monthly Trips & Distances -->
          <div class="card">
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <app-icon name="activity" [size]="18" style="color: #0284c7;"></app-icon>
                <span style="font-weight: 700; font-size: 14px; color: #0f172a;">حركة الرحلات الشهرية</span>
              </div>
              <a routerLink="/work-permits" style="color: #0284c7; font-size: 12px; font-weight: 600; text-decoration: none;">أذونات التشغيل</a>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div *ngFor="let m of data.monthly_trends"
                   style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                <span style="font-weight: 700; color: #1e293b;">{{ m.month }}</span>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="badge badge-info" style="font-size: 11px;">{{ m.trips }} رحلة</span>
                  <span style="color: #64748b; font-weight: 600; font-size: 12px;">{{ m.distance | number }} كم</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Monthly Financial Expenses -->
          <div class="card">
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <app-icon name="bar-chart" [size]="18" style="color: #0284c7;"></app-icon>
                <span style="font-weight: 700; font-size: 14px; color: #0f172a;">المصروفات الشهرية (صيانة ووقود)</span>
              </div>
              <a routerLink="/reports" style="color: #0284c7; font-size: 12px; font-weight: 600; text-decoration: none;">مركز التقارير</a>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div *ngFor="let m of data.monthly_trends"
                   style="display: flex; flex-direction: column; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #1e293b;">
                  <span>{{ m.month }}</span>
                  <span>{{ (m.maintenance_cost + m.fuel_cost) | number:'1.0-0' }} ر.س</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #64748b;">
                  <span style="display: inline-flex; align-items: center; gap: 4px; color: #0284c7;">
                    <app-icon name="wrench" [size]="12"></app-icon> صيانة: {{ m.maintenance_cost | number:'1.0-0' }} ر.س
                  </span>
                  <span style="display: inline-flex; align-items: center; gap: 4px; color: #ea580c;">
                    <app-icon name="fuel" [size]="12"></app-icon> وقود: {{ m.fuel_cost | number:'1.0-0' }} ر.س
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Critical Alerts & Recent Trips -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 1.5rem;">
          <!-- Critical Alerts Table -->
          <div class="card">
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <app-icon name="alert-triangle" [size]="18" style="color: #e11d48;"></app-icon>
                <span style="font-weight: 700; font-size: 14px; color: #0f172a;">التنبيهات الفنية والحرجة</span>
                <span *ngIf="data.critical_alerts.length > 0" class="badge badge-danger" style="font-size: 11px;">
                  {{ data.critical_alerts.length }}
                </span>
              </div>
              <a routerLink="/notifications" style="color: #0284c7; font-size: 12px; font-weight: 600; text-decoration: none;">كل التنبيهات</a>
            </div>

            <div *ngIf="data.critical_alerts.length === 0" style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8;">
              <app-icon name="check-circle" [size]="32" style="color: #10b981; margin-bottom: 6px;"></app-icon>
              <div style="font-weight: 600; font-size: 13px; color: #475569;">جميع مركبات الأسطول تعمل بانتظام</div>
              <div style="font-size: 11.5px; color: #94a3b8;">لا توجد تنبيهات حرجة في الوقت الحالي</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div *ngFor="let alert of data.critical_alerts"
                   style="border-radius: 8px; padding: 12px 14px; font-size: 12.5px; border: 1px solid;"
                   [ngClass]="{
                     'bg-rose-50 border-rose-200 text-rose-950': alert.severity === 'CRITICAL',
                     'bg-amber-50 border-amber-200 text-amber-950': alert.severity === 'WARNING',
                     'bg-slate-50 border-slate-200 text-slate-900': alert.severity === 'NORMAL'
                   }">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span class="badge"
                        [ngClass]="alert.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'"
                        style="font-size: 10.5px;">
                    {{ alert.severity_display }}
                  </span>
                  <span style="font-size: 11px; opacity: 0.7;">{{ alert.created_at | date:'shortTime' }}</span>
                </div>
                <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">{{ alert.title }}</div>
                <div style="font-size: 12px; line-height: 1.4; opacity: 0.85;">{{ alert.message }}</div>
              </div>
            </div>
          </div>

          <!-- Recent Work Permits -->
          <div class="card">
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <app-icon name="clipboard-list" [size]="18" style="color: #0284c7;"></app-icon>
                <span style="font-weight: 700; font-size: 14px; color: #0f172a;">أحدث أذونات التشغيل والرحلات</span>
              </div>
              <a routerLink="/work-permits" style="color: #0284c7; font-size: 12px; font-weight: 600; text-decoration: none;">عرض الكل</a>
            </div>

            <div *ngIf="data.recent_permits.length === 0" style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8;">
              <div style="font-weight: 600; font-size: 13px; color: #475569;">لا توجد أذونات تشغيل مسجلة مؤخراً</div>
            </div>

            <div class="table-container" *ngIf="data.recent_permits.length > 0">
              <table class="table" style="font-size: 12.5px;">
                <thead>
                  <tr>
                    <th>رقم الإذن</th>
                    <th>المركبة</th>
                    <th>السائق</th>
                    <th>الوجهة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of data.recent_permits">
                    <td style="font-weight: 700; color: #0284c7;">{{ p.permit_number }}</td>
                    <td>
                      <span class="plate-badge" style="font-size: 11px; padding: 2px 6px;">{{ p.vehicle_plate }}</span>
                      <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ p.fleet_number }}</span>
                    </td>
                    <td style="font-weight: 500;">{{ p.driver_name }}</td>
                    <td style="color: #475569;">{{ p.destination }}</td>
                    <td>
                      <span class="badge" [ngClass]="{
                        'badge-warning': p.status === 'DRAFT',
                        'badge-info': p.status === 'APPROVED',
                        'badge-success': p.status === 'IN_PROGRESS',
                        'badge-secondary': p.status === 'COMPLETED',
                        'badge-danger': p.status === 'CANCELLED'
                      }" style="font-size: 10.5px;">
                        {{ p.status_display }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private maintenanceService = inject(MaintenanceService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  data: DashboardData | null = null;
  loading = true;
  error = false;
  errorMessage = '';
  evaluating = false;

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
    this.dashboardService.getDashboardData().pipe(
      timeout(8000),
      catchError((err) => {
        return throwError(() => err);
      })
    ).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.error = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.error = true;
        if (err?.name === 'TimeoutError') {
          this.errorMessage = 'استغرقت الاستجابة وقتاً أطول من المتوقع، يرجى إعادة المحاولة.';
        } else if (err?.status === 0) {
          this.errorMessage = 'تعذر الاتصال بالخادم الرئيسي (Backend). يرجى التأكد من تشغيل خادم Django.';
        } else if (err?.status === 401) {
          this.errorMessage = 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول.';
        } else {
          this.errorMessage = 'حدث خطأ أثناء جلب مؤشرات لوحة التحكم.';
        }
        this.toastService.error(this.errorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  evaluateFleet(): void {
    this.evaluating = true;
    this.cdr.markForCheck();
    this.maintenanceService.evaluateFleet().subscribe({
      next: (res) => {
        this.evaluating = false;
        this.toastService.success(res.message || 'تم فحص الأسطول وتحديث حالات الصيانة');
        this.loadDashboard();
        this.cdr.markForCheck();
      },
      error: () => {
        this.evaluating = false;
        this.toastService.error('فشل تنفيذ فحص الأسطول');
        this.cdr.markForCheck();
      }
    });
  }

  getPercent(val: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((val / total) * 100);
  }
}
