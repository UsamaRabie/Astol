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
              <th *ngIf="isAdmin" style="text-align: center;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td [attr.colspan]="isAdmin ? 11 : 10" style="text-align: center; padding: 3rem; color: #64748b;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                  <span>جاري تحميل سجلات الصيانة...</span>
                </div>
              </td>
            </tr>
            <tr *ngIf="!loading && records.length === 0">
              <td [attr.colspan]="isAdmin ? 11 : 10" style="text-align: center; padding: 3rem; color: #94a3b8;">
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
              <td *ngIf="isAdmin" style="text-align: center; white-space: nowrap;">
                <div style="display: inline-flex; align-items: center; gap: 4px;">
                  <button (click)="openEditModal(r)"
                          class="btn btn-outline btn-sm"
                          title="تعديل سجل الصيانة"
                          style="padding: 4px 7px; border-radius: 6px;">
                    <app-icon name="edit" [size]="14"></app-icon>
                  </button>
                  <button (click)="openDeleteModal(r)"
                          class="btn btn-outline btn-sm"
                          title="حذف سجل الصيانة"
                          style="padding: 4px 7px; border-radius: 6px; color: #e11d48; border-color: #fecdd3;">
                    <app-icon name="trash" [size]="14"></app-icon>
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

                <!-- Dropdown selection for Replaced Parts -->
                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">القطع المستبدلة (اختيار من القائمة المنسدلة)</label>
                  <div style="display: flex; gap: 8px;">
                    <select [(ngModel)]="selectedPartToAdd" (change)="addPartFromDropdown()" name="part_select" class="form-select">
                      <option value="">-- اختر قطعة غيار مستبدلة لإضافتها --</option>
                      <option *ngFor="let vp of vehicleParts" [value]="vp.id">
                        {{ vp.part_name }} (الحالة: {{ vp.status_display || vp.current_status }})
                      </option>
                    </select>
                  </div>

                  <!-- Selected Parts Chips -->
                  <div *ngIf="selectedPartIds.length > 0" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div *ngFor="let pid of selectedPartIds" class="badge badge-info" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 12px; border-radius: 6px;">
                      <span>{{ getPartName(pid) }}</span>
                      <button type="button" (click)="removePart(pid)" style="background: none; border: none; cursor: pointer; color: inherit; padding: 0; display: inline-flex; align-items: center;" title="إزالة">
                        <app-icon name="x" [size]="13"></app-icon>
                      </button>
                    </div>
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

      <!-- Modal: Edit Maintenance Record (Admin) -->
      <div *ngIf="showEditModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="edit" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تعديل سجل الصيانة #{{ editingRecord.id }}
              </h3>
            </div>
            <button (click)="showEditModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="updateRecord()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">المركبة المعنية *</label>
                  <select [(ngModel)]="editingRecord.vehicle" (change)="onEditVehicleSelected()" name="edit_v_id" required class="form-select">
                    <option *ngFor="let v of vehicles" [value]="v.id">
                      {{ v.internal_fleet_number }} - {{ v.plate_number }} ({{ v.make }} {{ v.model }})
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">نوع الصيانة *</label>
                  <select [(ngModel)]="editingRecord.maintenance_type" name="edit_type_id" required class="form-select">
                    <option *ngFor="let t of maintenanceTypes" [value]="t.id">{{ t.name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">تاريخ الصيانة *</label>
                  <input type="date" [(ngModel)]="editingRecord.maintenance_date" name="edit_m_date" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">قراءة العداد عند الصيانة (كم) *</label>
                  <input type="number" [(ngModel)]="editingRecord.odometer" name="edit_odo" required min="0" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">التكلفة الإجمالية (ر.س) *</label>
                  <input type="number" step="0.01" [(ngModel)]="editingRecord.cost" name="edit_cost" required min="0" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">مزود الخدمة / الورشة</label>
                  <input type="text" [(ngModel)]="editingRecord.service_provider" name="edit_provider" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">اسم الفني / المهندس</label>
                  <input type="text" [(ngModel)]="editingRecord.technician" name="edit_tech" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">حالة العملية</label>
                  <select [(ngModel)]="editingRecord.status" name="edit_st" class="form-select">
                    <option value="COMPLETED">مكتملة</option>
                    <option value="IN_PROGRESS">قيد التنفيذ</option>
                    <option value="SCHEDULED">مجدولة</option>
                    <option value="CANCELLED">ملغاة</option>
                  </select>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">تفاصيل الأعمال والإصلاحات</label>
                  <textarea [(ngModel)]="editingRecord.description" name="edit_desc" rows="2" class="form-control"></textarea>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">ملاحظات إضافية</label>
                  <textarea [(ngModel)]="editingRecord.notes" name="edit_notes" rows="2" class="form-control"></textarea>
                </div>

                <!-- Dropdown for Edit Replaced Parts -->
                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">القطع المستبدلة (اختيار من القائمة المنسدلة)</label>
                  <div style="display: flex; gap: 8px;">
                    <select [(ngModel)]="editSelectedPartToAdd" (change)="addEditPartFromDropdown()" name="edit_part_select" class="form-select">
                      <option value="">-- اختر قطعة غيار مستبدلة لإضافتها --</option>
                      <option *ngFor="let vp of editVehicleParts" [value]="vp.id">
                        {{ vp.part_name }} (الحالة: {{ vp.status_display || vp.current_status }})
                      </option>
                    </select>
                  </div>

                  <!-- Selected Parts Chips -->
                  <div *ngIf="editSelectedPartIds.length > 0" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div *ngFor="let pid of editSelectedPartIds" class="badge badge-info" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 12px; border-radius: 6px;">
                      <span>{{ getEditPartName(pid) }}</span>
                      <button type="button" (click)="removeEditPart(pid)" style="background: none; border: none; cursor: pointer; color: inherit; padding: 0; display: inline-flex; align-items: center;" title="إزالة">
                        <app-icon name="x" [size]="13"></app-icon>
                      </button>
                    </div>
                  </div>

                  <div style="margin-top: 8px;">
                    <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #0369a1; font-weight: 700; cursor: pointer;">
                      <input type="checkbox" [(ngModel)]="editingRecord.reset_parts_intervals" name="edit_reset_intervals" />
                      <span>إعادة ضبط فواصل الصيانة وتحديث حالة القطع المستبدلة تلقائياً إلى (سليم)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showEditModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تحديث وحفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Confirm Delete Record -->
      <div *ngIf="showDeleteModal && deletingRecord" class="modal-overlay">
        <div class="modal-box" style="max-width: 440px;">
          <div class="modal-header">
            <h3 style="font-weight: 700; font-size: 1.1rem; color: #e11d48; margin: 0; display: flex; align-items: center; gap: 8px;">
              <app-icon name="alert-triangle" [size]="20"></app-icon>
              <span>تأكيد حذف سجل الصيانة</span>
            </h3>
            <button (click)="showDeleteModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>
          <div class="modal-body" style="padding: 1.25rem;">
            <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin: 0;">
              هل أنت متأكد من حذف سجل الصيانة للمركبة
              <strong style="color: #0f172a;">{{ deletingRecord.vehicle_plate }}</strong>
              (نوع الصيانة: <strong>{{ deletingRecord.maintenance_type_name }}</strong> بتكلفة <strong>{{ deletingRecord.cost }} ر.س</strong>)؟
            </p>
          </div>
          <div class="modal-footer" style="padding: 1rem 1.25rem;">
            <button type="button" (click)="showDeleteModal = false" class="btn btn-secondary">إلغاء</button>
            <button type="button" (click)="confirmDelete()" class="btn btn-danger" style="display: inline-flex; align-items: center; gap: 6px;">
              <app-icon name="trash" [size]="15"></app-icon>
              <span>نعم، حذف السجل</span>
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
  editVehicleParts: VehiclePart[] = [];
  loading = true;
  evaluating = false;

  searchQuery = '';
  selectedType = '';
  dateFrom = '';
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;

  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  selectedPartToAdd = '';
  selectedPartIds: number[] = [];

  editSelectedPartToAdd = '';
  editSelectedPartIds: number[] = [];
  editingRecord: any = {};
  deletingRecord: MaintenanceRecord | null = null;

  newRecord: any = {
    maintenance_date: new Date().toISOString().slice(0, 10),
    status: 'COMPLETED',
    cost: 0,
    reset_parts_intervals: true
  };

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
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

  onEditVehicleSelected(): void {
    const v = this.vehicles.find(item => item.id === Number(this.editingRecord.vehicle));
    if (v) {
      this.fleetService.getVehicleParts(v.id).subscribe({
        next: (p) => {
          this.editVehicleParts = p;
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
    this.selectedPartToAdd = '';
    if (defaultVehicle) {
      this.onVehicleSelected();
    }
    this.showCreateModal = true;
  }

  addPartFromDropdown(): void {
    const id = Number(this.selectedPartToAdd);
    if (id && !this.selectedPartIds.includes(id)) {
      this.selectedPartIds.push(id);
    }
    this.selectedPartToAdd = '';
  }

  removePart(id: number): void {
    this.selectedPartIds = this.selectedPartIds.filter(x => x !== id);
  }

  getPartName(id: number): string {
    const p = this.vehicleParts.find(x => x.id === id);
    return (p && p.part_name) ? p.part_name : `قطعة #${id}`;
  }

  addEditPartFromDropdown(): void {
    const id = Number(this.editSelectedPartToAdd);
    if (id && !this.editSelectedPartIds.includes(id)) {
      this.editSelectedPartIds.push(id);
    }
    this.editSelectedPartToAdd = '';
  }

  removeEditPart(id: number): void {
    this.editSelectedPartIds = this.editSelectedPartIds.filter(x => x !== id);
  }

  getEditPartName(id: number): string {
    const p = this.editVehicleParts.find(x => x.id === id);
    return (p && p.part_name) ? p.part_name : `قطعة #${id}`;
  }

  openEditModal(record: MaintenanceRecord): void {
    this.editingRecord = {
      id: record.id,
      vehicle: record.vehicle,
      maintenance_type: record.maintenance_type,
      maintenance_date: record.maintenance_date,
      odometer: record.odometer,
      cost: record.cost,
      service_provider: record.service_provider || '',
      technician: record.technician || '',
      status: record.status,
      description: record.description || '',
      notes: record.notes || '',
      reset_parts_intervals: false
    };
    this.editSelectedPartIds = record.parts_replaced_details?.map(p => p.id) || [];
    this.editSelectedPartToAdd = '';

    // Load parts for the vehicle
    this.fleetService.getVehicleParts(record.vehicle).subscribe({
      next: (p) => {
        this.editVehicleParts = p;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.showEditModal = true;
  }

  updateRecord(): void {
    const payload = {
      ...this.editingRecord,
      parts_replaced: this.editSelectedPartIds
    };
    this.maintenanceService.updateRecord(this.editingRecord.id, payload).subscribe({
      next: () => {
        this.toastService.success('تم تحديث سجل الصيانة بنجاح');
        this.showEditModal = false;
        this.loadRecords();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل تحديث سجل الصيانة';
        this.toastService.error(msg);
      }
    });
  }

  openDeleteModal(record: MaintenanceRecord): void {
    this.deletingRecord = record;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deletingRecord) return;
    this.maintenanceService.deleteRecord(this.deletingRecord.id).subscribe({
      next: () => {
        this.toastService.success('تم حذف سجل الصيانة بنجاح');
        this.showDeleteModal = false;
        this.deletingRecord = null;
        this.loadRecords();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل حذف سجل الصيانة';
        this.toastService.error(msg);
      }
    });
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
