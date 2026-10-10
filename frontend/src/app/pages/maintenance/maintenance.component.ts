import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { FleetService } from '../../core/services/fleet.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceRecord, MaintenanceType, Vehicle, VehiclePart } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            الصيانة وجداول الفحص الفني
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            توثيق الفحوصات الدورية، فواتير الإصلاح، مزودي الخدمة، وإعادة ضبط الفواصل الوقائية
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button (click)="evaluateFleet()"
                  [disabled]="evaluating"
                  class="btn btn-secondary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="refresh" [size]="15" [className]="evaluating ? 'spin' : ''"></app-icon>
            <span *ngIf="!evaluating">فحص الصيانة لكافة الأسطول</span>
            <span *ngIf="evaluating">جاري الفحص الشامل...</span>
          </button>

          <button *ngIf="canWrite"
                  (click)="openCreateModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13.5px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>تسجيل عملية صيانة جديدة</span>
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
                     (keyup.enter)="loadRecords()"
                     placeholder="الورشة، الفني، الوصف، اللوحة..."
                     class="form-control"
                     style="padding-left: 2rem;" />
              <app-icon name="search" [size]="16" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;"></app-icon>
            </div>
          </div>

          <div>
            <label class="form-label">نوع الصيانة</label>
            <select [(ngModel)]="selectedType" (change)="loadRecords()" class="form-select">
              <option value="">جميع أنواع الصيانة</option>
              <option *ngFor="let t of maintenanceTypes" [value]="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">من تاريخ</label>
            <input type="date" [(ngModel)]="dateFrom" (change)="loadRecords()" class="form-control" />
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button (click)="loadRecords()"
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
              <th>المركبة</th>
              <th>نوع الصيانة</th>
              <th>تاريخ الصيانة</th>
              <th>العداد عند الصيانة</th>
              <th>التكلفة (ر.س)</th>
              <th>مزود الخدمة / الورشة</th>
              <th>الفني المشرف</th>
              <th>القطع المستبدلة</th>
              <th>الحالة</th>
              <th>المسؤول</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="10" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري تحميل سجلات الصيانة...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && records.length === 0">
              <td colspan="10" style="text-align: center; padding: 3rem; color: #94a3b8;">
                <app-icon name="wrench" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                <div style="font-weight: 600; color: #475569;">لا توجد عمليات صيانة مسجلة</div>
                <div style="font-size: 11.5px; color: #94a3b8;">يمكنك توثيق عملية صيانة دورية أو إصلاح جديد</div>
              </td>
            </tr>
            <tr *ngFor="let r of records">
              <td>
                <span class="plate-badge">{{ r.vehicle_plate }}</span>
                <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ r.fleet_number }}</span>
              </td>
              <td style="font-weight: 700; color: #0f172a;">{{ r.maintenance_type_name }}</td>
              <td>{{ r.maintenance_date }}</td>
              <td style="font-weight: 600; color: #334155;">{{ r.odometer | number }} كم</td>
              <td style="font-weight: 700; color: #e11d48;">{{ r.cost | number:'1.2-2' }} ر.س</td>
              <td style="color: #475569;">{{ r.service_provider || '-' }}</td>
              <td style="color: #475569;">{{ r.technician || '-' }}</td>
              <td>
                <span *ngIf="!r.parts_replaced_details || r.parts_replaced_details.length === 0" style="color: #94a3b8; font-size: 12px;">-</span>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  <span *ngFor="let p of r.parts_replaced_details" class="badge badge-info" style="font-size: 10.5px;">
                    {{ p.name }}
                  </span>
                </div>
              </td>
              <td>
                <span class="badge badge-success" style="font-size: 11px;">{{ r.status_display }}</span>
              </td>
              <td style="font-size: 12px; color: #64748b;">{{ r.created_by_name || 'النظام المركزي' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div *ngIf="totalPages > 1" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.25rem;">
        <span style="font-size: 12px; color: #64748b; font-weight: 500;">
          إجمالي العمليات: <strong style="color: #0f172a;">{{ totalCount }}</strong>
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

      <!-- Modal: Create Maintenance Record -->
      <div *ngIf="showCreateModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="wrench" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تسجيل عملية صيانة وإصلاح
              </h3>
            </div>
            <button (click)="showCreateModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveRecord()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">المركبة المعنية *</label>
                  <select [(ngModel)]="newRecord.vehicle" (change)="onVehicleSelected()" name="v_id" required class="form-select">
                    <option *ngFor="let v of vehicles" [value]="v.id">
                      {{ v.internal_fleet_number }} - {{ v.plate_number }} ({{ v.make }} {{ v.model }})
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">نوع الصيانة *</label>
                  <select [(ngModel)]="newRecord.maintenance_type" name="type_id" required class="form-select">
                    <option *ngFor="let t of maintenanceTypes" [value]="t.id">{{ t.name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">تاريخ الصيانة *</label>
                  <input type="date" [(ngModel)]="newRecord.maintenance_date" name="m_date" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">قراءة العداد عند الصيانة (كم) *</label>
                  <input type="number" [(ngModel)]="newRecord.odometer" name="odo" required min="0" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">التكلفة الإجمالية (ر.س) *</label>
                  <input type="number" step="0.01" [(ngModel)]="newRecord.cost" name="cost" required min="0" class="form-control" placeholder="0.00" />
                </div>

                <div class="form-group">
                  <label class="form-label">مزود الخدمة / الورشة / الوكالة</label>
                  <input type="text" [(ngModel)]="newRecord.service_provider" name="provider" class="form-control" placeholder="مثال: مركز بترومين إكسبريس" />
                </div>

                <div class="form-group">
                  <label class="form-label">اسم الفني / المهندس المشرف</label>
                  <input type="text" [(ngModel)]="newRecord.technician" name="tech" class="form-control" placeholder="اسم الفني المشرف" />
                </div>

                <div class="form-group">
                  <label class="form-label">حالة العملية</label>
                  <select [(ngModel)]="newRecord.status" name="st" class="form-select">
                    <option value="COMPLETED">مكتملة</option>
                    <option value="IN_PROGRESS">قيد التنفيذ</option>
                    <option value="SCHEDULED">مجدولة</option>
                  </select>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">تفاصيل الأعمال والإصلاحات المنفذة</label>
                  <textarea [(ngModel)]="newRecord.description" name="desc" rows="2" class="form-control" placeholder="تفاصيل الإصلاحات أو بنود الفاتورة"></textarea>
                </div>

                <!-- Select Replaced Parts -->
                <div class="form-group" style="grid-column: span 2;" *ngIf="vehicleParts.length > 0">
                  <label class="form-label">القطع المستبدلة (إن وجدت)</label>
                  <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <label *ngFor="let vp of vehicleParts" style="display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                      <input type="checkbox" [checked]="isPartSelected(vp.id)" (change)="togglePartSelection(vp.id)" />
                      <span>{{ vp.part_name }}</span>
                    </label>
                  </div>
                  <div style="margin-top: 8px;">
                    <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #0369a1; font-weight: 700; cursor: pointer;">
                      <input type="checkbox" [(ngModel)]="newRecord.reset_parts_intervals" name="reset_intervals" />
                      <span>إعادة ضبط فواصل الصيانة وتحديث حالة القطع المستبدلة تلقائياً إلى (سليم)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCreateModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ وتأكيد الصيانة</span>
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
export class MaintenanceComponent implements OnInit {
  private maintenanceService = inject(MaintenanceService);
  private fleetService = inject(FleetService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  records: MaintenanceRecord[] = [];
  maintenanceTypes: MaintenanceType[] = [];
  vehicles: Vehicle[] = [];
  vehicleParts: VehiclePart[] = [];
  loading = true;
  evaluating = false;

  searchQuery = '';
  selectedType = '';
  dateFrom = '';
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;

  showCreateModal = false;
  selectedPartIds: number[] = [];

  newRecord: any = {
    maintenance_date: new Date().toISOString().slice(0, 10),
    status: 'COMPLETED',
    cost: 0,
    reset_parts_intervals: true
  };

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  ngOnInit(): void {
    this.loadTypes();
    this.loadVehicles();
    this.loadRecords();
  }

  loadTypes(): void {
    this.maintenanceService.getTypes().subscribe({
      next: (res) => {
        this.maintenanceTypes = res.results;
        if (this.maintenanceTypes.length > 0 && !this.newRecord.maintenance_type) {
          this.newRecord.maintenance_type = this.maintenanceTypes[0].id;
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadVehicles(): void {
    this.fleetService.getVehicles().subscribe({
      next: (res) => {
        this.vehicles = res.results;
        if (this.vehicles.length > 0 && !this.newRecord.vehicle) {
          this.newRecord.vehicle = this.vehicles[0].id;
          this.newRecord.odometer = this.vehicles[0].current_odometer;
          this.onVehicleSelected();
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  onVehicleSelected(): void {
    const v = this.vehicles.find(item => item.id === Number(this.newRecord.vehicle));
    if (v) {
      this.newRecord.odometer = v.current_odometer;
      this.fleetService.getVehicleParts(v.id).subscribe({
        next: (p) => {
          this.vehicleParts = p;
          this.cdr.markForCheck();
        },
        error: () => {}
      });
    }
  }

  loadRecords(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.maintenanceService.getRecords({
      search: this.searchQuery,
      maintenance_type: this.selectedType,
      date_from: this.dateFrom,
      page: this.currentPage
    }).subscribe({
      next: (res) => {
        this.records = res.results;
        this.totalCount = res.count;
        this.totalPages = res.total_pages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل سجلات الصيانة');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedType = '';
    this.dateFrom = '';
    this.currentPage = 1;
    this.loadRecords();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadRecords();
  }

  evaluateFleet(): void {
    this.evaluating = true;
    this.cdr.markForCheck();
    this.maintenanceService.evaluateFleet().subscribe({
      next: (res) => {
        this.evaluating = false;
        this.toastService.success(res.message || 'تم فحص الأسطول وتحديث تنبيهات الصيانة');
        this.loadRecords();
        this.cdr.markForCheck();
      },
      error: () => {
        this.evaluating = false;
        this.toastService.error('فشل تنفيذ فحص الصيانة');
        this.cdr.markForCheck();
      }
    });
  }

  openCreateModal(): void {
    const defaultVehicle = this.vehicles[0];
    this.newRecord = {
      vehicle: defaultVehicle?.id,
      maintenance_type: this.maintenanceTypes[0]?.id,
      maintenance_date: new Date().toISOString().slice(0, 10),
      odometer: defaultVehicle?.current_odometer || 0,
      status: 'COMPLETED',
      cost: 0,
      reset_parts_intervals: true
    };
    this.selectedPartIds = [];
    if (defaultVehicle) {
      this.onVehicleSelected();
    }
    this.showCreateModal = true;
  }

  isPartSelected(id: number): boolean {
    return this.selectedPartIds.includes(id);
  }

  togglePartSelection(id: number): void {
    if (this.isPartSelected(id)) {
      this.selectedPartIds = this.selectedPartIds.filter(x => x !== id);
    } else {
      this.selectedPartIds.push(id);
    }
  }

  saveRecord(): void {
    this.newRecord.parts_replaced = this.selectedPartIds;
    this.maintenanceService.createRecord(this.newRecord).subscribe({
      next: () => {
        this.toastService.success('تم تسجيل عملية الصيانة وتحديث السجلات بنجاح');
        this.showCreateModal = false;
        this.loadRecords();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل حفظ سجل الصيانة';
        this.toastService.error(msg);
      }
    });
  }
}
