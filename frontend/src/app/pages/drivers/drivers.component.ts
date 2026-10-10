import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverService } from '../../core/services/driver.service';
import { FleetService } from '../../core/services/fleet.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Driver, DriverAssignment, Vehicle } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            السائقون والكوادر الميدانية
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            إدارة بيانات السائقين، رخص القيادة وسريانها، وتوثيق سجلات إسناد المركبات تاريخياً
          </p>
        </div>

        <div>
          <button *ngIf="canWrite"
                  (click)="openCreateModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13.5px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>إضافة سائق جديد</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="padding: 1rem 1.25rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; align-items: flex-end;">
          <div>
            <label class="form-label">بحث سريع</label>
            <div style="position: relative;">
              <input type="text"
                     [(ngModel)]="searchQuery"
                     (keyup.enter)="loadDrivers()"
                     placeholder="الاسم، الهوية، الجوال، الرخصة..."
                     class="form-control"
                     style="padding-left: 2rem;" />
              <app-icon name="search" [size]="16" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;"></app-icon>
            </div>
          </div>

          <div>
            <label class="form-label">حالة العمل</label>
            <select [(ngModel)]="selectedStatus" (change)="loadDrivers()" class="form-select">
              <option value="">جميع الحالات</option>
              <option value="ACTIVE">على رأس العمل (نشط)</option>
              <option value="ON_LEAVE">في إجازة رسمية</option>
              <option value="SUSPENDED">موقوف عن العمل</option>
              <option value="TERMINATED">منتهي الخدمة</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button (click)="loadDrivers()"
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
              <th>اسم السائق</th>
              <th>رقم الهوية / الإقامة</th>
              <th>رقم الجوال</th>
              <th>رقم رخصة القيادة</th>
              <th>تاريخ انتهاء الرخصة</th>
              <th>المركبة المسندة حالياً</th>
              <th>الحالة</th>
              <th *ngIf="canWrite" style="text-align: center; width: 180px;">إجراءات الإسناد</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="8" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري تحميل قائمة السائقين...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && drivers.length === 0">
              <td colspan="8" style="text-align: center; padding: 3rem; color: #94a3b8;">
                <app-icon name="users" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                <div style="font-weight: 600; color: #475569;">لا يوجد سائقين مسجلين</div>
              </td>
            </tr>
            <tr *ngFor="let d of drivers">
              <td style="font-weight: 700; color: #0f172a;">{{ d.full_name }}</td>
              <td style="font-family: monospace; font-size: 12px; color: #334155;">{{ d.national_id }}</td>
              <td>{{ d.phone }}</td>
              <td style="font-family: monospace; font-size: 12px; color: #334155;">{{ d.license_number }}</td>
              <td>{{ d.license_expiry_date }}</td>
              <td>
                <div *ngIf="d.current_vehicle_fleet">
                  <span class="plate-badge">{{ d.current_vehicle_plate }}</span>
                  <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ d.current_vehicle_fleet }}</span>
                </div>
                <span *ngIf="!d.current_vehicle_fleet" style="color: #94a3b8; font-size: 12px;">غير معين</span>
              </td>
              <td>
                <span class="badge" [ngClass]="{
                  'badge-success': d.status === 'ACTIVE',
                  'badge-warning': d.status === 'ON_LEAVE',
                  'badge-danger': d.status === 'SUSPENDED' || d.status === 'TERMINATED'
                }" style="font-size: 11px;">
                  {{ d.status_display }}
                </span>
              </td>
              <td *ngIf="canWrite" style="text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <button (click)="openAssignModal(d)"
                          class="btn btn-secondary btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11.5px;"
                          title="إسناد مركبة للسائق">
                    <app-icon name="truck" [size]="12"></app-icon>
                    <span>إسناد مركبة</span>
                  </button>
                  <button (click)="openHistoryModal(d)"
                          class="btn btn-outline btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11.5px;"
                          title="عرض سجل الإسناد السابق">
                    <app-icon name="clipboard-list" [size]="12"></app-icon>
                    <span>التاريخ</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal: Add Driver -->
      <div *ngIf="showCreateModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="user" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                إضافة سائق جديد للنظام
              </h3>
            </div>
            <button (click)="showCreateModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveDriver()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">الاسم الكامل للسائق *</label>
                <input type="text" [(ngModel)]="newDriver.full_name" name="name" required class="form-control" placeholder="الاسم الرباعي الرسمي" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem;">
                <div class="form-group">
                  <label class="form-label">رقم الهوية الوطنية / الإقامة *</label>
                  <input type="text" [(ngModel)]="newDriver.national_id" name="nid" required class="form-control" placeholder="10 أرقام" />
                </div>
                <div class="form-group">
                  <label class="form-label">رقم الجوال *</label>
                  <input type="text" [(ngModel)]="newDriver.phone" name="phone" required class="form-control" placeholder="05xxxxxxxx" />
                </div>
                <div class="form-group">
                  <label class="form-label">رقم رخصة القيادة *</label>
                  <input type="text" [(ngModel)]="newDriver.license_number" name="lic" required class="form-control" placeholder="رقم الرخصة" />
                </div>
                <div class="form-group">
                  <label class="form-label">تاريخ انتهاء الرخصة *</label>
                  <input type="date" [(ngModel)]="newDriver.license_expiry_date" name="exp" required class="form-control" />
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">حالة العمل</label>
                <select [(ngModel)]="newDriver.status" name="st" class="form-select">
                  <option value="ACTIVE">نشط (على رأس العمل)</option>
                  <option value="ON_LEAVE">في إجازة رسمية</option>
                  <option value="SUSPENDED">موقوف مؤقتاً</option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCreateModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ بيانات السائق</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Assign Vehicle -->
      <div *ngIf="showAssignModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="truck" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                إسناد مركبة: {{ selectedDriver?.full_name }}
              </h3>
            </div>
            <button (click)="showAssignModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitAssignment()">
            <div class="modal-body">
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; margin-bottom: 1.25rem; font-size: 12px; color: #0369a1;">
                ملاحظة: سيقوم النظام بإنهاء أي حركة إسناد نشطة سابقة للمركبة أو السائق وتوثيق هذه الحركة في السجل التاريخي.
              </div>

              <div class="form-group">
                <label class="form-label">اختر المركبة من الأسطول *</label>
                <select [(ngModel)]="assignVehicleId" name="v_id" required class="form-select">
                  <option *ngFor="let v of vehicles" [value]="v.id">
                    {{ v.internal_fleet_number }} - {{ v.plate_number }} ({{ v.make }} {{ v.model }})
                  </option>
                </select>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">تاريخ بدء الإسناد الرسمي *</label>
                <input type="date" [(ngModel)]="assignStartDate" name="start_date" required class="form-control" />
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">ملاحظات التسليم والاستلام</label>
                <textarea [(ngModel)]="assignNotes" name="a_notes" rows="3" class="form-control" placeholder="حالة المركبة عند التسليم، العهد، المفاتيح..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showAssignModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تأكيد الإسناد الرسمي</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: History -->
      <div *ngIf="showHistoryModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="clipboard-list" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                سجل إسناد المركبات التاريخي: {{ selectedDriver?.full_name }}
              </h3>
            </div>
            <button (click)="showHistoryModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <div class="modal-body">
            <div *ngIf="assignmentHistory.length === 0" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
              لا توجد سجلات إسناد سابقة مسجلة لهذا السائق
            </div>

            <div class="table-container" *ngIf="assignmentHistory.length > 0">
              <table class="table" style="font-size: 12.5px;">
                <thead>
                  <tr>
                    <th>المركبة</th>
                    <th>تاريخ البدء</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الحالة</th>
                    <th>المسؤول المعتمد</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of assignmentHistory">
                    <td style="font-weight: 700; color: #0284c7;">{{ a.fleet_number }} ({{ a.vehicle_plate }})</td>
                    <td>{{ a.start_date }}</td>
                    <td>{{ a.end_date || 'مستمر حتى الآن' }}</td>
                    <td>
                      <span class="badge" [ngClass]="a.is_active ? 'badge-success' : 'badge-secondary'" style="font-size: 10.5px;">
                        {{ a.is_active ? 'نشط حالياً' : 'منتهي' }}
                      </span>
                    </td>
                    <td style="color: #64748b;">{{ a.assigned_by_name || 'النظام' }}</td>
                    <td style="color: #64748b;">{{ a.notes || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="showHistoryModal = false" class="btn btn-secondary">إغلاق</button>
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
export class DriversComponent implements OnInit {
  private driverService = inject(DriverService);
  private fleetService = inject(FleetService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  drivers: Driver[] = [];
  vehicles: Vehicle[] = [];
  loading = true;

  searchQuery = '';
  selectedStatus = '';

  showCreateModal = false;
  showAssignModal = false;
  showHistoryModal = false;
  selectedDriver: Driver | null = null;
  assignmentHistory: DriverAssignment[] = [];

  newDriver: Partial<Driver> = {
    status: 'ACTIVE',
    license_expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  };

  assignVehicleId: number | null = null;
  assignStartDate = new Date().toISOString().slice(0, 10);
  assignNotes = '';

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  ngOnInit(): void {
    this.loadVehicles();
    this.loadDrivers();
  }

  loadVehicles(): void {
    this.fleetService.getVehicles().subscribe({
      next: (res) => {
        this.vehicles = res.results;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadDrivers(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.driverService.getDrivers({
      search: this.searchQuery,
      status: this.selectedStatus
    }).subscribe({
      next: (res) => {
        this.drivers = res.results;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل بيانات السائقين');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.loadDrivers();
  }

  openCreateModal(): void {
    this.newDriver = {
      status: 'ACTIVE',
      license_expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    };
    this.showCreateModal = true;
  }

  saveDriver(): void {
    this.driverService.createDriver(this.newDriver).subscribe({
      next: () => {
        this.toastService.success('تمت إضافة السائق بنجاح');
        this.showCreateModal = false;
        this.loadDrivers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل حفظ بيانات السائق';
        this.toastService.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  openAssignModal(d: Driver): void {
    this.selectedDriver = d;
    this.assignVehicleId = this.vehicles[0]?.id || null;
    this.assignStartDate = new Date().toISOString().slice(0, 10);
    this.assignNotes = '';
    this.showAssignModal = true;
  }

  submitAssignment(): void {
    if (!this.selectedDriver || !this.assignVehicleId) return;
    this.driverService.assignVehicle(this.selectedDriver.id, {
      vehicle_id: this.assignVehicleId,
      start_date: this.assignStartDate,
      notes: this.assignNotes
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم إسناد المركبة بنجاح');
        this.showAssignModal = false;
        this.loadDrivers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل إسناد المركبة');
        this.cdr.markForCheck();
      }
    });
  }

  openHistoryModal(d: Driver): void {
    this.selectedDriver = d;
    this.driverService.getDriverHistory(d.id).subscribe({
      next: (h) => {
        this.assignmentHistory = h;
        this.showHistoryModal = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل سجل الإسناد');
        this.cdr.markForCheck();
      }
    });
  }
}
