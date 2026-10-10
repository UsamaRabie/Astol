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
            إصدار تراخيص الحركة، تحديد نقطة الانطلاق والمسار، وتحديث عدادات المركبات تلقائياً فور اكتمال الرحلة
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
                     placeholder="رقم الإذن، مكان الانطلاق، الوجهة، السائق..."
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
              <option value="APPROVED">معتمد / صادر (Approved)</option>
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
              <th style="width: 110px;">رقم الإذن</th>
              <th>المركبة</th>
              <th>السائق المسؤول</th>
              <th>مكان الانطلاق</th>
              <th>الوجهة والغرض</th>
              <th>تاريخ الانطلاق</th>
              <th>عداد البداية</th>
              <th>عداد العودة</th>
              <th>المسافة المقطوعة</th>
              <th>الحالة</th>
              <th style="text-align: center; width: 230px;">إجراءات التشغيل</th>
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
              <td>
                <span style="background: #f1f5f9; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11.5px;">
                  {{ p.departure_location || 'المقر الرئيسي' }}
                </span>
              </td>
              <td>
                <div style="font-weight: 600; color: #1e293b;">{{ p.destination }}</div>
                <div style="font-size: 11.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;">
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
              <td style="text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap;">
                  <!-- Complete Trip Action (if Approved or In Progress): opens modal for ending odometer -->
                  <button *ngIf="p.status === 'IN_PROGRESS' || p.status === 'APPROVED'"
                          (click)="openCompleteTripModal(p)"
                          class="btn btn-sm"
                          style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; font-size: 11px; border-radius: 6px;"
                          title="إتمام الرحلة وتسجيل عداد العودة">
                    <app-icon name="check-circle" [size]="12"></app-icon>
                    <span>الرحلة اكتملت</span>
                  </button>

                  <!-- Start Trip Button (if Approved or Draft) -->
                  <button *ngIf="p.status === 'APPROVED' || p.status === 'DRAFT'"
                          (click)="openStartTripModal(p)"
                          class="btn btn-secondary btn-sm"
                          style="display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; font-size: 11px; border-radius: 6px;"
                          title="تسجيل انطلاق الرحلة">
                    <app-icon name="gauge" [size]="12"></app-icon>
                    <span>انطلاق</span>
                  </button>

                  <!-- Approve Button (if Draft) -->
                  <button *ngIf="p.status === 'DRAFT'"
                          (click)="approvePermit(p)"
                          class="btn btn-outline btn-sm"
                          style="display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; font-size: 11px; border-radius: 6px;"
                          title="اعتماد الإذن">
                    <app-icon name="check" [size]="12"></app-icon>
                    <span>اعتماد</span>
                  </button>

                  <!-- Admin Full CRUD: Edit -->
                  <button *ngIf="isAdmin && p.status !== 'COMPLETED'"
                          (click)="openEditModal(p)"
                          class="btn btn-sm"
                          style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #0284c7; padding: 4px 6px; border-radius: 6px; font-size: 11px;"
                          title="تعديل الإذن">
                    <app-icon name="edit" [size]="12"></app-icon>
                  </button>

                  <!-- Admin Full CRUD: Delete -->
                  <button *ngIf="isAdmin"
                          (click)="confirmDeletePermit(p)"
                          class="btn btn-sm"
                          style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 4px 6px; border-radius: 6px; font-size: 11px;"
                          title="حذف الإذن">
                    <app-icon name="trash" [size]="12"></app-icon>
                  </button>

                  <!-- Cancel Button -->
                  <button *ngIf="p.status !== 'COMPLETED' && p.status !== 'CANCELLED'"
                          (click)="openCancelModal(p)"
                          class="btn btn-outline btn-sm"
                          style="color: #ef4444; border-color: #fecaca; padding: 4px 6px; border-radius: 6px;"
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

                <!-- Input: مكان انطلاق الرحلة -->
                <div class="form-group">
                  <label class="form-label">مكان انطلاق الرحلة *</label>
                  <input type="text" [(ngModel)]="newPermit.departure_location" name="dep_loc" required class="form-control" placeholder="مثال: المستودع المركزي، المقر الرئيسي" />
                </div>

                <div class="form-group">
                  <label class="form-label">الجهة / القسم الطالب *</label>
                  <input type="text" [(ngModel)]="newPermit.requesting_department" name="dept" required class="form-control" placeholder="مثال: قطاع العمليات والتشغيل" />
                </div>

                <div class="form-group">
                  <label class="form-label">تاريخ الانطلاق *</label>
                  <input type="date" [(ngModel)]="newPermit.departure_date" name="dep_date" required class="form-control" />
                </div>

                <!-- Status choice: DRAFT vs APPROVED -->
                <div class="form-group">
                  <label class="form-label">حالة الإذن عند الإصدار *</label>
                  <select [(ngModel)]="newPermit.status" name="status_choice" class="form-select">
                    <option value="APPROVED">معتمد / صادر مباشرة (Approved)</option>
                    <option value="DRAFT">مسودة قيد المراجعة (Draft)</option>
                  </select>
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
                  <label class="form-label">تعليمات وملاحظات إضافية</label>
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

      <!-- Modal: EDIT Work Permit (Admin Full CRUD) -->
      <div *ngIf="showEditModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="edit" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تعديل إذن التشغيل {{ editingPermit?.permit_number }}
              </h3>
            </div>
            <button (click)="showEditModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveEditPermit()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">المركبة *</label>
                  <select [(ngModel)]="editingPermit.vehicle" name="edit_v" required class="form-select">
                    <option *ngFor="let v of activeVehicles" [value]="v.id">
                      {{ v.internal_fleet_number }} - {{ v.plate_number }} ({{ v.make }} {{ v.model }})
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">السائق المسؤول *</label>
                  <select [(ngModel)]="editingPermit.driver" name="edit_d" required class="form-select">
                    <option *ngFor="let d of drivers" [value]="d.id">{{ d.full_name }} ({{ d.phone }})</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">مكان انطلاق الرحلة *</label>
                  <input type="text" [(ngModel)]="editingPermit.departure_location" name="edit_dep_loc" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">الجهة / القسم الطالب *</label>
                  <input type="text" [(ngModel)]="editingPermit.requesting_department" name="edit_dept" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">تاريخ الانطلاق *</label>
                  <input type="date" [(ngModel)]="editingPermit.departure_date" name="edit_dep_date" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">حالة الإذن *</label>
                  <select [(ngModel)]="editingPermit.status" name="edit_status" class="form-select">
                    <option value="DRAFT">مسودة</option>
                    <option value="APPROVED">معتمد / صادر</option>
                    <option value="IN_PROGRESS">قيد التنفيذ</option>
                    <option value="COMPLETED">مكتمل</option>
                    <option value="CANCELLED">ملغي</option>
                  </select>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">الوجهة ومسار الرحلة *</label>
                  <input type="text" [(ngModel)]="editingPermit.destination" name="edit_dest" required class="form-control" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">الغرض من الرحلة *</label>
                  <input type="text" [(ngModel)]="editingPermit.purpose" name="edit_purp" required class="form-control" />
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">ملاحظات وتفاصيل</label>
                  <textarea [(ngModel)]="editingPermit.description" name="edit_desc" rows="2" class="form-control"></textarea>
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
                <div style="margin-bottom: 4px;"><strong>مكان الانطلاق: </strong> {{ selectedPermit?.departure_location || 'المقر الرئيسي' }}</div>
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

      <!-- POPUP MODAL: COMPLETE TRIP ("الرحلة اكتملت" - يسألني عداد العودة كام ويسمع في السيستم كله) -->
      <div *ngIf="showCompleteTripModal" class="modal-overlay">
        <div class="modal-box" style="max-width: 500px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="check-circle" [size]="22" style="color: #059669;"></app-icon>
              <h3 style="font-weight: 800; font-size: 1.2rem; color: #0f172a; margin: 0;">
                إتمام الرحلة وتحديث عداد المركبة
              </h3>
            </div>
            <button (click)="showCompleteTripModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitCompleteTrip()">
            <div class="modal-body">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin-bottom: 1.25rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 12.5px; color: #166534; font-weight: 700;">المركبة: {{ selectedPermit?.fleet_number }} ({{ selectedPermit?.vehicle_plate }})</span>
                  <span style="font-size: 11px; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 700;">إذن {{ selectedPermit?.permit_number }}</span>
                </div>
                <div style="font-size: 12px; color: #166534; margin-bottom: 6px;">
                  عداد البداية للرحلة: <strong>{{ (selectedPermit?.starting_odometer || 0) | number }} كم</strong>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed #86efac; padding-top: 6px; margin-top: 6px;">
                  <span style="font-size: 12px; color: #166534; font-weight: 700;">المسافة المقطوعة المحتسبة:</span>
                  <span style="font-size: 1.3rem; font-weight: 900; color: #059669;">
                    {{ (tripEndingOdometer - (selectedPermit?.starting_odometer || 0)) > 0 ? ((tripEndingOdometer - (selectedPermit?.starting_odometer || 0)) | number) : 0 }} كم
                  </span>
                </div>
              </div>

              <!-- Required: Ending Odometer -->
              <div class="form-group">
                <label class="form-label" style="font-size: 13.5px; font-weight: 800; color: #0f172a;">
                  قراءة عداد العودة الحالي للمركبة (كم) <span style="color: #ef4444;">*</span>
                </label>
                <div style="position: relative;">
                  <input type="number"
                         [(ngModel)]="tripEndingOdometer"
                         name="end_odo"
                         required
                         [min]="selectedPermit?.starting_odometer || 0"
                         class="form-control"
                         style="font-size: 1.15rem; font-weight: 800; color: #059669; padding: 10px 14px;"
                         placeholder="أدخل قراءة العداد عند العودة" />
                </div>
                <span style="font-size: 11.5px; color: #0284c7; margin-top: 5px; display: block; font-weight: 600;">
                  ⚡ سيتم تحديث عداد المركبة في النظام فوراً، وإعادة تقييم جداول الصيانة وتنبيهات قطع الغيار تلقائياً.
                </span>
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
                          placeholder="حالة المركبة عند العودة، أي ملاحظات من السائق..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCompleteTripModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="background: #059669; border: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 9px 18px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>اعتماد إتمام الرحلة وتحديث العداد</span>
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

      <!-- Modal: Delete Work Permit Confirmation (Admin Full CRUD) -->
      <div *ngIf="showDeleteModal" class="modal-overlay">
        <div class="modal-box" style="max-width: 440px; text-align: center; padding: 1.5rem;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <app-icon name="alert-triangle" [size]="28"></app-icon>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">تأكيد حذف إذن التشغيل</h3>
          <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1.5rem 0; line-height: 1.5;">
            هل أنت متأكد من رغبتك في حذف إذن التشغيل رقم <b>"{{ permitToDelete?.permit_number }}"</b>؟
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button (click)="showDeleteModal = false" class="btn btn-secondary">إلغاء</button>
            <button (click)="executeDeletePermit()" class="btn btn-danger" style="background: #ef4444; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer;">
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
  showEditModal = false;
  showDeleteModal = false;
  showStartTripModal = false;
  showCompleteTripModal = false;
  showCancelModal = false;

  selectedPermit: WorkPermit | null = null;
  permitToDelete: WorkPermit | null = null;
  editingPermit: any = {};

  tripStartingOdometer = 0;
  tripDepartureTime = '08:00';
  tripEndingOdometer = 0;
  tripReturnDate = new Date().toISOString().slice(0, 10);
  tripReturnTime = '17:00';
  tripCompleteNotes = '';
  cancelNotes = '';

  newPermit: Partial<WorkPermit> = {
    departure_date: new Date().toISOString().slice(0, 10),
    departure_location: 'المقر الرئيسي',
    requesting_department: 'قسم العمليات والتشغيل',
    status: 'APPROVED'
  };

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
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
      departure_location: 'المقر الرئيسي',
      requesting_department: 'قسم العمليات والتشغيل',
      status: 'APPROVED',
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

  openEditModal(p: WorkPermit): void {
    this.editingPermit = { ...p };
    this.showEditModal = true;
  }

  saveEditPermit(): void {
    if (!this.editingPermit.id) return;
    this.permitService.updatePermit(this.editingPermit.id, this.editingPermit).subscribe({
      next: () => {
        this.toastService.success('تم تحديث إذن التشغيل بنجاح');
        this.showEditModal = false;
        this.loadPermits();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل تعديل إذن التشغيل');
      }
    });
  }

  confirmDeletePermit(p: WorkPermit): void {
    this.permitToDelete = p;
    this.showDeleteModal = true;
  }

  executeDeletePermit(): void {
    if (!this.permitToDelete) return;
    this.permitService.deletePermit(this.permitToDelete.id).subscribe({
      next: () => {
        this.toastService.success('تم حذف إذن التشغيل بنجاح');
        this.showDeleteModal = false;
        this.permitToDelete = null;
        this.loadPermits();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل حذف إذن التشغيل');
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
    const v = this.activeVehicles.find(item => item.id === p.vehicle);
    const startKm = p.starting_odometer || (v ? v.current_odometer : 0);
    this.tripEndingOdometer = startKm + 50;
    this.tripReturnDate = new Date().toISOString().slice(0, 10);
    this.tripReturnTime = new Date().toTimeString().slice(0, 5);
    this.tripCompleteNotes = '';
    this.showCompleteTripModal = true;
  }

  submitCompleteTrip(): void {
    if (!this.selectedPermit) return;
    const startKm = this.selectedPermit.starting_odometer || 0;
    if (this.tripEndingOdometer < startKm) {
      this.toastService.error(`قراءة عداد العودة (${this.tripEndingOdometer} كم) لا يمكن أن تكون أقل من عداد البداية (${startKm} كم)`);
      return;
    }

    this.permitService.completeTrip(this.selectedPermit.id, {
      ending_odometer: this.tripEndingOdometer,
      return_time: this.tripReturnTime + ':00',
      return_date: this.tripReturnDate,
      notes: this.tripCompleteNotes
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم إنهاء الرحلة وتحديث عداد المركبة في النظام بالكامل');
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
