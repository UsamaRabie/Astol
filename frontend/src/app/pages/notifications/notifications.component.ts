import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../core/services/alert.service';
import { ToastService } from '../../core/services/toast.service';
import { VehicleAlert } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            مركز التنبيهات والإشعارات الفنية
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            متابعة التنبيهات المباشرة للصيانات المتأخرة، انتهاء الرخص والاستمارات، وحالات حل المشكلات
          </p>
        </div>

        <div>
          <button (click)="markAllRead()"
                  [disabled]="alerts.length === 0"
                  class="btn btn-secondary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="check-circle" [size]="15"></app-icon>
            <span>تعليم جميع التنبيهات كمقروءة</span>
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div style="display: flex; border-bottom: 2px solid #e2e8f0; gap: 0.5rem; overflow-x: auto;">
        <button (click)="setFilter('ALL')" class="tab-btn" [class.active-tab]="activeFilter === 'ALL'">
          <span>الكل ({{ totalCount }})</span>
        </button>
        <button (click)="setFilter('UNRESOLVED')" class="tab-btn" [class.active-tab]="activeFilter === 'UNRESOLVED'" style="color: #ea580c;">
          <app-icon name="alert-triangle" [size]="14"></app-icon>
          <span>نشطة (غير محلولة)</span>
        </button>
        <button (click)="setFilter('RESOLVED')" class="tab-btn" [class.active-tab]="activeFilter === 'RESOLVED'" style="color: #059669;">
          <app-icon name="check-circle" [size]="14"></app-icon>
          <span>تم حل المشكلة</span>
        </button>
        <button (click)="setFilter('CRITICAL')" class="tab-btn" [class.active-tab]="activeFilter === 'CRITICAL'" style="color: #e11d48;">
          <app-icon name="alert-triangle" [size]="14"></app-icon>
          <span>حرجة وعاجلة</span>
        </button>
        <button (click)="setFilter('WARNING')" class="tab-btn" [class.active-tab]="activeFilter === 'WARNING'" style="color: #d97706;">
          <app-icon name="clock" [size]="14"></app-icon>
          <span>تحذيرات</span>
        </button>
        <button (click)="setFilter('NORMAL')" class="tab-btn" [class.active-tab]="activeFilter === 'NORMAL'" style="color: #0284c7;">
          <app-icon name="info" [size]="14"></app-icon>
          <span>عادية</span>
        </button>
      </div>

      <!-- Alerts List -->
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div *ngIf="loading" class="card" style="text-align: center; padding: 3rem; color: #64748b;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <app-icon name="refresh" [size]="18" className="spin"></app-icon>
            <span>جاري فحص ومزامنة التنبيهات...</span>
          </div>
        </div>

        <div *ngIf="!loading && alerts.length === 0" class="card" style="text-align: center; padding: 3rem; color: #94a3b8;">
          <app-icon name="check-circle" [size]="32" style="color: #10b981; margin-bottom: 8px;"></app-icon>
          <div style="font-weight: 600; color: #475569;">لا توجد تنبيهات ضمن هذا التصنيف</div>
          <div style="font-size: 11.5px; color: #94a3b8;">جميع مركبات ووثائق الأسطول تعمل بانتظام</div>
        </div>

        <div *ngFor="let alert of alerts"
             class="card"
             style="border-radius: 10px; padding: 1.25rem; transition: all 0.15s ease;"
             [ngClass]="{
               'bg-rose-50/40 border-rose-200': alert.severity === 'CRITICAL' && !alert.is_resolved,
               'bg-amber-50/40 border-amber-200': alert.severity === 'WARNING' && !alert.is_resolved,
               'bg-slate-50/60 border-slate-200': alert.severity === 'NORMAL' && !alert.is_resolved,
               'bg-emerald-50/40 border-emerald-200': alert.is_resolved
             }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                <span class="badge" [ngClass]="{
                  'badge-danger': alert.severity === 'CRITICAL',
                  'badge-warning': alert.severity === 'WARNING',
                  'badge-info': alert.severity === 'NORMAL'
                }" style="font-size: 11px;">
                  {{ alert.severity_display }}
                </span>
                <span class="badge badge-secondary" style="font-size: 11px;">{{ alert.alert_type_display }}</span>
                <span *ngIf="alert.fleet_number">
                  <span class="plate-badge" style="font-size: 11px; padding: 1px 6px;">{{ alert.vehicle_plate }}</span>
                  <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ alert.fleet_number }}</span>
                </span>

                <!-- Status Badges: Resolved / Read / New -->
                <span *ngIf="alert.is_resolved" class="badge badge-success" style="font-size: 10.5px; padding: 2px 7px;">
                  ✓ تم حل المشكلة
                </span>
                <span *ngIf="!alert.is_resolved && alert.is_read" class="badge badge-secondary" style="font-size: 10.5px; padding: 2px 7px;">
                  تم الاطلاع
                </span>
                <span *ngIf="!alert.is_resolved && !alert.is_read" class="badge badge-danger" style="font-size: 10.5px; padding: 2px 7px;">
                  جديد غير مقروء
                </span>
              </div>

              <h4 style="font-size: 1rem; color: #0f172a; margin: 0 0 4px 0; font-weight: 700;">{{ alert.title }}</h4>
              <p style="color: #475569; font-size: 0.875rem; line-height: 1.6; margin: 0;">{{ alert.message }}</p>

              <div style="font-size: 11.5px; color: #94a3b8; margin-top: 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span>تاريخ التسجيل: {{ alert.created_at | date:'yyyy-MM-dd HH:mm' }}</span>
                <span *ngIf="alert.resolved_at" style="color: #059669; font-weight: 600;">
                  تاريخ حل المشكلة: {{ alert.resolved_at | date:'yyyy-MM-dd HH:mm' }}
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;">
              <!-- Resolve Issue Button -->
              <button *ngIf="!alert.is_resolved"
                      (click)="markAsResolved(alert)"
                      class="btn btn-primary btn-sm"
                      style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; padding: 5px 10px; border-radius: 6px; background: #059669; border-color: #059669;"
                      title="تم حل المشكلة وتوثيق المعالجة">
                <app-icon name="check-circle" [size]="14"></app-icon>
                <span>تم حل المشكلة</span>
              </button>

              <!-- Mark as Read Button -->
              <button *ngIf="!alert.is_read && !alert.is_resolved"
                      (click)="markAsRead(alert)"
                      class="btn btn-outline btn-sm"
                      style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 5px 10px; border-radius: 6px;"
                      title="تعليم كمقروء">
                <app-icon name="check" [size]="13"></app-icon>
                <span>تم الاطلاع</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tab-btn {
      padding: 10px 18px;
      font-weight: 600;
      font-size: 13px;
      color: #64748b;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #0284c7;
    }
    .active-tab {
      color: #0284c7;
      border-bottom-color: #0284c7;
      font-weight: 700;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class NotificationsComponent implements OnInit {
  private alertService = inject(AlertService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  alerts: VehicleAlert[] = [];
  loading = true;
  activeFilter = 'ALL';
  totalCount = 0;

  ngOnInit(): void {
    this.loadAlerts();
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.cdr.markForCheck();

    let params: any = {};
    if (this.activeFilter === 'CRITICAL') {
      params.severity = 'CRITICAL';
    } else if (this.activeFilter === 'WARNING') {
      params.severity = 'WARNING';
    } else if (this.activeFilter === 'NORMAL') {
      params.severity = 'NORMAL';
    } else if (this.activeFilter === 'RESOLVED') {
      params.is_resolved = 'true';
    } else if (this.activeFilter === 'UNRESOLVED') {
      params.is_resolved = 'false';
    }

    this.alertService.getAlerts(params).subscribe({
      next: (res) => {
        this.alerts = res.results;
        this.totalCount = res.count;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل التنبيهات');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  markAsRead(alert: VehicleAlert): void {
    this.alertService.markRead(alert.id).subscribe({
      next: () => {
        alert.is_read = true;
        this.toastService.success('تم تعليم التنبيه كمقروء');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحديث حالة التنبيه');
      }
    });
  }

  markAsResolved(alert: VehicleAlert): void {
    this.alertService.resolveAlert(alert.id).subscribe({
      next: () => {
        alert.is_resolved = true;
        alert.is_read = true;
        alert.resolved_at = new Date().toISOString();
        this.toastService.success('تم حل المشكلة وتوثيق المعالجة بنجاح');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل توثيق حل المشكلة');
      }
    });
  }

  markAllRead(): void {
    this.alertService.markAllRead().subscribe({
      next: () => {
        this.toastService.success('تم تعليم جميع التنبيهات كمقروءة');
        this.alerts.forEach(a => a.is_read = true);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحديث التنبيهات');
      }
    });
  }
}
