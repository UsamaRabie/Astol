import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FleetService } from '../../core/services/fleet.service';
import { FuelService } from '../../core/services/fuel.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Vehicle, VehicleType, VehicleModel, VehicleColor, Department, FuelType
} from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Page Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            أسطول المركبات
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            إدارة أصول الأسطول، متابعة قراءات العدادات، وثائق التشغيل، والحالات الميدانية
          </p>
        </div>

        <div>
          <!-- Only Admin can create vehicle -->
          <button *ngIf="isAdmin"
                  (click)="openCreateModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13.5px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>إضافة مركبة جديدة</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="padding: 1rem 1.25rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; align-items: flex-end;">
          <div>
            <label class="form-label">بحث سريع في الأسطول</label>
            <div style="position: relative;">
              <input type="text"
                     [(ngModel)]="searchQuery"
                     (keyup.enter)="loadVehicles()"
                     placeholder="رقم اللوحة، الأسطول، الهيكل، الطراز..."
                     class="form-control"
                     style="padding-left: 2rem;" />
              <app-icon name="search" [size]="16" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;"></app-icon>
            </div>
          </div>

          <div>
            <label class="form-label">الحالة التشغيلية</label>
            <select [(ngModel)]="selectedStatus" (change)="loadVehicles()" class="form-select">
              <option value="">جميع الحالات التشغيلية</option>
              <option value="ACTIVE">جاهزة وفي الخدمة (Active)</option>
              <option value="IN_MAINTENANCE">في الصيانة والإصلاح (In Maintenance)</option>
              <option value="OUT_OF_SERVICE">خارج الخدمة (Out of Service)</option>
              <option value="RETIRED">مستبعدة / خردة (Retired)</option>
            </select>
          </div>

          <div>
            <label class="form-label">تصنيف المركبة</label>
            <select [(ngModel)]="selectedType" (change)="loadVehicles()" class="form-select">
              <option value="">جميع التصنيفات</option>
              <option *ngFor="let t of vehicleTypes" [value]="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button (click)="loadVehicles()"
                    class="btn btn-secondary"
                    style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px;">
              <app-icon name="filter" [size]="15"></app-icon>
              <span>تطبيق التصفية</span>
            </button>
            <button (click)="resetFilters()"
                    class="btn btn-outline"
                    style="width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center;"
                    title="إعادة تعيين الفلاتر">
              <app-icon name="refresh" [size]="16"></app-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Fleet Table -->
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 120px;">الرقم الداخلي</th>
              <th>رقم اللوحة</th>
              <th>التصنيف</th>
              <th>الموديل والشركة</th>
              <th>سنة الصنع</th>
              <th>العداد الحالي</th>
              <th>نوع الوقود</th>
              <th>الحالة التشغيلية</th>
              <th>السائق المعين</th>
              <th style="text-align: center; width: 220px;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="10" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري جلب سجلات أسطول المركبات...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && vehicles.length === 0">
              <td colspan="10" style="text-align: center; padding: 3rem; color: #94a3b8;">
                <app-icon name="truck" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                <div style="font-weight: 600; color: #475569;">لا توجد مركبات مطابقة لمعايير البحث</div>
                <div style="font-size: 11.5px; color: #94a3b8;">حاول تعديل فلاتر البحث أو إضافة مركبة جديدة</div>
              </td>
            </tr>
            <tr *ngFor="let v of vehicles">
              <td>
                <a [routerLink]="['/vehicles', v.id]"
                   style="font-weight: 800; color: #0284c7; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                   <span>{{ v.internal_fleet_number }}</span>
                   <app-icon name="arrow-up-right" [size]="13"></app-icon>
                </a>
              </td>
              <td>
                <span class="plate-badge">{{ v.plate_number }}</span>
              </td>
              <td style="font-weight: 500; color: #334155;">{{ v.vehicle_type_name }}</td>
              <td style="font-weight: 600; color: #0f172a;">{{ v.make }} {{ v.model }}</td>
              <td style="color: #64748b; font-weight: 500;">{{ v.year }}</td>
              <td style="font-weight: 700; color: #059669;">
                {{ v.current_odometer | number }} <span style="font-size: 11px; font-weight: 500; color: #64748b;">كم</span>
              </td>
              <td>
                <span style="font-size: 12px; color: #475569;">{{ v.fuel_type_display }}</span>
              </td>
              <td>
                <span class="badge" [ngClass]="{
                  'badge-success': v.status === 'ACTIVE',
                  'badge-warning': v.status === 'IN_MAINTENANCE',
                  'badge-danger': v.status === 'OUT_OF_SERVICE',
                  'badge-secondary': v.status === 'RETIRED'
                }">
                  {{ v.status_display }}
                </span>
              </td>
              <td>
                <span *ngIf="v.driver_name" style="font-weight: 600; color: #334155;">{{ v.driver_name }}</span>
                <span *ngIf="!v.driver_name" style="color: #94a3b8; font-size: 12px;">غير معين</span>
              </td>
              <td style="text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 5px;">
                  <a [routerLink]="['/vehicles', v.id]"
                     class="btn btn-outline btn-sm"
                     style="display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; font-size: 11.5px; border-radius: 6px;"
                     title="عرض الملف التشغيلي للمركبة">
                    <app-icon name="eye" [size]="13"></app-icon>
                    <span>تفاصيل</span>
                  </a>

                  <button (click)="openOdometerModal(v)"
                          class="btn btn-secondary btn-sm"
                          style="display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; font-size: 11.5px; border-radius: 6px;"
                          title="تحديث قراءة العداد الحالي">
                    <app-icon name="gauge" [size]="13"></app-icon>
                    <span>العداد</span>
                  </button>

                  <!-- Admin Full CRUD: Edit and Delete -->
                  <button *ngIf="isAdmin"
                          (click)="openEditModal(v)"
                          class="btn btn-sm"
                          style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0284c7; display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; font-size: 11.5px; border-radius: 6px;"
                          title="تعديل بيانات المركبة">
                    <app-icon name="edit" [size]="13"></app-icon>
                    <span>تعديل</span>
                  </button>

                  <button *ngIf="isAdmin"
                          (click)="confirmDeleteVehicle(v)"
                          class="btn btn-sm"
                          style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; font-size: 11.5px; border-radius: 6px;"
                          title="حذف المركبة">
                    <app-icon name="trash" [size]="13"></app-icon>
                    <span>حذف</span>
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
          إجمالي المركبات المسجلة: <strong style="color: #0f172a;">{{ totalCount }}</strong> مركبة
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

      <!-- Modal: Create Vehicle -->
      <div *ngIf="showCreateModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="plus" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">إضافة مركبة جديدة للأسطول</h3>
            </div>
            <button (click)="showCreateModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveVehicle()">
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 1.5rem;">
              <!-- Section 1: Identification -->
              <div>
                <div style="font-size: 12.5px; font-weight: 700; color: #0284c7; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                  1. بيانات الهوية والتعريف بالمركبة
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">الرقم الداخلي (عداد النظام الآلي) *</label>
                    <div style="position: relative;">
                      <input type="text" [(ngModel)]="newVehicle.internal_fleet_number" name="fleet_no" required class="form-control" style="background: #f8fafc; font-weight: 700; color: #0284c7; padding-left: 75px;" readonly />
                      <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 10.5px; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px; font-weight: 700;">
                        عداد تلقائي
                      </span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">رقم اللوحة الرسمي *</label>
                    <input type="text" [(ngModel)]="newVehicle.plate_number" name="plate" required class="form-control" placeholder="مثال: أ ب ج 1234" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">تصنيف المركبة *</label>
                    <select [(ngModel)]="newVehicle.vehicle_type" name="type" required class="form-select">
                      <option *ngFor="let t of vehicleTypes" [value]="t.id">{{ t.name }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section 2: Technical Specifications with DROPDOWNS -->
              <div>
                <div style="font-size: 12.5px; font-weight: 700; color: #0284c7; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                  2. المواصفات الفنية وخيارات القوائم المنسدلة
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                  <!-- DROPDOWN: MODEL -->
                  <div class="form-group">
                    <label class="form-label">طراز المركبة (قائمة منسدلة) *</label>
                    <select [(ngModel)]="newVehicle.model" (change)="onModelSelect($event)" name="model" required class="form-select">
                      <option value="" disabled>-- اختر الطراز من القائمة --</option>
                      <option *ngFor="let m of vehicleModels" [value]="m.name">
                        {{ m.name }} ({{ m.make }})
                      </option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">الشركة الصانعة *</label>
                    <input type="text" [(ngModel)]="newVehicle.make" name="make" required class="form-control" placeholder="مثال: تويوتا" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">سنة الصنع *</label>
                    <input type="number" [(ngModel)]="newVehicle.year" name="year" required class="form-control" placeholder="2024" />
                  </div>

                  <!-- DROPDOWN: COLOR -->
                  <div class="form-group">
                    <label class="form-label">اللون الخارجي (قائمة منسدلة) *</label>
                    <select [(ngModel)]="newVehicle.color" name="color" required class="form-select">
                      <option value="" disabled>-- اختر اللون من القائمة --</option>
                      <option *ngFor="let c of vehicleColors" [value]="c.name">
                        {{ c.name }}
                      </option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">رقم الهيكل (VIN) *</label>
                    <input type="text" [(ngModel)]="newVehicle.vin" name="vin" required class="form-control" placeholder="17 حرف ورقم" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">قراءة العداد الافتتاحية (كم) *</label>
                    <input type="number" [(ngModel)]="newVehicle.current_odometer" name="odometer" required min="0" class="form-control" />
                  </div>

                  <!-- DROPDOWN: FUEL TYPE -->
                  <div class="form-group">
                    <label class="form-label">نوع الوقود (قائمة منسدلة) *</label>
                    <select [(ngModel)]="newVehicle.fuel_type" name="fuel" required class="form-select">
                      <option value="" disabled>-- اختر نوع الوقود --</option>
                      <option *ngFor="let f of fuelTypes" [value]="f.name">
                        {{ f.name }} ({{ f.price_per_liter }} {{ f.currency }}/لتر)
                      </option>
                    </select>
                  </div>

                  <!-- DROPDOWN: DEPARTMENT -->
                  <div class="form-group">
                    <label class="form-label">القسم أو الإدارة التابعة (قائمة منسدلة) *</label>
                    <select [(ngModel)]="newVehicle.department" name="dept" required class="form-select">
                      <option value="">-- اختر القسم أو الإدارة --</option>
                      <option *ngFor="let d of departments" [value]="d.name">
                        {{ d.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section 3: Official Documents -->
              <div>
                <div style="font-size: 12.5px; font-weight: 700; color: #0284c7; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                  3. التراخيص والوثائق الرسمية
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">انتهاء الاستمارة (رخصة السير)</label>
                    <input type="date" [(ngModel)]="newVehicle.registration_expiry_date" name="reg_exp" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">انتهاء وثيقة التأمين</label>
                    <input type="date" [(ngModel)]="newVehicle.insurance_expiry_date" name="ins_exp" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">انتهاء الفحص الدوري الفني</label>
                    <input type="date" [(ngModel)]="newVehicle.periodic_inspection_expiry_date" name="insp_exp" class="form-control" />
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCreateModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ المركبة وتسجيلها</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: EDIT Vehicle (Admin Full CRUD) -->
      <div *ngIf="showEditModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="edit" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تعديل بيانات المركبة #{{ editingVehicle?.internal_fleet_number }}
              </h3>
            </div>
            <button (click)="showEditModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveEditVehicle()">
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 1.5rem;">
              <div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">الرقم الداخلي بالأسطول</label>
                    <input type="text" [(ngModel)]="editingVehicle.internal_fleet_number" name="edit_fleet_no" class="form-control" readonly style="background: #f8fafc;" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">رقم اللوحة الرسمي *</label>
                    <input type="text" [(ngModel)]="editingVehicle.plate_number" name="edit_plate" required class="form-control" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">تصنيف المركبة *</label>
                    <select [(ngModel)]="editingVehicle.vehicle_type" name="edit_type" required class="form-select">
                      <option *ngFor="let t of vehicleTypes" [value]="t.id">{{ t.name }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">طراز المركبة (دروب داون) *</label>
                    <select [(ngModel)]="editingVehicle.model" (change)="onEditModelSelect($event)" name="edit_model" required class="form-select">
                      <option *ngFor="let m of vehicleModels" [value]="m.name">{{ m.name }} ({{ m.make }})</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">الشركة الصانعة *</label>
                    <input type="text" [(ngModel)]="editingVehicle.make" name="edit_make" required class="form-control" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">سنة الصنع *</label>
                    <input type="number" [(ngModel)]="editingVehicle.year" name="edit_year" required class="form-control" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">اللون الخارجي (دروب داون) *</label>
                    <select [(ngModel)]="editingVehicle.color" name="edit_color" required class="form-select">
                      <option *ngFor="let c of vehicleColors" [value]="c.name">{{ c.name }}</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">نوع الوقود (دروب داون) *</label>
                    <select [(ngModel)]="editingVehicle.fuel_type" name="edit_fuel" required class="form-select">
                      <option *ngFor="let f of fuelTypes" [value]="f.name">{{ f.name }} ({{ f.price_per_liter }} {{ f.currency }}/لتر)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">القسم أو الإدارة (دروب داون)</label>
                    <select [(ngModel)]="editingVehicle.department" name="edit_dept" class="form-select">
                      <option value="">-- اختر القسم --</option>
                      <option *ngFor="let d of departments" [value]="d.name">{{ d.name }}</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">الحالة التشغيلية *</label>
                    <select [(ngModel)]="editingVehicle.status" name="edit_status" required class="form-select">
                      <option value="ACTIVE">نشطة وفي الخدمة</option>
                      <option value="IN_MAINTENANCE">في الصيانة</option>
                      <option value="OUT_OF_SERVICE">خارج الخدمة</option>
                      <option value="RETIRED">مستبعدة / خردة</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">رقم الهيكل (VIN)</label>
                    <input type="text" [(ngModel)]="editingVehicle.vin" name="edit_vin" class="form-control" />
                  </div>
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

      <!-- Modal: Quick Update Odometer -->
      <div *ngIf="showOdometerModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="gauge" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تحديث عداد المركبة #{{ selectedVehicle?.internal_fleet_number }}
              </h3>
            </div>
            <button (click)="showOdometerModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitOdometerUpdate()">
            <div class="modal-body">
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; margin-bottom: 1.25rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 12px; color: #0369a1; font-weight: 600;">القراءة الحالية المعتمدة:</span>
                  <span style="font-size: 15px; font-weight: 800; color: #0284c7;">{{ selectedVehicle?.current_odometer | number }} كم</span>
                </div>
                <div style="font-size: 11px; color: #0284c7; opacity: 0.9;">
                  تنبيه: يشترط النظام إدخال قراءة جديدة مساوية أو أكبر من القراءة السابقة لمنع التراجع في الكيلومترات.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">القراءة الجديدة للعداد (كم) *</label>
                <input type="number"
                       [(ngModel)]="newOdometerReading"
                       name="new_odo"
                       required
                       [min]="selectedVehicle?.current_odometer || 0"
                       class="form-control" />
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">سبب التحديث أو ملاحظات المفتش</label>
                <textarea [(ngModel)]="odometerNotes"
                          name="odo_notes"
                          rows="3"
                          class="form-control"
                          placeholder="مثال: فحص دوري عند العودة من المهمة الميدانية..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showOdometerModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>اعتماد القراءة الجديدة</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Delete Vehicle Confirmation -->
      <div *ngIf="showDeleteModal" class="modal-overlay">
        <div class="modal-box" style="max-width: 440px; text-align: center; padding: 1.5rem;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <app-icon name="alert-triangle" [size]="28"></app-icon>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">تأكيد حذف المركبة</h3>
          <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1.5rem 0; line-height: 1.5;">
            هل أنت متأكد من رغبتك في حذف المركبة رقم <b>"{{ vehicleToDelete?.internal_fleet_number }} ({{ vehicleToDelete?.plate_number }})"</b>؟
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button (click)="showDeleteModal = false" class="btn btn-secondary">إلغاء</button>
            <button (click)="executeDeleteVehicle()" class="btn btn-danger" style="background: #ef4444; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer;">
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
export class VehicleListComponent implements OnInit {
  private fleetService = inject(FleetService);
  private fuelService = inject(FuelService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  vehicles: Vehicle[] = [];
  vehicleTypes: VehicleType[] = [];
  vehicleModels: VehicleModel[] = [];
  vehicleColors: VehicleColor[] = [];
  fuelTypes: FuelType[] = [];
  departments: Department[] = [];

  loading = true;

  searchQuery = '';
  selectedStatus = '';
  selectedType = '';
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;

  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showOdometerModal = false;

  selectedVehicle: Vehicle | null = null;
  vehicleToDelete: Vehicle | null = null;
  editingVehicle: any = {};
  newOdometerReading = 0;
  odometerNotes = '';

  newVehicle: Partial<Vehicle> = {
    fuel_type: 'ديزل',
    status: 'ACTIVE',
    current_odometer: 0,
    year: new Date().getFullYear()
  };

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get canWrite(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadVehicles();
  }

  loadLookups(): void {
    this.fleetService.getVehicleTypes().subscribe({
      next: (res) => {
        this.vehicleTypes = res.results || (res as any);
        this.cdr.markForCheck();
      }
    });

    this.fleetService.getVehicleModels().subscribe({
      next: (res) => {
        this.vehicleModels = res.results || (res as any);
        this.cdr.markForCheck();
      }
    });

    this.fleetService.getVehicleColors().subscribe({
      next: (res) => {
        this.vehicleColors = res.results || (res as any);
        this.cdr.markForCheck();
      }
    });

    this.fuelService.getFuelTypes().subscribe({
      next: (res) => {
        this.fuelTypes = res.results || (res as any);
        this.cdr.markForCheck();
      }
    });

    this.fleetService.getDepartments().subscribe({
      next: (res) => {
        this.departments = res.results || (res as any);
        this.cdr.markForCheck();
      }
    });
  }

  loadVehicles(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.fleetService.getVehicles({
      search: this.searchQuery,
      status: this.selectedStatus,
      vehicle_type: this.selectedType,
      page: this.currentPage
    }).subscribe({
      next: (res) => {
        this.vehicles = res.results;
        this.totalCount = res.count;
        this.totalPages = res.total_pages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل قائمة المركبات');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedType = '';
    this.currentPage = 1;
    this.loadVehicles();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadVehicles();
  }

  openCreateModal(): void {
    this.newVehicle = {
      internal_fleet_number: 'جاري التوليد...',
      fuel_type: this.fuelTypes[0]?.name || 'ديزل',
      status: 'ACTIVE',
      current_odometer: 0,
      year: new Date().getFullYear(),
      vehicle_type: this.vehicleTypes[0]?.id,
      model: this.vehicleModels[0]?.name || '',
      make: this.vehicleModels[0]?.make || '',
      color: this.vehicleColors[0]?.name || '',
      department: this.departments[0]?.name || ''
    };

    // Auto-fetch the counter generated fleet number
    this.fleetService.getNextFleetNumber().subscribe({
      next: (res) => {
        this.newVehicle.internal_fleet_number = res.next_fleet_number;
        this.cdr.markForCheck();
      },
      error: () => {
        this.newVehicle.internal_fleet_number = '';
      }
    });

    this.showCreateModal = true;
  }

  onModelSelect(event: any): void {
    const selectedName = event.target.value;
    const found = this.vehicleModels.find(m => m.name === selectedName);
    if (found && found.make) {
      this.newVehicle.make = found.make;
    }
  }

  onEditModelSelect(event: any): void {
    const selectedName = event.target.value;
    const found = this.vehicleModels.find(m => m.name === selectedName);
    if (found && found.make) {
      this.editingVehicle.make = found.make;
    }
  }

  saveVehicle(): void {
    this.fleetService.createVehicle(this.newVehicle).subscribe({
      next: () => {
        this.toastService.success('تمت إضافة المركبة بنجاح');
        this.showCreateModal = false;
        this.loadVehicles();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || err.error?.internal_fleet_number || 'فشل حفظ بيانات المركبة';
        this.toastService.error(msg);
      }
    });
  }

  openEditModal(v: Vehicle): void {
    this.editingVehicle = { ...v };
    this.showEditModal = true;
  }

  saveEditVehicle(): void {
    if (!this.editingVehicle.id) return;
    this.fleetService.updateVehicle(this.editingVehicle.id, this.editingVehicle).subscribe({
      next: () => {
        this.toastService.success('تم تحديث بيانات المركبة بنجاح');
        this.showEditModal = false;
        this.loadVehicles();
      },
      error: (err) => {
        const msg = err.error?.detail || 'فشل تعديل بيانات المركبة';
        this.toastService.error(msg);
      }
    });
  }

  confirmDeleteVehicle(v: Vehicle): void {
    this.vehicleToDelete = v;
    this.showDeleteModal = true;
  }

  executeDeleteVehicle(): void {
    if (!this.vehicleToDelete) return;
    this.fleetService.deleteVehicle(this.vehicleToDelete.id).subscribe({
      next: () => {
        this.toastService.success('تم حذف المركبة بنجاح');
        this.showDeleteModal = false;
        this.vehicleToDelete = null;
        this.loadVehicles();
      },
      error: (err) => {
        const msg = err.error?.detail || 'فشل حذف المركبة';
        this.toastService.error(msg);
      }
    });
  }

  openOdometerModal(v: Vehicle): void {
    this.selectedVehicle = v;
    this.newOdometerReading = v.current_odometer;
    this.odometerNotes = '';
    this.showOdometerModal = true;
  }

  submitOdometerUpdate(): void {
    if (!this.selectedVehicle) return;
    if (this.newOdometerReading < this.selectedVehicle.current_odometer) {
      this.toastService.error(`لا يمكن إدخال قراءة أقل من القراءة الحالية (${this.selectedVehicle.current_odometer} كم)`);
      return;
    }

    this.fleetService.updateOdometer(this.selectedVehicle.id, {
      new_reading: this.newOdometerReading,
      notes: this.odometerNotes,
      source: 'MANUAL'
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم تحديث العداد بنجاح');
        this.showOdometerModal = false;
        this.loadVehicles();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل تحديث قراءة العداد';
        this.toastService.error(msg);
      }
    });
  }
}
