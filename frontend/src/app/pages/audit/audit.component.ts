import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { AuditLog } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            سجل التدقيق والعمليات الأمنية (Audit Log)
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            توثيق كامل للأنشطة والعمليات الحساسة، تعديلات العدادات، اعتماد الأذونات، وتغييرات الصلاحيات
          </p>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="padding: 1rem 1.25rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; align-items: flex-end;">
          <div>
            <label class="form-label">بحث سريع</label>
            <div style="position: relative;">
              <input type="text"
                     [(ngModel)]="searchQuery"
                     (keyup.enter)="loadLogs()"
                     placeholder="اسم المستخدم، الكائن، المعرف..."
                     class="form-control"
                     style="padding-left: 2rem;" />
              <app-icon name="search" [size]="16" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;"></app-icon>
            </div>
          </div>

          <div>
            <label class="form-label">نوع الإجراء</label>
            <select [(ngModel)]="selectedAction" (change)="loadLogs()" class="form-select">
              <option value="">جميع الإجراءات</option>
              <option value="CREATE">إنشاء (Create)</option>
              <option value="UPDATE">تعديل (Update)</option>
              <option value="DELETE">حذف (Delete)</option>
              <option value="STATUS_CHANGE">تغيير حالة (Status Change)</option>
              <option value="ODOMETER_UPDATE">تحديث عداد (Odometer Update)</option>
              <option value="TRIP_START">بدء رحلة (Trip Start)</option>
              <option value="TRIP_COMPLETE">إتمام رحلة (Trip Complete)</option>
              <option value="MAINTENANCE_RECORD">تسجيل صيانة (Maintenance)</option>
              <option value="PART_REPLACEMENT">استبدال قطعة (Part Replace)</option>
              <option value="LOGIN">تسجيل دخول (Login)</option>
            </select>
          </div>

          <div>
            <label class="form-label">الوحدة / القسم</label>
            <input type="text" [(ngModel)]="moduleFilter" (keyup.enter)="loadLogs()"
                   placeholder="المركبات، أذونات التشغيل..." class="form-control" />
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button (click)="loadLogs()"
                    class="btn btn-secondary"
                    style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px;">
              <app-icon name="filter" [size]="15"></app-icon>
              <span>تطبيق التصفية</span>
            </button>
            <button (click)="resetFilters()"
                    class="btn btn-outline"
                    style="width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center;"
                    title="إعادة تعيين">
              <app-icon name="refresh" [size]="16"></app-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div class="table-container">
        <table class="table" style="font-size: 13px;">
          <thead>
            <tr>
              <th style="width: 160px;">الوقت والتاريخ</th>
              <th>المستخدم المسؤول</th>
              <th>نوع الإجراء</th>
              <th>الوحدة</th>
              <th>وصف الكائن والعملية</th>
              <th>عنوان IP</th>
              <th style="text-align: center; width: 90px;">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="7" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري قراءة سجلات التدقيق والعمليات...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && logs.length === 0">
              <td colspan="7" style="text-align: center; padding: 3rem; color: #94a3b8;">
                <app-icon name="shield-check" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                <div style="font-weight: 600; color: #475569;">لا توجد سجلات تدقيق مطابقة</div>
              </td>
            </tr>
            <ng-container *ngFor="let log of logs">
              <tr>
                <td style="font-family: monospace; font-size: 12px; color: #475569;">
                  {{ log.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}
                </td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">{{ log.user_name || 'النظام المركزي' }}</div>
                  <div style="font-size: 11px; color: #94a3b8;">{{ log.user_role }}</div>
                </td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-success': log.action === 'CREATE' || log.action === 'LOGIN',
                    'badge-info': log.action === 'UPDATE' || log.action === 'TRIP_START',
                    'badge-warning': log.action === 'STATUS_CHANGE' || log.action === 'ODOMETER_UPDATE',
                    'badge-danger': log.action === 'DELETE' || log.action === 'TRIP_CANCEL',
                    'badge-secondary': log.action === 'TRIP_COMPLETE' || log.action === 'MAINTENANCE_RECORD'
                  }" style="font-size: 11px;">
                    {{ log.action_display }}
                  </span>
                </td>
                <td style="font-weight: 600; color: #0284c7;">{{ log.module }}</td>
                <td style="font-weight: 500; color: #334155; font-size: 12.5px;">{{ log.object_repr }}</td>
                <td style="font-family: monospace; font-size: 11.5px; color: #64748b;">{{ log.ip_address || '-' }}</td>
                <td style="text-align: center;">
                  <button *ngIf="hasDetails(log.details)"
                          (click)="toggleDetails(log.id)"
                          class="btn btn-outline btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; font-size: 11px; border-radius: 6px;">
                    <app-icon name="eye" [size]="12"></app-icon>
                    <span>{{ expandedId === log.id ? 'إخفاء' : 'عرض' }}</span>
                  </button>
                </td>
              </tr>
              <!-- Expanded JSON Row -->
              <tr *ngIf="expandedId === log.id" style="background: #f8fafc;">
                <td colspan="7" style="padding: 12px 20px;">
                  <div style="font-weight: 700; font-size: 12px; color: #334155; margin-bottom: 6px;">
                    تفاصيل التغييرات والحقول المعدلة:
                  </div>
                  <pre style="background: #0f172a; color: #38bdf8; padding: 12px 16px; border-radius: 8px; font-size: 11.5px; overflow-x: auto; direction: ltr; text-align: left; margin: 0; font-family: monospace;">{{ log.details | json }}</pre>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div *ngIf="totalPages > 1" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.25rem;">
        <span style="font-size: 12px; color: #64748b; font-weight: 500;">
          إجمالي الحركات: <strong style="color: #0f172a;">{{ totalCount }}</strong>
        </span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button [disabled]="currentPage === 1"
                  (click)="changePage(currentPage - 1)"
                  class="btn btn-outline btn-sm"
                  style="display: inline-flex; align-items: center; gap: 4px;">
            <app-icon name="chevron-right" [size]="14"></app-icon>
            <span>السابق</span>
          </button>
          <span style="padding: 4px 12px; font-size: 12px; font-weight: 700; color: #0f172a;">
            صفحة {{ currentPage }} من {{ totalPages }}
          </span>
          <button [disabled]="currentPage === totalPages"
                  (click)="changePage(currentPage + 1)"
                  class="btn btn-outline btn-sm"
                  style="display: inline-flex; align-items: center; gap: 4px;">
            <span>التالي</span>
            <app-icon name="chevron-left" [size]="14"></app-icon>
          </button>
        </div>
      </div>
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
export class AuditComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  logs: AuditLog[] = [];
  loading = true;

  searchQuery = '';
  selectedAction = '';
  moduleFilter = '';
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;
  expandedId: number | null = null;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.adminService.getAuditLogs({
      search: this.searchQuery,
      action: this.selectedAction,
      module: this.moduleFilter,
      page: this.currentPage
    }).subscribe({
      next: (res) => {
        this.logs = res.results;
        this.totalCount = res.count;
        this.totalPages = res.total_pages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل سجلات التدقيق');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedAction = '';
    this.moduleFilter = '';
    this.currentPage = 1;
    this.loadLogs();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadLogs();
  }

  hasDetails(details: any): boolean {
    return details && Object.keys(details).length > 0;
  }

  toggleDetails(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }
}
