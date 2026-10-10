import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkPermitService } from '../../core/services/work-permit.service';
import { FleetService } from '../../core/services/fleet.service';
import { DriverService } from '../../core/services/driver.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { WorkPermit, Vehicle, Driver } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-work-permits',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            أذونات التشغيل ورحلات العمل
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            إصدار تراخيص الحركة، مراقبة انطلاق وعودة الرحلات، واحتساب المسافات المقطوعة بدقة
          </p>
        </div>

        <div>
          <button *ngIf="canWrite"
                  (click)="openCreateModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13.5px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>إصدار إذن تشغيل جديد</span>
          </button>
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
                     (keyup.enter)="loadPermits()"
                     placeholder="رقم الإذن، الوجهة، الغرض، السائق..."
                     class="form-control"
                     style="padding-left: 2rem;" />
              <app-icon name="search" [size]="16" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;"></app-icon>
            </div>
          </div>

          <div>
            <label class="form-label">حالة الإذن</label>
            <select [(ngModel)]="selectedStatus" (change)="loadPermits()" class="form-select">
              <option value="">جميع الحالات التشغيلية</option>
              <option value="DRAFT">مسودة (Draft)</option>
              <option value="APPROVED">معتمد وبانتظار الانطلاق (Approved)</option>
              <option value="IN_PROGRESS">قيد التنفيذ بالميدان (In Progress)</option>
              <option value="COMPLETED">مكتمل ومنتهي (Completed)</option>
              <option value="CANCELLED">ملغي (Cancelled)</option>
            </select>
          </div>

          <div>
            <label class="form-label">من تاريخ</label>
            <input type="date" [(ngModel)]="dateFrom" (change)="loadPermits()" class="form-control" />
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button (click)="loadPermits()"
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
              <th style="width: 120px;">رقم الإذن</th>
              <th>المركبة</th>
              <th>السائق المسؤول</th>
              <th>الجهة الطالبة</th>
              <th>الوجهة والغرض</th>
              <th>تاريخ الانطلاق</th>
              <th>عداد البداية</th>
              <th>عداد العودة</th>
              <th>المسافة</th>
              <th>الحالة</th>
              <th *ngIf="canWrite" style="text-align: center; width: 170px;">إجراءات التشغيل</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="11" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري تحميل أذونات التشغيل...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && permits.length === 0">
              <td colspan="11" style="text-align: center; padding: 3rem; color: #94a3b8;">
                <app-icon name="clipboard-list" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                <div style="font-weight: 600; color: #475569;">لا توجد أذونات تشغيل مسجلة</div>
                <div style="font-size: 11.5px; color: #94a3b8;">يمكنك إصدار إذن تشغيل جديد للأسطول</div>
              </td>
            </tr>
            <tr *ngFor="let p of permits">
              <td style="font-weight: 800; color: #0284c7;">{{ p.permit_number }}</td>
              <td>
                <span class="plate-badge">{{ p.vehicle_plate }}</span>
                <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ p.fleet_number }}</span>
              </td>
              <td>
                <div style="font-weight: 600; color: #0f172a;">{{ p.driver_name }}</div>
                <div style="font-size: 11px; color: #94a3b8;">{{ p.driver_phone }}</div>
              </td>
              <td style="color: #475569;">{{ p.requesting_department }}</td>
              <td>
                <div style="font-weight: 600; color: #1e293b;">{{ p.destination }}</div>
                <div style="font-size: 11.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">
                  {{ p.purpose }}
                </div>
              </td>
              <td>{{ p.departure_date }}</td>
              <td style="font-weight: 600; color: #334155;">
                {{ p.starting_odometer ? (p.starting_odometer | number) + ' كم' : '-' }}
              </td>
              <td style="font-weight: 600; color: #334155;">
                {{ p.ending_odometer ? (p.ending_odometer | number) + ' كم' : '-' }}
              </td>
              <td style="font-weight: 800; color: #059669;">
                {{ p.distance_traveled ? (p.distance_traveled | number) + ' كم' : '-' }}
              </td>
              <td>
                <span class="badge" [ngClass]="{
                  'badge-warning': p.status === 'DRAFT',
                  'badge-info': p.status === 'APPROVED',
                  'badge-success': p.status === 'IN_PROGRESS',
                  'badge-secondary': p.status === 'COMPLETED',
                  'badge-danger': p.status === 'CANCELLED'
                }" style="font-size: 11px;">
                  {{ p.status_display }}
                </span>
              </td>
              <td *ngIf="canWrite" style="text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <!-- Approve Button (if Draft) -->
                  <button *ngIf="p.status === 'DRAFT'"
                          (click)="approvePermit(p)"
                          class="btn btn-secondary btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11.5px;"
                          title="اعتماد الإذن">
                    <app-icon name="check" [size]="12"></app-icon>
                    <span>اعتماد</span>
                  </button>

                  <!-- Start Trip Button (if Approved or Draft) -->
                  <button *ngIf="p.status === 'APPROVED' || p.status === 'DRAFT'"
                          (click)="openStartTripModal(p)"
                          class="btn btn-primary btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11.5px;"
                          title="تسجيل انطلاق الرحلة">
                    <app-icon name="gauge" [size]="12"></app-icon>
                    <span>انطلاق</span>
                  </button>

                  <!-- Complete Trip Button (if In Progress) -->
                  <button *ngIf="p.status === 'IN_PROGRESS'"
                          (click)="openCompleteTripModal(p)"
                          class="btn btn-sm"
                          style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11.5px;"
                          title="تسجيل عودة المركبة وإتمام الرحلة">
                    <app-icon name="check-circle" [size]="12"></app-icon>
                    <span>عودة</span>
                  </button>

                  <!-- Cancel Button -->
                  <button *ngIf="p.status !== 'COMPLETED' && p.status !== 'CANCELLED'"
                          (click)="openCancelModal(p)"
                          class="btn btn-outline btn-sm"
                          style="color: #ef4444; border-color: #fecaca; padding: 4px 6px;"
                          title="إلغاء الإذن">
                    <app-icon name="x" [size]="12"></app-icon>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div *ngIf="totalPages > 1" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.25rem;">
        <span style="font-size: 12px; color: #64748b; font-weight: 500;">
          إجمالي الأذونات: <strong style="color: #0f172a;">{{ totalCount }}</strong>
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

      <!-- Modal: Create Work Permit -->
      <div *ngIf="showCreateModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="clipboard-list" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">إصدار إذن تشغيل جديد</h3>
            </div>
            <button (click)="showCreateModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="savePermit()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">المركبة *</label>
                  <select [(ngModel)]="newPermit.vehicle" (change)="onVehicleSelected()" name="v_id" required class="form-select">
                    <option *ngFor="let v of activeVehicles" [value]="v.id">
                      {{ v.internal_fleet_number }} - {{ v.plate_number }} ({{ v.make }} {{ v.model }}) - العداد: {{ v.current_odometer | number }} كم
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">السائق المسؤول *</label>
                  <select [(ngModel)]="newPermit.driver" name="d_id" required class="form-select">
                    <option *ngFor="let d of drivers" [value]="d.id">{{ d.full_name }} ({{ d.phone }})</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">الجهة / القسم الطالب *</label>
                  <input type="text" [(ngModel)]="newPermit.requesting_department" name="dept" required class="form-control" placeholder="مثال: قطاع العمليات الميدانية" />
                </div>

                <div class="form-group">
                  <label class="form-label">تاريخ الانطلاق المخطط *</label>
                  <input type="date" [(ngModel)]="newPermit.departure_date" name="dep_date" required class="form-control" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">الوجهة ومسار الرحلة *</label>
                  <input type="text" [(ngModel)]="newPermit.destination" name="dest" required class="form-control" placeholder="مثال: الرياض -> الخرج -> حوطة بني تميم" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">الغرض من الرحلة والمهمة *</label>
                  <input type="text" [(ngModel)]="newPermit.purpose" name="purp" required class="form-control" placeholder="مثال: تسليم شحنة بضائع وفحص مستودع التوزيع" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">تعليمات وملاحظات إضافية للسائق</label>
                  <textarea [(ngModel)]="newPermit.description" name="desc" rows="2" class="form-control" placeholder="تعليمات فنية أو إرشادات أمان خاصة بالمهمة"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCreateModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ وإصدار إذن التشغيل</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Start Trip -->
      <div *ngIf="showStartTripModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="gauge" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تسجيل انطلاق الرحلة - {{ selectedPermit?.permit_number }}
              </h3>
            </div>
            <button (click)="showStartTripModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitStartTrip()">
            <div class="modal-body">
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; margin-bottom: 1.25rem; font-size: 12.5px;">
                <div style="margin-bottom: 4px;"><strong>المركبة: </strong> {{ selectedPermit?.fleet_number }} ({{ selectedPermit?.vehicle_plate }})</div>
                <div style="margin-bottom: 4px;"><strong>السائق: </strong> {{ selectedPermit?.driver_name }}</div>
                <div><strong>الوجهة: </strong> {{ selectedPermit?.destination }}</div>
              </div>

              <div class="form-group">
                <label class="form-label">قراءة عداد البداية الفعلي (كم) *</label>
                <input type="number" [(ngModel)]="tripStartingOdometer" name="start_odo" required min="0" class="form-control" />
                <span style="font-size: 11px; color: #64748b; margin-top: 4px; display: block;">
                  تنبيه: يجب أن تكون القراءة أكبر من أو مساوية لآخر قراءة مسجلة للمركبة.
                </span>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">وقت الانطلاق الفعلي</label>
                <input type="time" [(ngModel)]="tripDepartureTime" name="dep_time" class="form-control" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showStartTripModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تأكيد تسجيل الانطلاق</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Complete Trip -->
      <div *ngIf="showCompleteTripModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="check-circle" [size]="20" style="color: #059669;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                إتمام وعودة الرحلة - {{ selectedPermit?.permit_number }}
              </h3>
            </div>
            <button (click)="showCompleteTripModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitCompleteTrip()">
            <div class="modal-body">
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 1.25rem;">
                <div style="font-size: 12px; color: #065f46; margin-bottom: 4px;">
                  عداد البداية المسجل: <strong>{{ selectedPermit?.starting_odometer | number }} كم</strong>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 12px; color: #065f46; font-weight: 600;">المسافة المقطوعة المحتسبة:</span>
                  <span style="font-size: 1.25rem; font-weight: 800; color: #059669;">
                    {{ (tripEndingOdometer - (selectedPermit?.starting_odometer || 0)) > 0 ? ((tripEndingOdometer - (selectedPermit?.starting_odometer || 0)) | number) : 0 }} كم
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">قراءة عداد العودة الفعلي (كم) *</label>
                <input type="number"
                       [(ngModel)]="tripEndingOdometer"
                       name="end_odo"
                       required
                       [min]="selectedPermit?.starting_odometer || 0"
                       class="form-control" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem;">
                <div class="form-group">
                  <label class="form-label">تاريخ العودة</label>
                  <input type="date" [(ngModel)]="tripReturnDate" name="ret_date" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">وقت العودة</label>
                  <input type="time" [(ngModel)]="tripReturnTime" name="ret_time" class="form-control" />
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">ملاحظات ختامية للرحلة</label>
                <textarea [(ngModel)]="tripCompleteNotes"
                          name="ret_notes"
                          rows="2"
                          class="form-control"
                          placeholder="أي ملاحظات فنية أو حالة المركبة بعد العودة"></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCompleteTripModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تأكيد إنهاء الرحلة وتحديث العداد</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Cancel Permit -->
      <div *ngIf="showCancelModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="alert-triangle" [size]="20" style="color: #dc2626;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #dc2626; margin: 0;">
                إلغاء إذن التشغيل - {{ selectedPermit?.permit_number }}
              </h3>
            </div>
            <button (click)="showCancelModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitCancelPermit()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">سبب الإلغاء *</label>
                <textarea [(ngModel)]="cancelNotes"
                          name="canc_notes"
                          required
                          rows="3"
                          class="form-control"
                          placeholder="يرجى توضيح سبب إلغاء الإذن التشغيلي..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCancelModal = false" class="btn btn-secondary">تراجع</button>
              <button type="submit" class="btn btn-danger" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="x" [size]="16"></app-icon>
                <span>تأكيد الإلغاء</span>
              </button>
            </div>
          </form>
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
export class WorkPermitsComponent implements OnInit {
  private permitService = inject(WorkPermitService);
  private fleetService = inject(FleetService);
  private driverService = inject(DriverService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  permits: WorkPermit[] = [];
  activeVehicles: Vehicle[] = [];
  drivers: Driver[] = [];
  loading = true;

  searchQuery = '';
  selectedStatus = '';
  dateFrom = '';
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;

  showCreateModal = false;
  showStartTripModal = false;
  showCompleteTripModal = false;
  showCancelModal = false;
  selectedPermit: WorkPermit | null = null;

  tripStartingOdometer = 0;
  tripDepartureTime = '08:00';
  tripEndingOdometer = 0;
  tripReturnDate = new Date().toISOString().slice(0, 10);
  tripReturnTime = '17:00';
  tripCompleteNotes = '';
  cancelNotes = '';

  newPermit: Partial<WorkPermit> = {
    departure_date: new Date().toISOString().slice(0, 10),
    requesting_department: 'قسم العمليات والتشغيل'
  };

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  ngOnInit(): void {
    this.loadDropdownData();
    this.loadPermits();
  }

  loadDropdownData(): void {
    this.fleetService.getVehicles({ status: 'ACTIVE' }).subscribe({
      next: (res) => {
        this.activeVehicles = res.results;
        if (this.activeVehicles.length > 0 && !this.newPermit.vehicle) {
          this.newPermit.vehicle = this.activeVehicles[0].id;
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.driverService.getDrivers({ status: 'ACTIVE' }).subscribe({
      next: (res) => {
        this.drivers = res.results;
        if (this.drivers.length > 0 && !this.newPermit.driver) {
          this.newPermit.driver = this.drivers[0].id;
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadPermits(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.permitService.getPermits({
      search: this.searchQuery,
      status: this.selectedStatus,
      date_from: this.dateFrom,
      page: this.currentPage
    }).subscribe({
      next: (res) => {
        this.permits = res.results;
        this.totalCount = res.count;
        this.totalPages = res.total_pages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل أذونات التشغيل');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.dateFrom = '';
    this.currentPage = 1;
    this.loadPermits();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadPermits();
  }

  onVehicleSelected(): void {
    const v = this.activeVehicles.find(item => item.id === Number(this.newPermit.vehicle));
    if (v && v.assigned_driver) {
      this.newPermit.driver = v.assigned_driver;
    }
  }

  openCreateModal(): void {
    this.newPermit = {
      departure_date: new Date().toISOString().slice(0, 10),
      requesting_department: 'قسم العمليات والتشغيل',
      vehicle: this.activeVehicles[0]?.id,
      driver: this.drivers[0]?.id
    };
    this.showCreateModal = true;
  }

  savePermit(): void {
    this.permitService.createPermit(this.newPermit).subscribe({
      next: () => {
        this.toastService.success('تم إصدار إذن التشغيل بنجاح');
        this.showCreateModal = false;
        this.loadPermits();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل حفظ إذن التشغيل';
        this.toastService.error(msg);
      }
    });
  }

  approvePermit(p: WorkPermit): void {
    this.permitService.approvePermit(p.id).subscribe({
      next: () => {
        this.toastService.success(`تم اعتماد الإذن ${p.permit_number}`);
        this.loadPermits();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل اعتماد الإذن');
      }
    });
  }

  openStartTripModal(p: WorkPermit): void {
    this.selectedPermit = p;
    const v = this.activeVehicles.find(item => item.id === p.vehicle);
    this.tripStartingOdometer = v ? v.current_odometer : (p.starting_odometer || 0);
    this.tripDepartureTime = new Date().toTimeString().slice(0, 5);
    this.showStartTripModal = true;
  }

  submitStartTrip(): void {
    if (!this.selectedPermit) return;
    this.permitService.startTrip(this.selectedPermit.id, {
      starting_odometer: this.tripStartingOdometer,
      departure_time: this.tripDepartureTime + ':00'
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم تسجيل انطلاق الرحلة بنجاح');
        this.showStartTripModal = false;
        this.loadPermits();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل بدء الرحلة');
      }
    });
  }

  openCompleteTripModal(p: WorkPermit): void {
    this.selectedPermit = p;
    this.tripEndingOdometer = (p.starting_odometer || 0) + 50;
    this.tripReturnDate = new Date().toISOString().slice(0, 10);
    this.tripReturnTime = new Date().toTimeString().slice(0, 5);
    this.tripCompleteNotes = '';
    this.showCompleteTripModal = true;
  }

  submitCompleteTrip(): void {
    if (!this.selectedPermit) return;
    if (this.tripEndingOdometer < (this.selectedPermit.starting_odometer || 0)) {
      this.toastService.error('قراءة عداد العودة لا يمكن أن تكون أقل من قراءة عداد البداية');
      return;
    }

    this.permitService.completeTrip(this.selectedPermit.id, {
      ending_odometer: this.tripEndingOdometer,
      return_time: this.tripReturnTime + ':00',
      return_date: this.tripReturnDate,
      notes: this.tripCompleteNotes
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم إنهاء الرحلة وتحديث عداد المركبة بنجاح');
        this.showCompleteTripModal = false;
        this.loadPermits();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل إتمام الرحلة');
      }
    });
  }

  openCancelModal(p: WorkPermit): void {
    this.selectedPermit = p;
    this.cancelNotes = '';
    this.showCancelModal = true;
  }

  submitCancelPermit(): void {
    if (!this.selectedPermit) return;
    this.permitService.cancelPermit(this.selectedPermit.id, { notes: this.cancelNotes }).subscribe({
      next: () => {
        this.toastService.success('تم إلغاء إذن التشغيل');
        this.showCancelModal = false;
        this.loadPermits();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل إلغاء الإذن');
      }
    });
  }
}
