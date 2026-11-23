import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FleetService } from '../../core/services/fleet.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PartCatalog, VehiclePart, PartMovement } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-parts',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            إدارة قطع الغيار وسجل الحركات
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            توثيق كامل لحركات الاستبدال والصيانة ومراقبة فواصل الصلاحية لكافة مركبات الأسطول
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <button (click)="refreshActiveView()"
                  class="btn btn-outline"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="refresh" [size]="15"></app-icon>
            <span>تحديث البيانات</span>
          </button>

          <button *ngIf="canWrite"
                  (click)="openCreateCatalogModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>إضافة قطعة للكتالوج</span>
          </button>
        </div>
      </div>

      <!-- View Switcher Tabs -->
      <div style="display: flex; border-bottom: 2px solid #e2e8f0; gap: 0.5rem; overflow-x: auto;">
        <button (click)="switchView('MOVEMENTS')" class="tab-btn" [class.active-tab]="currentView === 'MOVEMENTS'">
          <app-icon name="list" [size]="16"></app-icon>
          <span>سجل وحركات الاستبدال</span>
          <span *ngIf="movementsCount > 0" class="tab-badge">{{ movementsCount }}</span>
        </button>

        <button (click)="switchView('FLEET_PARTS')" class="tab-btn" [class.active-tab]="currentView === 'FLEET_PARTS'">
          <app-icon name="truck" [size]="16"></app-icon>
          <span>مراقبة حالة القطع الحالية</span>
          <span *ngIf="overduePartsCount > 0" class="tab-badge badge-danger-count">{{ overduePartsCount }} حرجة</span>
        </button>

        <button (click)="switchView('CATALOG')" class="tab-btn" [class.active-tab]="currentView === 'CATALOG'">
          <app-icon name="cog" [size]="16"></app-icon>
          <span>كتالوج قطع الغيار المعتمدة</span>
        </button>
      </div>

      <!-- ========================================== -->
      <!-- TAB 1: MOVEMENTS HISTORY (سجل الحركات) -->
      <!-- ========================================== -->
      <div *ngIf="currentView === 'MOVEMENTS'" style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Movements Stat Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="card" style="padding: 1rem 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: #2563eb;">
              <app-icon name="list" [size]="22"></app-icon>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">إجمالي حركات القطع</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: #0f172a;">{{ movementsCount }}</div>
            </div>
          </div>

          <div class="card" style="padding: 1rem 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #ecfdf5; display: flex; align-items: center; justify-content: center; color: #059669;">
              <app-icon name="refresh" [size]="22"></app-icon>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">استبدالات وصيانة فعلية</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: #059669;">{{ replacementMovementsCount }}</div>
            </div>
          </div>

          <div class="card" style="padding: 1rem 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #fff7ed; display: flex; align-items: center; justify-content: center; color: #ea580c;">
              <app-icon name="gauge" [size]="22"></app-icon>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">إجمالي مسافة القطع المستبدلة</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: #ea580c;">{{ totalDistanceServed | number }} <span style="font-size: 0.85rem; font-weight: 600;">كم</span></div>
            </div>
          </div>

          <div class="card" style="padding: 1rem 1.25rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #faf5ff; display: flex; align-items: center; justify-content: center; color: #7c3aed;">
              <app-icon name="file-text" [size]="22"></app-icon>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">إجمالي تكلفة الاستبدالات</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: #7c3aed;">{{ totalCost | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>

        <!-- Filter Bar for Movements -->
        <div class="card" style="padding: 1rem 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: flex-end;">
            <div>
              <label class="form-label">بحث سريع</label>
              <div style="position: relative;">
                <input type="text"
                       [(ngModel)]="movementSearch"
                       (keyup.enter)="loadPartMovements()"
                       placeholder="لوحة المركبة، اسم القطعة، الورشة..."
                       class="form-control"
                       style="padding-right: 32px;" />
                <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8;">
                  <app-icon name="search" [size]="15"></app-icon>
                </span>
              </div>
            </div>

            <div>
              <label class="form-label">نوع الحركة</label>
              <select [(ngModel)]="movementTypeFilter" (change)="loadPartMovements()" class="form-select">
                <option value="">جميع أنواع الحركات</option>
                <option value="REPLACEMENT">استبدال دوري</option>
                <option value="MAINTENANCE">صيانة وإصلاح</option>
                <option value="INITIAL">تركيب أولي</option>
                <option value="INSPECTION">فحص ومعايرة</option>
              </select>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <button (click)="loadPartMovements()"
                      class="btn btn-primary"
                      style="display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; flex: 1;">
                <app-icon name="filter" [size]="15"></app-icon>
                <span>تطبيق التصفية</span>
              </button>

              <button *ngIf="movementSearch || movementTypeFilter"
                      (click)="clearMovementFilters()"
                      class="btn btn-outline"
                      style="display: flex; align-items: center; justify-content: center; gap: 4px; border-radius: 8px;"
                      title="إعادة تعيين التصفية">
                <app-icon name="x" [size]="15"></app-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Table of Part Movements -->
        <div class="table-container">
          <table class="table" style="font-size: 13px;">
            <thead>
              <tr>
                <th>تاريخ الحركة</th>
                <th>المركبة</th>
                <th>قطعة الغيار</th>
                <th>الفئة الفنية</th>
                <th>نوع الحركة</th>
                <th>قراءة العداد</th>
                <th>المسافة بالقطعة السابقة</th>
                <th>التكلفة</th>
                <th>مركز الخدمة / الورشة</th>
                <th>المستخدم / المنفذ</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loadingMovements">
                <td colspan="11" style="text-align: center; padding: 3rem; color: #64748b;">
                  <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                    <span>جاري تحميل سجل حركات قطع الغيار...</span>
                  </div>
                </td>
              </tr>

              <tr *ngIf="!loadingMovements && movements.length === 0">
                <td colspan="11" style="text-align: center; padding: 3rem; color: #94a3b8;">
                  <app-icon name="list" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                  <div style="font-weight: 600; color: #475569;">لا توجد حركات مسجلة تطابق معايير البحث</div>
                </td>
              </tr>

              <tr *ngFor="let m of movements">
                <td style="font-weight: 600; color: #1e293b; white-space: nowrap;">
                  {{ m.movement_date }}
                </td>
                <td>
                  <span class="plate-badge">{{ m.vehicle_plate }}</span>
                  <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ m.fleet_number }}</span>
                </td>
                <td style="font-weight: 700; color: #0f172a;">
                  {{ m.part_name }}
                  <div *ngIf="m.part_number" style="font-size: 11px; color: #64748b; font-weight: normal;">
                    رقم: {{ m.part_number }}
                  </div>
                </td>
                <td style="color: #475569; font-size: 12px;">{{ m.part_category }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-info': m.movement_type === 'REPLACEMENT',
                    'badge-warning': m.movement_type === 'MAINTENANCE',
                    'badge-success': m.movement_type === 'INITIAL',
                    'badge-purple': m.movement_type === 'INSPECTION'
                  }" style="font-size: 11px;">
                    {{ m.movement_type_display }}
                  </span>
                </td>
                <td style="font-weight: 700; color: #334155; white-space: nowrap;">
                  {{ m.odometer | number }} كم
                </td>
                <td style="font-weight: 700; color: #0284c7; white-space: nowrap;">
                  <span *ngIf="m.distance_served > 0">{{ m.distance_served | number }} كم</span>
                  <span *ngIf="m.distance_served <= 0" style="color: #94a3b8; font-weight: normal;">-</span>
                </td>
                <td style="font-weight: 700; color: #059669; white-space: nowrap;">
                  <span *ngIf="m.cost && +m.cost > 0">{{ +m.cost | number:'1.2-2' }}</span>
                  <span *ngIf="!m.cost || +m.cost === 0" style="color: #94a3b8; font-weight: normal;">-</span>
                </td>
                <td style="font-size: 12px; color: #475569;">
                  {{ m.service_provider || '-' }}
                </td>
                <td style="font-size: 12px; color: #64748b;">
                  {{ m.performed_by_name || '-' }}
                </td>
                <td style="max-width: 220px; font-size: 12px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="m.notes || ''">
                  {{ m.notes || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 2: FLEET PARTS MONITOR (مراقبة الحالة الحالية) -->
      <!-- ========================================== -->
      <div *ngIf="currentView === 'FLEET_PARTS'" style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Filter Bar -->
        <div class="card" style="padding: 1rem 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; align-items: flex-end;">
            <div>
              <label class="form-label">الحالة التشغيلية للقطعة</label>
              <select [(ngModel)]="selectedStatus" (change)="loadFleetParts()" class="form-select">
                <option value="">جميع الحالات</option>
                <option value="OVERDUE">متأخرة وتتطلب استبدالاً عاجلاً (حرجة)</option>
                <option value="DUE_SOON">مستحقة قريباً (أقل من 1000 كم أو شهر)</option>
                <option value="UPCOMING">قادمة (في المسار الطبيعي)</option>
                <option value="OK">سليمة وبحالة جيدة</option>
              </select>
            </div>

            <div>
              <button (click)="loadFleetParts()"
                      class="btn btn-secondary"
                      style="display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; width: 100%;">
                <app-icon name="filter" [size]="15"></app-icon>
                <span>تطبيق التصفية</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="table-container">
          <table class="table" style="font-size: 13px;">
            <thead>
              <tr>
                <th>المركبة</th>
                <th>قطعة الغيار</th>
                <th>الفئة</th>
                <th>تاريخ وعداد التركيب الحالي</th>
                <th>الفاصل المعتمد</th>
                <th>العداد المستهدف</th>
                <th>المتبقي (كم)</th>
                <th>المتبقي (أيام)</th>
                <th>الحالة</th>
                <th *ngIf="canWrite" style="text-align: center; width: 110px;">إجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loadingParts">
                <td colspan="10" style="text-align: center; padding: 3rem; color: #64748b;">
                  <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                    <span>جاري تحميل ومزامنة قطع المركبات...</span>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!loadingParts && fleetParts.length === 0">
                <td colspan="10" style="text-align: center; padding: 3rem; color: #94a3b8;">
                  <app-icon name="cog" [size]="32" style="color: #cbd5e1; margin-bottom: 8px;"></app-icon>
                  <div style="font-weight: 600; color: #475569;">لا توجد قطع غيار مطابقة للتصفية</div>
                </td>
              </tr>
              <tr *ngFor="let p of fleetParts">
                <td>
                  <span class="plate-badge">{{ p.vehicle_plate }}</span>
                  <span style="font-size: 11px; color: #64748b; margin-right: 4px;">#{{ p.vehicle_fleet }}</span>
                </td>
                <td style="font-weight: 700; color: #0f172a;">{{ p.part_name }}</td>
                <td style="color: #475569;">{{ p.part_category }}</td>
                <td>{{ p.installation_date }} ({{ p.installation_odometer | number }} كم)</td>
                <td>{{ p.interval_km | number }} كم / {{ p.interval_days }} يوم</td>
                <td style="font-weight: 700; color: #334155;">{{ p.next_replacement_km | number }} كم</td>
                <td style="font-weight: 800;"
                    [ngClass]="{
                      'text-rose-600': (p.remaining_km || 0) <= 0,
                      'text-amber-600': (p.remaining_km || 0) > 0 && (p.remaining_km || 0) <= 1000,
                      'text-emerald-600': (p.remaining_km || 0) > 1000
                    }">
                  {{ p.remaining_km | number }} كم
                </td>
                <td style="font-weight: 600;">{{ p.remaining_days }} يوم</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-success': p.current_status === 'OK',
                    'badge-info': p.current_status === 'UPCOMING',
                    'badge-warning': p.current_status === 'DUE_SOON',
                    'badge-danger': p.current_status === 'OVERDUE'
                  }" style="font-size: 11px;">
                    {{ p.status_display }}
                  </span>
                </td>
                <td *ngIf="canWrite" style="text-align: center;">
                  <button (click)="openReplaceModal(p)"
                          class="btn btn-outline btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11.5px;"
                          title="تسجيل استبدال وتوثيق الحركة">
                    <app-icon name="refresh" [size]="12"></app-icon>
                    <span>استبدال</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 3: PART CATALOG (كتالوج القطع المعتمدة) -->
      <!-- ========================================== -->
      <div *ngIf="currentView === 'CATALOG'" style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="table-container">
          <table class="table" style="font-size: 13px;">
            <thead>
              <tr>
                <th>اسم القطعة</th>
                <th>الفئة الفنية</th>
                <th>الفاصل الافتراضي بالكيلومتر</th>
                <th>الفاصل الافتراضي بالأيام</th>
                <th>الوحدة</th>
                <th>المركبات المستخدمة</th>
                <th>المواصفات والمعايير</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loadingCatalog">
                <td colspan="7" style="text-align: center; padding: 3rem; color: #64748b;">
                  <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                    <span>جاري تحميل كتالوج قطع الغيار...</span>
                  </div>
                </td>
              </tr>
              <tr *ngFor="let c of catalogList">
                <td style="font-weight: 700; color: #0f172a;">{{ c.name }}</td>
                <td><span class="badge badge-secondary" style="font-size: 11px;">{{ c.category_display }}</span></td>
                <td style="font-weight: 600; color: #334155;">{{ c.default_interval_km | number }} كم</td>
                <td style="font-weight: 600; color: #334155;">{{ c.default_interval_days }} يوم</td>
                <td>{{ c.unit }}</td>
                <td style="font-weight: 700; color: #0284c7;">{{ c.usage_count }} مركبة</td>
                <td style="color: #64748b; font-size: 12px;">{{ c.description || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Create Catalog Item -->
      <div *ngIf="showCatalogModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="cog" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                إضافة قطعة غيار جديدة للكتالوج
              </h3>
            </div>
            <button (click)="showCatalogModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveCatalogItem()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">اسم قطعة الغيار *</label>
                <input type="text" [(ngModel)]="newCatalogItem.name" name="c_name" required class="form-control" placeholder="مثال: طقم بواجي إيريديوم" />
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">الفئة الفنية *</label>
                <select [(ngModel)]="newCatalogItem.category" name="c_cat" required class="form-select">
                  <option value="ENGINE">المحرك وملحقاته</option>
                  <option value="BRAKES">نظام الفرامل</option>
                  <option value="SUSPENSION">نظام التعليق والإطارات</option>
                  <option value="ELECTRICAL">النظام الكهربائي والبطاريات</option>
                  <option value="FLUIDS">الزيوت والسوائل</option>
                  <option value="FILTERS">الفلاتر والمرشحات</option>
                  <option value="TRANSMISSION">ناقل الحركة</option>
                  <option value="COOLING">نظام التبريد</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem;">
                <div class="form-group">
                  <label class="form-label">الفاصل بالكم *</label>
                  <input type="number" [(ngModel)]="newCatalogItem.default_interval_km" name="c_km" required min="1000" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">الفاصل بالأيام *</label>
                  <input type="number" [(ngModel)]="newCatalogItem.default_interval_days" name="c_days" required min="30" class="form-control" />
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">الوصف والمواصفات الفنية</label>
                <textarea [(ngModel)]="newCatalogItem.description" name="c_desc" rows="3" class="form-control" placeholder="المعايير الموصى بها ودرجات اللزوجة..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showCatalogModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ في الكتالوج</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Replace Part & Record Movement -->
      <div *ngIf="showReplaceModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="refresh" [size]="20" style="color: #0284c7;"></app-icon>
              <div>
                <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                  استبدال وتوثيق حركة: {{ selectedPart?.part_name }}
                </h3>
                <span style="font-size: 12px; color: #64748b;">
                  المركبة: {{ selectedPart?.vehicle_plate }} (#{{ selectedPart?.vehicle_fleet }})
                </span>
              </div>
            </div>
            <button (click)="showReplaceModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitReplacement()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">عداد الاستبدال (كم) *</label>
                  <input type="number" [(ngModel)]="replaceOdometer" name="r_odo" required min="0" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">تاريخ الاستبدال الفعلي *</label>
                  <input type="date" [(ngModel)]="replaceDate" name="r_date" required class="form-control" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem;">
                <div class="form-group">
                  <label class="form-label">تكلفة القطعة / الفاتورة</label>
                  <input type="number" [(ngModel)]="replaceCost" name="r_cost" min="0" step="0.01" class="form-control" placeholder="0.00" />
                </div>
                <div class="form-group">
                  <label class="form-label">مركز الخدمة / الورشة</label>
                  <input type="text" [(ngModel)]="replaceServiceProvider" name="r_provider" class="form-control" placeholder="مثال: الورشة المركزية" />
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">ملاحظات إضافية وتفاصيل الفاتورة</label>
                <textarea [(ngModel)]="replaceNotes" name="r_notes" rows="3" class="form-control" placeholder="رقم الفاتورة، ماركة القطعة، سبب الاستبدال..."></textarea>
              </div>

              <div *ngIf="selectedPart" style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>عداد التركيب السابق:</span>
                  <strong>{{ selectedPart.installation_odometer | number }} كم</strong>
                </div>
                <div style="display: flex; justify-content: space-between; color: #0284c7;">
                  <span>المسافة المقطوعة بالقطعة الحالية:</span>
                  <strong>{{ (replaceOdometer > selectedPart.installation_odometer ? replaceOdometer - selectedPart.installation_odometer : 0) | number }} كم</strong>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showReplaceModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تأكيد الاستبدال وتوثيق الحركة</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tab-btn {
      padding: 10px 18px;
      font-weight: 600;
      font-size: 13px;
      color: #64748b;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #0284c7;
    }
    .active-tab {
      color: #0284c7;
      border-bottom-color: #0284c7;
      font-weight: 700;
    }
    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      background: #e0f2fe;
      color: #0284c7;
    }
    .badge-danger-count {
      background: #fee2e2;
      color: #dc2626;
    }
    .badge-purple {
      background: #f3e8ff;
      color: #7e22ce;
    }
    .text-rose-600 {
      color: #e11d48;
    }
    .text-amber-600 {
      color: #d97706;
    }
    .text-emerald-600 {
      color: #059669;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class PartsComponent implements OnInit {
  private fleetService = inject(FleetService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  currentView: 'MOVEMENTS' | 'FLEET_PARTS' | 'CATALOG' = 'MOVEMENTS';
  
  // Movements data
  movements: PartMovement[] = [];
  loadingMovements = true;
  movementSearch = '';
  movementTypeFilter = '';
  movementsCount = 0;
  replacementMovementsCount = 0;
  totalDistanceServed = 0;
  totalCost = 0;

  // Fleet Parts data
  fleetParts: VehiclePart[] = [];
  loadingParts = true;
  selectedStatus = '';
  overduePartsCount = 0;

  // Catalog data
  catalogList: PartCatalog[] = [];
  loadingCatalog = true;

  // Catalog Modal
  showCatalogModal = false;
  newCatalogItem: Partial<PartCatalog> = {
    category: 'ENGINE',
    default_interval_km: 10000,
    default_interval_days: 180,
    unit: 'حبة'
  };

  // Replace Modal
  showReplaceModal = false;
  selectedPart: VehiclePart | null = null;
  replaceOdometer = 0;
  replaceDate = new Date().toISOString().slice(0, 10);
  replaceCost = 0;
  replaceServiceProvider = '';
  replaceNotes = '';

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  ngOnInit(): void {
    this.loadPartMovements();
    this.loadFleetParts();
    this.loadCatalog();
  }

  switchView(view: 'MOVEMENTS' | 'FLEET_PARTS' | 'CATALOG'): void {
    this.currentView = view;
    if (view === 'MOVEMENTS' && this.movements.length === 0) {
      this.loadPartMovements();
    } else if (view === 'FLEET_PARTS' && this.fleetParts.length === 0) {
      this.loadFleetParts();
    } else if (view === 'CATALOG' && this.catalogList.length === 0) {
      this.loadCatalog();
    }
  }

  refreshActiveView(): void {
    if (this.currentView === 'MOVEMENTS') {
      this.loadPartMovements();
    } else if (this.currentView === 'FLEET_PARTS') {
      this.loadFleetParts();
    } else {
      this.loadCatalog();
    }
  }

  loadPartMovements(): void {
    this.loadingMovements = true;
    this.cdr.markForCheck();

    const params: any = {};
    if (this.movementSearch.trim()) {
      params.search = this.movementSearch.trim();
    }
    if (this.movementTypeFilter) {
      params.movement_type = this.movementTypeFilter;
    }

    this.fleetService.getPartMovements(params).subscribe({
      next: (res) => {
        this.movements = res.results;
        this.movementsCount = res.count !== undefined ? res.count : res.results.length;

        // Calculate summary stats
        this.replacementMovementsCount = this.movements.filter(
          m => m.movement_type === 'REPLACEMENT' || m.movement_type === 'MAINTENANCE'
        ).length;

        this.totalDistanceServed = this.movements.reduce(
          (sum, m) => sum + (m.distance_served || 0), 0
        );

        this.totalCost = this.movements.reduce(
          (sum, m) => sum + (m.cost ? +m.cost : 0), 0
        );

        this.loadingMovements = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل سجل حركات قطع الغيار');
        this.loadingMovements = false;
        this.cdr.markForCheck();
      }
    });
  }

  clearMovementFilters(): void {
    this.movementSearch = '';
    this.movementTypeFilter = '';
    this.loadPartMovements();
  }

  loadFleetParts(): void {
    this.loadingParts = true;
    this.cdr.markForCheck();
    this.fleetService.getVehiclePartsList({ status: this.selectedStatus }).subscribe({
      next: (res) => {
        this.fleetParts = res.results;
        this.overduePartsCount = this.fleetParts.filter(p => p.current_status === 'OVERDUE').length;
        this.loadingParts = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل قائمة القطع');
        this.loadingParts = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadCatalog(): void {
    this.loadingCatalog = true;
    this.cdr.markForCheck();
    this.fleetService.getPartCatalog().subscribe({
      next: (res) => {
        this.catalogList = res.results;
        this.loadingCatalog = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل كتالوج القطع');
        this.loadingCatalog = false;
        this.cdr.markForCheck();
      }
    });
  }

  openCreateCatalogModal(): void {
    this.newCatalogItem = {
      category: 'ENGINE',
      default_interval_km: 10000,
      default_interval_days: 180,
      unit: 'حبة'
    };
    this.showCatalogModal = true;
  }

  saveCatalogItem(): void {
    this.fleetService.createPartCatalog(this.newCatalogItem).subscribe({
      next: () => {
        this.toastService.success('تمت إضافة القطعة للكتالوج بنجاح');
        this.showCatalogModal = false;
        this.loadCatalog();
      },
      error: () => this.toastService.error('فشل حفظ القطعة')
    });
  }

  openReplaceModal(p: VehiclePart): void {
    this.selectedPart = p;
    this.replaceOdometer = p.next_replacement_km;
    this.replaceDate = new Date().toISOString().slice(0, 10);
    this.replaceCost = 0;
    this.replaceServiceProvider = '';
    this.replaceNotes = '';
    this.showReplaceModal = true;
  }

  submitReplacement(): void {
    if (!this.selectedPart) return;
    this.fleetService.replaceVehiclePart(this.selectedPart.id, {
      new_odometer: this.replaceOdometer,
      replacement_date: this.replaceDate,
      cost: this.replaceCost,
      service_provider: this.replaceServiceProvider,
      notes: this.replaceNotes
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم تسجيل الاستبدال وتوثيق الحركة بنجاح');
        this.showReplaceModal = false;
        this.loadFleetParts();
        this.loadPartMovements(); // refresh movements history as well
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل تسجيل الاستبدال');
        this.cdr.markForCheck();
      }
    });
  }
}
