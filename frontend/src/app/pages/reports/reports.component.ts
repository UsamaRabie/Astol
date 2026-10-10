import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { FleetService } from '../../core/services/fleet.service';
import { ToastService } from '../../core/services/toast.service';
import { ReportData, Vehicle } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header (Hidden on Print) -->
      <div class="no-print" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            مركز التقارير والرقابة التشغيلية
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            استخراج التقارير الإحصائية والتحليلية، الطباعة الرسمية، وتصدير البيانات لجداول Excel
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button (click)="printReport()"
                  [disabled]="loading || !reportData"
                  class="btn btn-secondary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="printer" [size]="16"></app-icon>
            <span>طباعة التقرير</span>
          </button>
          <button (click)="exportExcel()"
                  [disabled]="loading || !reportData"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="download" [size]="16"></app-icon>
            <span>تصدير ملف Excel</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar (Hidden on Print) -->
      <div class="card no-print" style="padding: 1rem 1.25rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem;">
          <div>
            <label class="form-label">نوع التقرير المطلوب *</label>
            <select [(ngModel)]="selectedReportType" (change)="generateReport()" class="form-select font-semibold">
              <optgroup label="تقارير الأسطول والتشغيل">
                <option value="VEHICLES">تقرير أسطول المركبات الشامل</option>
                <option value="VEHICLE_USAGE">تقرير معدلات تشغيل واستخدام المركبات</option>
                <option value="WORK_PERMITS">تقرير أذونات التشغيل والمهام</option>
                <option value="TRIPS">تقرير الرحلات المكتملة والمسافات</option>
                <option value="ODOMETER">تقرير حركات وقراءات العدادات</option>
              </optgroup>
              <optgroup label="تقارير الصيانة وقطع الغيار">
                <option value="MAINTENANCE">تقرير سجلات الصيانة والإصلاح</option>
                <option value="MAINTENANCE_COST">تقرير تحليل تكاليف الصيانة</option>
                <option value="PARTS_REPLACEMENT">تقرير استبدال قطع الغيار الوقائية</option>
                <option value="OVERDUE_MAINTENANCE">تقرير الصيانات المتأخرة والحرجة</option>
                <option value="UPCOMING_MAINTENANCE">تقرير الصيانات القادمة والمستحقة</option>
              </optgroup>
              <optgroup label="تقارير استهلاك وتكاليف الوقود">
                <option value="FUEL">تقرير سجلات تعبئة الوقود</option>
                <option value="FUEL_COST">تقرير تحليل استهلاك وتكاليف الوقود</option>
              </optgroup>
              <optgroup label="تقارير السائقين والوثائق">
                <option value="DRIVER_ACTIVITY">تقرير نشاط وأداء السائقين</option>
                <option value="EXPIRING_DOCUMENTS">تقرير الوثائق والتراخيص المنتهية</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label class="form-label">تخصيص لمركبة محددة</label>
            <select [(ngModel)]="selectedVehicle" (change)="generateReport()" class="form-select">
              <option value="">جميع مركبات الأسطول</option>
              <option *ngFor="let v of vehicles" [value]="v.id">
                {{ v.internal_fleet_number }} - {{ v.plate_number }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">من تاريخ</label>
            <input type="date" [(ngModel)]="dateFrom" (change)="generateReport()" class="form-control" />
          </div>

          <div>
            <label class="form-label">إلى تاريخ</label>
            <input type="date" [(ngModel)]="dateTo" (change)="generateReport()" class="form-control" />
          </div>
        </div>
      </div>

      <!-- Printable Report Sheet (Rendered for Web & Print) -->
      <div class="card" style="padding: 2.25rem; background: #ffffff;">
        <!-- Official Arabic Header for Print & Display -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 800; font-size: 1.4rem; color: #0f172a; letter-spacing: -0.3px;">
              شركة أسطول لإدارة النقل والخدمات اللوجستية
            </div>
            <div style="font-size: 0.875rem; color: #64748b; margin-top: 2px;">
              الإدارة العامة للتشغيل ومتابعة الصيانة الميدانية
            </div>
          </div>
          <div style="text-align: left; line-height: 1.4;">
            <div style="font-weight: 800; font-size: 1.25rem; color: #0284c7;">{{ reportData?.title }}</div>
            <div style="font-size: 0.75rem; color: #64748b;">تاريخ الاستخراج: {{ reportData?.generated_at }}</div>
            <div style="font-size: 0.75rem; color: #64748b;">المستخرج: {{ reportData?.generated_by }}</div>
          </div>
        </div>

        <!-- Summary KPI metrics -->
        <div *ngIf="reportData && hasSummary()"
             style="display: flex; flex-wrap: wrap; gap: 1.5rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div *ngFor="let item of summaryEntries" style="display: flex; align-items: center; gap: 6px; font-size: 13px;">
            <span style="color: #64748b; font-weight: 600;">{{ item.key }}:</span>
            <span style="font-weight: 800; color: #0f172a;">{{ item.value }}</span>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" style="text-align: center; padding: 3rem; color: #64748b;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <app-icon name="refresh" [size]="18" className="spin"></app-icon>
            <span>جاري استخراج بيانات التقرير والتحليل الإحصائي...</span>
          </div>
        </div>

        <!-- Data Table -->
        <div class="table-container" *ngIf="!loading && reportData">
          <table class="table" style="width: 100%; font-size: 12.5px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th *ngFor="let col of reportData.columns" style="background: #0f172a; color: #ffffff;">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="reportData.data.length === 0">
                <td [attr.colspan]="reportData.columns.length" style="text-align: center; padding: 3rem; color: #94a3b8;">
                  لا توجد سجلات تطابق معايير التقرير المحددة
                </td>
              </tr>
              <tr *ngFor="let row of reportData.data; let idx = index" [style.background-color]="idx % 2 === 0 ? '#ffffff' : '#f8fafc'">
                <td *ngFor="let col of reportData.columns">
                  {{ row[col.key] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Signatures Block for Print -->
        <div style="margin-top: 3.5rem; padding-top: 1.5rem; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between;">
          <div style="text-align: center; width: 180px;">
            <div style="font-weight: 700; font-size: 12px; margin-bottom: 45px; color: #475569;">مدقق التقرير</div>
            <div style="border-bottom: 1px solid #94a3b8; width: 100%;"></div>
          </div>
          <div style="text-align: center; width: 180px;">
            <div style="font-weight: 700; font-size: 12px; margin-bottom: 45px; color: #475569;">مدير الحركة والتشغيل</div>
            <div style="border-bottom: 1px solid #94a3b8; width: 100%;"></div>
          </div>
          <div style="text-align: center; width: 180px;">
            <div style="font-weight: 700; font-size: 12px; margin-bottom: 45px; color: #475569;">اعتماد الإدارة العامة</div>
            <div style="border-bottom: 1px solid #94a3b8; width: 100%;"></div>
          </div>
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
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private fleetService = inject(FleetService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  vehicles: Vehicle[] = [];
  selectedReportType = 'VEHICLES';
  selectedVehicle = '';
  dateFrom = '';
  dateTo = '';

  reportData: ReportData | null = null;
  loading = true;

  get summaryEntries(): { key: string; value: any }[] {
    if (!this.reportData || !this.reportData.summary) return [];
    return Object.keys(this.reportData.summary).map(key => ({
      key,
      value: this.reportData!.summary[key]
    }));
  }

  hasSummary(): boolean {
    return this.summaryEntries.length > 0;
  }

  ngOnInit(): void {
    this.fleetService.getVehicles().subscribe({
      next: (res) => {
        this.vehicles = res.results;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
    this.generateReport();
  }

  generateReport(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.reportService.getReportData(this.selectedReportType, {
      vehicle: this.selectedVehicle,
      date_from: this.dateFrom,
      date_to: this.dateTo
    }).subscribe({
      next: (res) => {
        this.reportData = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل توليد بيانات التقرير');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  printReport(): void {
    window.print();
  }

  exportExcel(): void {
    this.reportService.exportExcel(this.selectedReportType, {
      vehicle: this.selectedVehicle,
      date_from: this.dateFrom,
      date_to: this.dateTo
    });
  }
}
