import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FleetService } from '../../core/services/fleet.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PartCatalog, VehiclePart } from '../../core/models/models';
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
            قطع الغيار والكتالوج الفني
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            مراقبة فواصل الاستبدال الوقائية لقطع الغيار وجداول صلاحيتها لكافة مركبات الأسطول
          </p>
        </div>

        <div>
          <button *ngIf="canWrite"
                  (click)="openCreateCatalogModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13.5px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>إضافة قطعة للكتالوج</span>
          </button>
        </div>
      </div>

      <!-- View Switcher Tabs -->
      <div style="display: flex; border-bottom: 2px solid #e2e8f0; gap: 0.5rem;">
        <button (click)="currentView = 'FLEET_PARTS'" class="tab-btn" [class.active-tab]="currentView === 'FLEET_PARTS'">
          <app-icon name="truck" [size]="16"></app-icon>
          <span>مراقبة حالة قطع مركبات الأسطول</span>
        </button>
        <button (click)="currentView = 'CATALOG'" class="tab-btn" [class.active-tab]="currentView === 'CATALOG'">
          <app-icon name="cog" [size]="16"></app-icon>
          <span>كتالوج قطع الغيار المعتمدة</span>
        </button>
      </div>

      <!-- View 1: Fleet Parts Monitor -->
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
                <th>تاريخ وعداد التركيب</th>
                <th>الفاصل المعتمد</th>
                <th>العداد المستهدف</th>
                <th>المتبقي (كم)</th>
                <th>المتبقي (أيام)</th>
                <th>الحالة</th>
                <th *ngIf="canWrite" style="text-align: center; width: 100px;">إجراء</th>
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
                          title="تسجيل استبدال فوري">
                    <app-icon name="refresh" [size]="12"></app-icon>
                    <span>استبدال</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- View 2: Part Catalog -->
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

      <!-- Modal: Replace Part -->
      <div *ngIf="showReplaceModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="refresh" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                استبدال: {{ selectedPart?.part_name }}
              </h3>
            </div>
            <button (click)="showReplaceModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitReplacement()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">قراءة العداد عند الاستبدال (كم) *</label>
                <input type="number" [(ngModel)]="replaceOdometer" name="r_odo" required min="0" class="form-control" />
              </div>
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">تاريخ الاستبدال الفعلي *</label>
                <input type="date" [(ngModel)]="replaceDate" name="r_date" required class="form-control" />
              </div>
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">ملاحظات الورشة والفاتورة</label>
                <textarea [(ngModel)]="replaceNotes" name="r_notes" rows="3" class="form-control" placeholder="رقم الفاتورة واسم مركز الخدمة..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showReplaceModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تأكيد الاستبدال وتصفير العداد</span>
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
      gap: 6px;
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

  currentView: 'FLEET_PARTS' | 'CATALOG' = 'FLEET_PARTS';
  fleetParts: VehiclePart[] = [];
  catalogList: PartCatalog[] = [];
  loadingParts = true;
  loadingCatalog = true;
  selectedStatus = '';

  showCatalogModal = false;
  newCatalogItem: Partial<PartCatalog> = {
    category: 'ENGINE',
    default_interval_km: 10000,
    default_interval_days: 180,
    unit: 'حبة'
  };

  showReplaceModal = false;
  selectedPart: VehiclePart | null = null;
  replaceOdometer = 0;
  replaceDate = new Date().toISOString().slice(0, 10);
  replaceNotes = '';

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  ngOnInit(): void {
    this.loadFleetParts();
    this.loadCatalog();
  }

  loadFleetParts(): void {
    this.loadingParts = true;
    this.cdr.markForCheck();
    this.fleetService.getVehiclePartsList({ status: this.selectedStatus }).subscribe({
      next: (res) => {
        this.fleetParts = res.results;
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
    this.replaceNotes = '';
    this.showReplaceModal = true;
  }

  submitReplacement(): void {
    if (!this.selectedPart) return;
    this.fleetService.replaceVehiclePart(this.selectedPart.id, {
      new_odometer: this.replaceOdometer,
      replacement_date: this.replaceDate,
      notes: this.replaceNotes
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم تسجيل الاستبدال');
        this.showReplaceModal = false;
        this.loadFleetParts();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toastService.error(err.error?.detail || 'فشل تسجيل الاستبدال');
        this.cdr.markForCheck();
      }
    });
  }
}
