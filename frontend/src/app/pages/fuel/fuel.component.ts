import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FuelService } from '../../core/services/fuel.service';
import { FleetService } from '../../core/services/fleet.service';
import { DriverService } from '../../core/services/driver.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { FuelRecord, FuelType, Vehicle, Driver } from '../../core/models/models';
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
            توثيق عمليات التزود بالوقود، تطبيق الأسعار المعتمدة تلقائياً، والتحكم الكامل في السجلات
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
            حسب أنواع الوقود المسجلة
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
            ريال / لتر حسب الأسعار
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
              <option value="">جميع أنواع الوقود</option>
              <option *ngFor="let f of fuelTypes" [value]="f.name">{{ f.name }}</option>
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
              <th>سعر اللتر المعتمد</th>
              <th>التكلفة الإجمالية</th>
              <th>المحطة</th>
              <th>السائق</th>
              <th>المسؤول</th>
              <th *ngIf="isAdmin" style="text-align: center; width: 140px;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td [attr.colspan]="isAdmin ? 11 : 10" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري تحميل سجلات الوقود...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && records.length === 0">
              <td [attr.colspan]="isAdmin ? 11 : 10" style="text-align: center; padding: 3rem; color: #94a3b8;">
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
                <span style="background: #f0f9ff; color: #0284c7; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 12px;">
                  {{ r.fuel_type_display || r.fuel_type }}
                </span>
              </td>
              <td style="font-weight: 700;">{{ r.quantity | number:'1.1-1' }} لتر</td>
              <td>{{ r.price_per_unit | number:'1.2-2' }} ر.س</td>
              <td style="font-weight: 800; color: #ea580c;">{{ r.total_cost | number:'1.2-2' }} ر.س</td>
              <td style="color: #475569;">{{ r.station || '-' }}</td>
              <td style="font-weight: 500;">{{ r.driver_name || '-' }}</td>
              <td style="font-size: 12px; color: #64748b;">{{ r.created_by_name || 'النظام المركزي' }}</td>

              <!-- Admin Full CRUD: Edit and Delete -->
              <td *ngIf="isAdmin" style="text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <button (click)="openEditModal(r)"
                          class="btn btn-sm"
                          style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0284c7; padding: 4px 8px; font-size: 11.5px; border-radius: 6px;"
                          title="تعديل سجل الوقود">
                    <app-icon name="edit" [size]="13"></app-icon>
                    <span>تعديل</span>
                  </button>
                  <button (click)="confirmDeleteRecord(r)"
                          class="btn btn-sm"
                          style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 4px 8px; font-size: 11.5px; border-radius: 6px;"
                          title="حذف السجل">
                    <app-icon name="trash" [size]="13"></app-icon>
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

                <!-- DROPDOWN FUEL TYPE: Auto-fills price -->
                <div class="form-group">
                  <label class="form-label">نوع الوقود (قائمة منسدلة) *</label>
                  <select [(ngModel)]="newRecord.fuel_type" (change)="onFuelTypeSelected($event)" name="f_type" required class="form-select">
                    <option *ngFor="let f of fuelTypes" [value]="f.name">
                      {{ f.name }} ({{ f.price_per_liter }} {{ f.currency }}/لتر)
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">الكمية المزودة (لتر) *</label>
                  <input type="number" step="0.01" [(ngModel)]="newRecord.quantity" (input)="calcTotal()" name="qty" required min="1" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">سعر اللتر المعتمد (ر.س) *</label>
                  <div style="position: relative;">
                    <input type="number" step="0.01" [(ngModel)]="newRecord.price_per_unit" (input)="calcTotal()" name="price" required min="0.1" class="form-control" style="background: #f8fafc; font-weight: 700; color: #0284c7;" />
                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                      تلقائي
                    </span>
                  </div>
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

      <!-- Modal: EDIT Fuel Record (Admin Full CRUD) -->
      <div *ngIf="showEditModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="edit" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تعديل سجل تعبئة الوقود
              </h3>
            </div>
            <button (click)="showEditModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveEditRecord()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">المركبة *</label>
                  <select [(ngModel)]="editingRecord.vehicle" name="edit_v_id" required class="form-select">
                    <option *ngFor="let v of vehicles" [value]="v.id">
                      {{ v.internal_fleet_number }} - {{ v.plate_number }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">السائق</label>
                  <select [(ngModel)]="editingRecord.driver" name="edit_d_id" class="form-select">
                    <option [ngValue]="null">غير محدد</option>
                    <option *ngFor="let d of drivers" [value]="d.id">{{ d.full_name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">تاريخ التعبئة *</label>
                  <input type="date" [(ngModel)]="editingRecord.date" name="edit_f_date" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">قراءة العداد (كم) *</label>
                  <input type="number" [(ngModel)]="editingRecord.odometer" name="edit_odo" required min="0" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">نوع الوقود *</label>
                  <select [(ngModel)]="editingRecord.fuel_type" (change)="onEditFuelTypeSelected($event)" name="edit_f_type" required class="form-select">
                    <option *ngFor="let f of fuelTypes" [value]="f.name">
                      {{ f.name }} ({{ f.price_per_liter }} {{ f.currency }}/لتر)
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">الكمية (لتر) *</label>
                  <input type="number" step="0.01" [(ngModel)]="editingRecord.quantity" (input)="calcEditTotal()" name="edit_qty" required min="1" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">سعر اللتر (ر.س) *</label>
                  <input type="number" step="0.01" [(ngModel)]="editingRecord.price_per_unit" (input)="calcEditTotal()" name="edit_price" required min="0.1" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">التكلفة الإجمالية</label>
                  <div class="form-control" style="background: #fff7ed; border-color: #fed7aa; color: #ea580c; font-weight: 800; display: flex; align-items: center;">
                    {{ editPreviewTotal | number:'1.2-2' }} ريال
                  </div>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">محطة الوقود</label>
                  <input type="text" [(ngModel)]="editingRecord.station" name="edit_station" class="form-control" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">ملاحظات</label>
                  <textarea [(ngModel)]="editingRecord.notes" name="edit_notes" rows="2" class="form-control"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showEditModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Delete Confirmation -->
      <div *ngIf="showDeleteModal" class="modal-overlay">
        <div class="modal-box" style="max-width: 420px; text-align: center; padding: 1.5rem;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <app-icon name="alert-triangle" [size]="28"></app-icon>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">تأكيد حذف سجل الوقود</h3>
          <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1.5rem 0; line-height: 1.5;">
            هل أنت متأكد من رغبتك في حذف هذا السجل للمركبة <b>{{ recordToDelete?.fleet_number }}</b> بتاريخ {{ recordToDelete?.date }}؟
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button (click)="showDeleteModal = false" class="btn btn-secondary">إلغاء</button>
            <button (click)="executeDeleteRecord()" class="btn btn-danger" style="background: #ef4444; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer;">
              تأكيد الحذف
            </button>
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
  fuelTypes: FuelType[] = [];
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
  showEditModal = false;
  showDeleteModal = false;

  previewTotal = 0;
  editPreviewTotal = 0;
  recordToDelete: FuelRecord | null = null;
  editingRecord: any = {};

  newRecord: any = {
    date: new Date().toISOString().slice(0, 10),
    fuel_type: 'ديزل',
    quantity: 50,
    price_per_unit: 1.15
  };

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.loadFuelTypes();
    this.loadVehicles();
    this.loadDrivers();
    this.loadRecords();
  }

  loadFuelTypes(): void {
    this.fuelService.getFuelTypes().subscribe({
      next: (res) => {
        this.fuelTypes = res.results || (res as any);
        if (this.fuelTypes.length > 0 && !this.newRecord.fuel_type) {
          this.newRecord.fuel_type = this.fuelTypes[0].name;
          this.newRecord.price_per_unit = Number(this.fuelTypes[0].price_per_liter);
          this.calcTotal();
        }
        this.cdr.markForCheck();
      }
    });
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
      this.newRecord.driver = v.assigned_driver;
      // Match vehicle fuel type with our fuelTypes
      const match = this.fuelTypes.find(f => f.name.toLowerCase() === (v.fuel_type || '').toLowerCase());
      if (match) {
        this.newRecord.fuel_type = match.name;
        this.newRecord.price_per_unit = Number(match.price_per_liter);
      }
      this.calcTotal();
      this.cdr.markForCheck();
    }
  }

  onFuelTypeSelected(event: any): void {
    const selectedName = event.target.value;
    const found = this.fuelTypes.find(f => f.name === selectedName);
    if (found) {
      this.newRecord.price_per_unit = Number(found.price_per_liter);
      this.calcTotal();
    }
  }

  onEditFuelTypeSelected(event: any): void {
    const selectedName = event.target.value;
    const found = this.fuelTypes.find(f => f.name === selectedName);
    if (found) {
      this.editingRecord.price_per_unit = Number(found.price_per_liter);
      this.calcEditTotal();
    }
  }

  calcTotal(): void {
    const q = Number(this.newRecord.quantity) || 0;
    const p = Number(this.newRecord.price_per_unit) || 0;
    this.previewTotal = Math.round(q * p * 100) / 100;
  }

  calcEditTotal(): void {
    const q = Number(this.editingRecord.quantity) || 0;
    const p = Number(this.editingRecord.price_per_unit) || 0;
    this.editPreviewTotal = Math.round(q * p * 100) / 100;
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
    const defaultFuel = this.fuelTypes[0];
    this.newRecord = {
      vehicle: def?.id,
      driver: def?.assigned_driver,
      date: new Date().toISOString().slice(0, 10),
      odometer: def?.current_odometer || 0,
      fuel_type: defaultFuel?.name || 'ديزل',
      quantity: 50,
      price_per_unit: defaultFuel ? Number(defaultFuel.price_per_liter) : 1.15
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

  openEditModal(r: FuelRecord): void {
    this.editingRecord = { ...r };
    this.calcEditTotal();
    this.showEditModal = true;
  }

  saveEditRecord(): void {
    if (!this.editingRecord.id) return;
    this.fuelService.updateRecord(this.editingRecord.id, this.editingRecord).subscribe({
      next: () => {
        this.toastService.success('تم تحديث سجل الوقود بنجاح');
        this.showEditModal = false;
        this.loadRecords();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل تعديل سجل الوقود');
      }
    });
  }

  confirmDeleteRecord(r: FuelRecord): void {
    this.recordToDelete = r;
    this.showDeleteModal = true;
  }

  executeDeleteRecord(): void {
    if (!this.recordToDelete) return;
    this.fuelService.deleteRecord(this.recordToDelete.id).subscribe({
      next: () => {
        this.toastService.success('تم حذف سجل الوقود بنجاح');
        this.showDeleteModal = false;
        this.recordToDelete = null;
        this.loadRecords();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل حذف سجل الوقود');
      }
    });
  }
}
