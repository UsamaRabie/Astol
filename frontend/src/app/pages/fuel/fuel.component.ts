import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FuelService } from '../../core/services/fuel.service';
import { FleetService } from '../../core/services/fleet.service';
import { DriverService } from '../../core/services/driver.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { FuelRecord, Vehicle, Driver } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-fuel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            سجلات واستهلاك الوقود
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            توثيق عمليات التزود بالوقود، تدقيق المحطات والأسعار، وتحليل كفاءة الاستهلاك
          </p>
        </div>

        <div>
          <button *ngIf="canWrite"
                  (click)="openCreateModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13.5px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>تسجيل تعبئة وقود جديدة</span>
          </button>
        </div>
      </div>

      <!-- Summary Metrics Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
        <div class="card stat-card">
          <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div>
              <span class="stat-label">إجمالي تكلفة الوقود</span>
              <div class="stat-value" style="color: #0f172a;">
                {{ summary.total_cost | number:'1.2-2' }} <span style="font-size: 12px; font-weight: 600; color: #64748b;">ر.س</span>
              </div>
            </div>
            <div style="width: 40px; height: 40px; border-radius: 10px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center;">
              <app-icon name="fuel" [size]="20"></app-icon>
            </div>
          </div>
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
            لكافة مركبات الأسطول
          </div>
        </div>

        <div class="card stat-card">
          <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div>
              <span class="stat-label">إجمالي الكمية المزودة</span>
              <div class="stat-value" style="color: #0284c7;">
                {{ summary.total_quantity | number:'1.1-1' }} <span style="font-size: 12px; font-weight: 600; color: #64748b;">لتر</span>
              </div>
            </div>
            <div style="width: 40px; height: 40px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
              <app-icon name="gauge" [size]="20"></app-icon>
            </div>
          </div>
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
            ديزل وبنزين
          </div>
        </div>

        <div class="card stat-card">
          <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div>
              <span class="stat-label">متوسط سعر اللتر المعتمد</span>
              <div class="stat-value" style="color: #059669;">
                {{ summary.avg_price | number:'1.2-2' }} <span style="font-size: 12px; font-weight: 600; color: #64748b;">ر.س</span>
              </div>
            </div>
            <div style="width: 40px; height: 40px; border-radius: 10px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center;">
              <app-icon name="bar-chart" [size]="20"></app-icon>
            </div>
          </div>
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
            ريال / لتر حسب الفواتير
          </div>
        </div>

        <div class="card stat-card">
          <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div>
              <span class="stat-label">عدد حركات التعبئة</span>
              <div class="stat-value" style="color: #0f172a;">
                {{ summary.total_records }} <span style="font-size: 12px; font-weight: 600; color: #64748b;">عملية</span>
              </div>
            </div>
            <div style="width: 40px; height: 40px; border-radius: 10px; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
              <app-icon name="clipboard-list" [size]="20"></app-icon>
            </div>
          </div>
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
            حركات موثقة بالنظام
          </div>
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
                     placeholder="المحطة، اللوحة، السائق..."
                     class="form-control"
                     style="padding-left: 2rem;" />
              <app-icon name="search" [size]="16" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;"></app-icon>
            </div>
          </div>

          <div>
            <label class="form-label">نوع الوقود</label>
            <select [(ngModel)]="selectedFuelType" (change)="loadRecords()" class="form-select">
              <option value="">جميع الأنواع</option>
              <option value="DIESEL">ديزل</option>
              <option value="GASOLINE_91">بنزين 91</option>
              <option value="GASOLINE_95">بنزين 95</option>
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
              <th>تاريخ التعبئة</th>
              <th>العداد (كم)</th>
              <th>نوع الوقود</th>
              <th>الكمية (لتر)</th>
              <th>سعر اللتر (ر.س)</th>
              <th>التكلفة الإجمالية</th>
              <th>المحطة</th>
              <th>السائق</th>
              <th>المسؤول</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="10" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري تحميل سجلات الوقود...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && records.length === 0">
              <td colspan="10" style="text-align: center; padding: 3rem; color: #94a3b8;">
                <app-icon name="fuel" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                <div style="font-weight: 600; color: #475569;">لا توجد حركات تعبئة مسجلة</div>
              </td>
            </tr>
            <tr *ngFor="let r of records">
              <td>
                <span class="plate-badge">{{ r.vehicle_plate }}</span>
                <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ r.fleet_number }}</span>
              </td>
              <td>{{ r.date }}</td>
              <td style="font-weight: 600; color: #334155;">{{ r.odometer | number }} كم</td>
              <td>
                <span style="font-size: 12px; color: #475569;">{{ r.fuel_type_display }}</span>
              </td>
              <td style="font-weight: 700;">{{ r.quantity | number:'1.1-1' }} لتر</td>
              <td>{{ r.price_per_unit | number:'1.2-2' }}</td>
              <td style="font-weight: 800; color: #ea580c;">{{ r.total_cost | number:'1.2-2' }} ر.س</td>
              <td style="color: #475569;">{{ r.station || '-' }}</td>
              <td style="font-weight: 500;">{{ r.driver_name || '-' }}</td>
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

      <!-- Modal: Add Fuel Record -->
      <div *ngIf="showCreateModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="fuel" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تسجيل عملية تعبئة وقود جديدة
              </h3>
            </div>
            <button (click)="showCreateModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveFuelRecord()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">المركبة *</label>
                  <select [(ngModel)]="newRecord.vehicle" (change)="onVehicleSelected()" name="v_id" required class="form-select">
                    <option *ngFor="let v of vehicles" [value]="v.id">
                      {{ v.internal_fleet_number }} - {{ v.plate_number }} ({{ v.current_odometer | number }} كم)
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">السائق</label>
                  <select [(ngModel)]="newRecord.driver" name="d_id" class="form-select">
                    <option [ngValue]="null">غير محدد</option>
                    <option *ngFor="let d of drivers" [value]="d.id">{{ d.full_name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">تاريخ التعبئة *</label>
                  <input type="date" [(ngModel)]="newRecord.date" name="f_date" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">قراءة العداد (كم) *</label>
                  <input type="number" [(ngModel)]="newRecord.odometer" name="odo" required min="0" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">نوع الوقود *</label>
                  <select [(ngModel)]="newRecord.fuel_type" name="f_type" required class="form-select">
                    <option value="DIESEL">ديزل</option>
                    <option value="GASOLINE_91">بنزين 91</option>
                    <option value="GASOLINE_95">بنزين 95</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">الكمية (لتر) *</label>
                  <input type="number" step="0.01" [(ngModel)]="newRecord.quantity" (input)="calcTotal()" name="qty" required min="1" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">سعر اللتر (ر.س) *</label>
                  <input type="number" step="0.01" [(ngModel)]="newRecord.price_per_unit" (input)="calcTotal()" name="price" required min="0.1" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">التكلفة الإجمالية المحتسبة</label>
                  <div class="form-control" style="background: #fff7ed; border-color: #fed7aa; color: #ea580c; font-weight: 800; display: flex; align-items: center;">
                    {{ previewTotal | number:'1.2-2' }} ريال
                  </div>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">محطة الوقود</label>
                  <input type="text" [(ngModel)]="newRecord.station" name="station" class="form-control" placeholder="مثال: محطة الدريس - طريق الملك فهد" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">ملاحظات أو رقم الفاتورة</label>
                  <textarea [(ngModel)]="newRecord.notes" name="notes" rows="2" class="form-control" placeholder="رقم بطاقة الوقود، الفاتورة الضريبية..."></textarea>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCreateModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ وتأكيد السجل</span>
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
export class FuelComponent implements OnInit {
  private fuelService = inject(FuelService);
  private fleetService = inject(FleetService);
  private driverService = inject(DriverService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  records: FuelRecord[] = [];
  vehicles: Vehicle[] = [];
  drivers: Driver[] = [];
  loading = true;

  summary = {
    total_cost: 0,
    total_quantity: 0,
    total_records: 0,
    avg_price: 0
  };

  searchQuery = '';
  selectedFuelType = '';
  dateFrom = '';
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;

  showCreateModal = false;
  previewTotal = 0;

  newRecord: any = {
    date: new Date().toISOString().slice(0, 10),
    fuel_type: 'DIESEL',
    quantity: 50,
    price_per_unit: 1.15
  };

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  ngOnInit(): void {
    this.loadVehicles();
    this.loadDrivers();
    this.loadRecords();
  }

  loadVehicles(): void {
    this.fleetService.getVehicles().subscribe({
      next: (res) => {
        this.vehicles = res.results;
        if (this.vehicles.length > 0 && !this.newRecord.vehicle) {
          this.newRecord.vehicle = this.vehicles[0].id;
          this.onVehicleSelected();
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadDrivers(): void {
    this.driverService.getDrivers().subscribe({
      next: (res) => {
        this.drivers = res.results;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  onVehicleSelected(): void {
    const v = this.vehicles.find(item => item.id === Number(this.newRecord.vehicle));
    if (v) {
      this.newRecord.odometer = v.current_odometer;
      this.newRecord.fuel_type = v.fuel_type;
      this.newRecord.driver = v.assigned_driver;
      this.newRecord.price_per_unit = v.fuel_type === 'DIESEL' ? 1.15 : 2.18;
      this.calcTotal();
      this.cdr.markForCheck();
    }
  }

  calcTotal(): void {
    const q = Number(this.newRecord.quantity) || 0;
    const p = Number(this.newRecord.price_per_unit) || 0;
    this.previewTotal = Math.round(q * p * 100) / 100;
  }

  loadRecords(): void {
    this.loading = true;
    this.cdr.markForCheck();
    const params = {
      search: this.searchQuery,
      fuel_type: this.selectedFuelType,
      date_from: this.dateFrom,
      page: this.currentPage
    };

    this.fuelService.getRecords(params).subscribe({
      next: (res) => {
        this.records = res.results;
        this.totalCount = res.count;
        this.totalPages = res.total_pages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل سجلات الوقود');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });

    this.fuelService.getSummary(params).subscribe({
      next: (s) => {
        this.summary = s;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedFuelType = '';
    this.dateFrom = '';
    this.currentPage = 1;
    this.loadRecords();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadRecords();
  }

  openCreateModal(): void {
    const def = this.vehicles[0];
    this.newRecord = {
      vehicle: def?.id,
      driver: def?.assigned_driver,
      date: new Date().toISOString().slice(0, 10),
      odometer: def?.current_odometer || 0,
      fuel_type: def?.fuel_type || 'DIESEL',
      quantity: 50,
      price_per_unit: def?.fuel_type === 'DIESEL' ? 1.15 : 2.18
    };
    this.calcTotal();
    this.showCreateModal = true;
  }

  saveFuelRecord(): void {
    this.fuelService.createRecord(this.newRecord).subscribe({
      next: () => {
        this.toastService.success('تم تسجيل عملية التزود بالوقود بنجاح');
        this.showCreateModal = false;
        this.loadRecords();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل حفظ سجل الوقود');
      }
    });
  }
}
