import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FleetService } from '../../core/services/fleet.service';
import { FuelService } from '../../core/services/fuel.service';
import { DriverService } from '../../core/services/driver.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Vehicle, OdometerReading, VehiclePart, VehicleDocument,
  VehicleModel, VehicleColor, Department, FuelType, Driver
} from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;" *ngIf="vehicle">
      <!-- Breadcrumb & Back Action -->
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
          <a routerLink="/vehicles" style="color: #0284c7; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
            <app-icon name="chevron-right" [size]="14"></app-icon>
            <span>أسطول المركبات</span>
          </a>
          <span style="color: #cbd5e1;">/</span>
          <span style="color: #64748b; font-weight: 600;">ملف المركبة #{{ vehicle.internal_fleet_number }}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button (click)="evaluateVehicle()"
                  [disabled]="evaluating"
                  class="btn btn-outline btn-sm"
                  style="display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 12.5px;">
            <app-icon name="refresh" [size]="14" [className]="evaluating ? 'spin' : ''"></app-icon>
            <span *ngIf="!evaluating">فحص الصيانة وتحديث التنبيهات</span>
            <span *ngIf="evaluating">جاري التدقيق...</span>
          </button>
          <button *ngIf="canWrite"
                  (click)="showOdometerModal = true"
                  class="btn btn-secondary btn-sm"
                  style="display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 12.5px;">
            <app-icon name="gauge" [size]="14"></app-icon>
            <span>تحديث قراءة العداد</span>
          </button>
          <button *ngIf="isAdmin"
                  (click)="openEditVehicleModal()"
                  class="btn btn-primary btn-sm"
                  style="display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 12.5px;">
            <app-icon name="edit" [size]="14"></app-icon>
            <span>تعديل المركبة</span>
          </button>
          <button *ngIf="isAdmin"
                  (click)="showDeleteModal = true"
                  class="btn btn-outline btn-sm"
                  style="display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 12.5px; color: #e11d48; border-color: #fecdd3;">
            <app-icon name="trash" [size]="14"></app-icon>
            <span>حذف المركبة</span>
          </button>
        </div>
      </div>

      <!-- Executive Vehicle Header Card -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.5rem;">
          <!-- Identification -->
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="background: #f1f5f9; color: #0284c7; width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; flex-shrink: 0;">
              <app-icon name="truck" [size]="28"></app-icon>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.3px;">
                  {{ vehicle.make }} {{ vehicle.model }}
                </h1>
                <span class="plate-badge">{{ vehicle.plate_number }}</span>
                <span class="badge" [ngClass]="{
                  'badge-success': vehicle.status === 'ACTIVE',
                  'badge-warning': vehicle.status === 'IN_MAINTENANCE',
                  'badge-danger': vehicle.status === 'OUT_OF_SERVICE',
                  'badge-secondary': vehicle.status === 'RETIRED'
                }">
                  {{ vehicle.status_display }}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: #64748b; margin-top: 6px; flex-wrap: wrap;">
                <span>الرقم الداخلي: <strong style="color: #0f172a;">{{ vehicle.internal_fleet_number }}</strong></span>
                <span>•</span>
                <span>سنة الصنع: <strong style="color: #0f172a;">{{ vehicle.year }}</strong></span>
                <span>•</span>
                <span>التصنيف: <strong style="color: #0f172a;">{{ vehicle.vehicle_type_name }}</strong></span>
                <span>•</span>
                <span>القسم: <strong style="color: #0f172a;">{{ vehicle.department || 'العمليات الميدانية' }}</strong></span>
              </div>
            </div>
          </div>

          <!-- Quick Metrics Bar -->
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div style="text-align: left; padding-left: 1.5rem; border-left: 1px solid #e2e8f0;">
              <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">قراءة العداد الحالية</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #059669; line-height: 1.2;">
                {{ vehicle.current_odometer | number }} <span style="font-size: 12px; font-weight: 600; color: #64748b;">كم</span>
              </div>
            </div>
            <div style="text-align: left;">
              <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">السائق المعين</div>
              <div style="font-size: 1.15rem; font-weight: 700; color: #0f172a; line-height: 1.2;">
                {{ vehicle.driver_name || 'غير معين' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; border-bottom: 2px solid #e2e8f0; gap: 0.5rem; overflow-x: auto;">
        <button (click)="activeTab = 'OVERVIEW'" class="tab-btn" [class.active-tab]="activeTab === 'OVERVIEW'">
          <app-icon name="file-text" [size]="15"></app-icon>
          <span>المواصفات والبيانات</span>
        </button>
        <button (click)="activeTab = 'PARTS'" class="tab-btn" [class.active-tab]="activeTab === 'PARTS'">
          <app-icon name="cog" [size]="15"></app-icon>
          <span>قطع الغيار والفواصل ({{ parts.length }})</span>
        </button>
        <button (click)="activeTab = 'ODOMETER'" class="tab-btn" [class.active-tab]="activeTab === 'ODOMETER'">
          <app-icon name="gauge" [size]="15"></app-icon>
          <span>سجل حركات العداد ({{ odometerHistory.length }})</span>
        </button>
        <button (click)="activeTab = 'MAINTENANCE'" class="tab-btn" [class.active-tab]="activeTab === 'MAINTENANCE'">
          <app-icon name="wrench" [size]="15"></app-icon>
          <span>سجلات الصيانة ({{ maintenanceRecords.length }})</span>
        </button>
        <button (click)="activeTab = 'FUEL'" class="tab-btn" [class.active-tab]="activeTab === 'FUEL'">
          <app-icon name="fuel" [size]="15"></app-icon>
          <span>استهلاك الوقود ({{ fuelRecords.length }})</span>
        </button>
        <button (click)="activeTab = 'DOCUMENTS'" class="tab-btn" [class.active-tab]="activeTab === 'DOCUMENTS'">
          <app-icon name="shield-check" [size]="15"></app-icon>
          <span>الوثائق والتراخيص ({{ documents.length }})</span>
        </button>
      </div>

      <!-- Tab 1: Overview & Specs -->
      <div *ngIf="activeTab === 'OVERVIEW'" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">
        <div class="card">
          <div class="card-header" style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="truck" [size]="18" style="color: #0284c7;"></app-icon>
            <span style="font-weight: 700; font-size: 14px; color: #0f172a;">بيانات الهيكل والمحرك</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 13.5px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">الرقم الداخلي:</span>
              <strong style="color: #0284c7;">{{ vehicle.internal_fleet_number }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">رقم اللوحة الرسمي:</span>
              <strong>{{ vehicle.plate_number }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">تصنيف المركبة:</span>
              <strong>{{ vehicle.vehicle_type_name }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">الصانع والموديل:</span>
              <strong>{{ vehicle.make }} {{ vehicle.model }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">سنة الصنع:</span>
              <strong>{{ vehicle.year }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">اللون الخارجي:</span>
              <strong>{{ vehicle.color }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">رقم الهيكل (VIN):</span>
              <strong style="font-family: monospace; font-size: 12.5px; color: #0f172a;">{{ vehicle.vin }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">نوع الوقود:</span>
              <strong>{{ vehicle.fuel_type_display }}</strong>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="shield-check" [size]="18" style="color: #0284c7;"></app-icon>
            <span style="font-weight: 700; font-size: 14px; color: #0f172a;">الإسناد وتواريخ سريان الوثائق</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 13.5px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">السائق المعين حالياً:</span>
              <strong style="color: #0f172a;">{{ vehicle.driver_name || 'غير معين' }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">القسم التابع:</span>
              <strong>{{ vehicle.department || 'عام' }}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">تاريخ انتهاء الاستمارة:</span>
              <strong [style.color]="vehicle.registration_expiry_date ? '#0f172a' : '#94a3b8'">
                {{ vehicle.registration_expiry_date || 'غير محدد' }}
              </strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">تاريخ انتهاء وثيقة التأمين:</span>
              <strong [style.color]="vehicle.insurance_expiry_date ? '#0f172a' : '#94a3b8'">
                {{ vehicle.insurance_expiry_date || 'غير محدد' }}
              </strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="color: #64748b;">تاريخ انتهاء الفحص الدوري:</span>
              <strong [style.color]="vehicle.periodic_inspection_expiry_date ? '#0f172a' : '#94a3b8'">
                {{ vehicle.periodic_inspection_expiry_date || 'غير محدد' }}
              </strong>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
              <span style="font-size: 12px; color: #64748b; font-weight: 600;">ملاحظات تشغيلية:</span>
              <p style="margin: 0; font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; color: #475569;">
                {{ vehicle.notes || 'لا توجد ملاحظات إضافية مسجلة لهذه المركبة' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Parts & Maintenance Health -->
      <div *ngIf="activeTab === 'PARTS'" class="card">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="cog" [size]="18" style="color: #0284c7;"></app-icon>
            <span style="font-weight: 700; font-size: 14px; color: #0f172a;">فواصل استبدال قطع الغيار الوقائية</span>
          </div>
          <span style="font-size: 12px; color: #64748b;">العداد الحالي: <strong style="color: #059669;">{{ vehicle.current_odometer | number }} كم</strong></span>
        </div>

        <div class="table-container">
          <table class="table" style="font-size: 12.5px;">
            <thead>
              <tr>
                <th>قطعة الغيار</th>
                <th>الفئة</th>
                <th>تاريخ وعداد التركيب</th>
                <th>فاصل الاستبدال</th>
                <th>العداد المستهدف</th>
                <th>المتبقي (كم)</th>
                <th>المتبقي (أيام)</th>
                <th>الحالة</th>
                <th *ngIf="canWrite" style="text-align: center; width: 100px;">إجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="parts.length === 0">
                <td colspan="9" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
                  لا توجد قطع غيار مسندة لهذه المركبة
                </td>
              </tr>
              <tr *ngFor="let p of parts">
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
                  <button (click)="openReplacePartModal(p)"
                          class="btn btn-outline btn-sm"
                          style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; font-size: 11.5px; border-radius: 6px;">
                    <app-icon name="refresh" [size]="12"></app-icon>
                    <span>استبدال</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: Odometer History -->
      <div *ngIf="activeTab === 'ODOMETER'" class="card">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="gauge" [size]="18" style="color: #0284c7;"></app-icon>
            <span style="font-weight: 700; font-size: 14px; color: #0f172a;">سجل قراءات العداد المعتمد تاريخياً</span>
          </div>
          <button *ngIf="canWrite"
                  (click)="showOdometerModal = true"
                  class="btn btn-primary btn-sm"
                  style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; border-radius: 6px;">
            <app-icon name="plus" [size]="14"></app-icon>
            <span>تسجيل قراءة جديدة</span>
          </button>
        </div>

        <div class="table-container">
          <table class="table" style="font-size: 12.5px;">
            <thead>
              <tr>
                <th>قراءة العداد</th>
                <th>التاريخ والوقت</th>
                <th>المصدر</th>
                <th>المسؤول</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="odometerHistory.length === 0">
                <td colspan="5" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
                  لا توجد قراءات مسجلة في التاريخ
                </td>
              </tr>
              <tr *ngFor="let o of odometerHistory">
                <td style="font-weight: 800; color: #059669;">{{ o.reading | number }} كم</td>
                <td>{{ o.date_time | date:'yyyy-MM-dd HH:mm' }}</td>
                <td><span class="badge badge-secondary" style="font-size: 10.5px;">{{ o.source_display }}</span></td>
                <td>{{ o.user_name || 'النظام المركزي' }}</td>
                <td style="color: #64748b;">{{ o.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Maintenance History -->
      <div *ngIf="activeTab === 'MAINTENANCE'" class="card">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="wrench" [size]="18" style="color: #0284c7;"></app-icon>
            <span style="font-weight: 700; font-size: 14px; color: #0f172a;">سجلات الصيانة والإصلاحات</span>
          </div>
          <a routerLink="/maintenance"
             class="btn btn-secondary btn-sm"
             style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; border-radius: 6px;">
            <app-icon name="plus" [size]="14"></app-icon>
            <span>إضافة صيانة</span>
          </a>
        </div>

        <div *ngIf="maintenanceRecords.length === 0" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
          لا توجد سجلات صيانة مسجلة لهذه المركبة
        </div>

        <div class="table-container" *ngIf="maintenanceRecords.length > 0">
          <table class="table" style="font-size: 12.5px;">
            <thead>
              <tr>
                <th>نوع الصيانة</th>
                <th>التاريخ</th>
                <th>قراءة العداد</th>
                <th>التكلفة الإجمالية</th>
                <th>مزود الخدمة</th>
                <th>الفني</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of maintenanceRecords">
                <td style="font-weight: 700; color: #0f172a;">{{ m.maintenance_type_name }}</td>
                <td>{{ m.maintenance_date }}</td>
                <td>{{ m.odometer | number }} كم</td>
                <td style="font-weight: 700; color: #e11d48;">{{ m.cost | number:'1.2-2' }} ر.س</td>
                <td>{{ m.service_provider || '-' }}</td>
                <td>{{ m.technician || '-' }}</td>
                <td><span class="badge badge-success" style="font-size: 10.5px;">{{ m.status_display }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 5: Fuel History -->
      <div *ngIf="activeTab === 'FUEL'" class="card">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="fuel" [size]="18" style="color: #0284c7;"></app-icon>
            <span style="font-weight: 700; font-size: 14px; color: #0f172a;">سجلات التزود بالوقود</span>
          </div>
          <a routerLink="/fuel"
             class="btn btn-secondary btn-sm"
             style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; border-radius: 6px;">
            <app-icon name="plus" [size]="14"></app-icon>
            <span>إضافة وقود</span>
          </a>
        </div>

        <div *ngIf="fuelRecords.length === 0" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
          لا توجد سجلات وقود مسجلة لهذه المركبة
        </div>

        <div class="table-container" *ngIf="fuelRecords.length > 0">
          <table class="table" style="font-size: 12.5px;">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>العداد</th>
                <th>نوع الوقود</th>
                <th>الكمية</th>
                <th>سعر اللتر</th>
                <th>التكلفة الإجمالية</th>
                <th>المحطة</th>
                <th>السائق</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let f of fuelRecords">
                <td>{{ f.date }}</td>
                <td>{{ f.odometer | number }} كم</td>
                <td>{{ f.fuel_type_display }}</td>
                <td style="font-weight: 700;">{{ f.quantity | number:'1.1-1' }} لتر</td>
                <td>{{ f.price_per_unit | number:'1.2-2' }} ر.س</td>
                <td style="font-weight: 700; color: #ea580c;">{{ f.total_cost | number:'1.2-2' }} ر.س</td>
                <td>{{ f.station || '-' }}</td>
                <td>{{ f.driver_name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 6: Documents -->
      <div *ngIf="activeTab === 'DOCUMENTS'" class="card">
        <div class="card-header" style="display: flex; align-items: center; gap: 8px;">
          <app-icon name="shield-check" [size]="18" style="color: #0284c7;"></app-icon>
          <span style="font-weight: 700; font-size: 14px; color: #0f172a;">الوثائق والتراخيص الرسمية</span>
        </div>

        <div *ngIf="documents.length === 0" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
          لا توجد وثائق إضافية مرفقة
        </div>

        <div class="table-container" *ngIf="documents.length > 0">
          <table class="table" style="font-size: 12.5px;">
            <thead>
              <tr>
                <th>نوع الوثيقة</th>
                <th>رقم الوثيقة</th>
                <th>تاريخ الإصدار</th>
                <th>تاريخ الانتهاء</th>
                <th>الأيام المتبقية</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of documents">
                <td style="font-weight: 700;">{{ d.doc_type_display }}</td>
                <td>{{ d.document_number || '-' }}</td>
                <td>{{ d.issue_date || '-' }}</td>
                <td>{{ d.expiry_date }}</td>
                <td style="font-weight: 700;"
                    [ngClass]="{
                      'text-rose-600': (d.days_until_expiry || 0) < 0,
                      'text-amber-600': (d.days_until_expiry || 0) >= 0 && (d.days_until_expiry || 0) <= 30
                    }">
                  {{ d.days_until_expiry }} يوم
                </td>
                <td>
                  <span class="badge" [ngClass]="(d.days_until_expiry || 0) < 0 ? 'badge-danger' : ((d.days_until_expiry || 0) <= 30 ? 'badge-warning' : 'badge-success')" style="font-size: 11px;">
                    {{ (d.days_until_expiry || 0) < 0 ? 'منتهية الصلاحية' : ((d.days_until_expiry || 0) <= 30 ? 'قرب الانتهاء' : 'سارية الصلاحية') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Odometer Update -->
      <div *ngIf="showOdometerModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="gauge" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تحديث عداد المركبة #{{ vehicle.internal_fleet_number }}
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
                  <span style="font-size: 15px; font-weight: 800; color: #0284c7;">{{ vehicle.current_odometer | number }} كم</span>
                </div>
                <div style="font-size: 11px; color: #0284c7; opacity: 0.9;">
                  تنبيه: يجب أن تكون القراءة الجديدة أكبر من أو تساوي القراءة الحالية.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">قراءة العداد الجديدة (كم) *</label>
                <input type="number"
                       [(ngModel)]="newOdometerReading"
                       name="new_odo"
                       required
                       [min]="vehicle.current_odometer"
                       class="form-control" />
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">ملاحظات التحديث والموقع</label>
                <textarea [(ngModel)]="odometerNotes"
                          name="odo_notes"
                          rows="3"
                          class="form-control"
                          placeholder="سبب القراءة والموقع الميداني..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showOdometerModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تأكيد القراءة</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Replace Part -->
      <div *ngIf="showReplacePartModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="wrench" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تسجيل استبدال قطعة: {{ selectedPartToReplace?.part_name }}
              </h3>
            </div>
            <button (click)="showReplacePartModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="submitPartReplacement()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">قراءة العداد عند الاستبدال (كم) *</label>
                <input type="number" [(ngModel)]="replaceOdometer" name="rep_odo" required min="0" class="form-control" />
              </div>
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">تاريخ الاستبدال الفعلي *</label>
                <input type="date" [(ngModel)]="replaceDate" name="rep_date" required class="form-control" />
              </div>
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">ملاحظات الورشة والفاتورة</label>
                <textarea [(ngModel)]="replaceNotes"
                          name="rep_notes"
                          rows="3"
                          class="form-control"
                          placeholder="اسم الورشة أو مزود الخدمة، رقم الفاتورة..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showReplacePartModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>تأكيد الاستبدال وإعادة ضبط الفاصل</span>
              </button>
            </div>
          </form>
        </div>
      <!-- Modal: Edit Vehicle (Admin) -->
      <div *ngIf="showEditModal" class="modal-overlay">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="edit" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                تعديل بيانات المركبة #{{ vehicle.internal_fleet_number }}
              </h3>
            </div>
            <button (click)="showEditModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveVehicleEdit()">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">الشركة المصنعة (Make) *</label>
                  <input type="text" [(ngModel)]="editingVehicle.make" name="edit_make" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">طراز المركبة (Model) *</label>
                  <select [(ngModel)]="editingVehicle.model" name="edit_model" required class="form-select">
                    <option value="">-- اختر طراز المركبة --</option>
                    <option *ngFor="let m of models" [value]="m.name">{{ m.name }} ({{ m.make }})</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">سنة الصنع *</label>
                  <input type="number" [(ngModel)]="editingVehicle.year" name="edit_year" required min="1990" max="2035" class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">رقم اللوحة الرسمي *</label>
                  <input type="text" [(ngModel)]="editingVehicle.plate_number" name="edit_plate" required class="form-control" />
                </div>

                <div class="form-group">
                  <label class="form-label">نوع وتصنيف المركبة *</label>
                  <select [(ngModel)]="editingVehicle.vehicle_type" name="edit_type" required class="form-select">
                    <option *ngFor="let t of vehicleTypes" [value]="t.id">{{ t.name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">لون المركبة</label>
                  <select [(ngModel)]="editingVehicle.color" name="edit_color" class="form-select">
                    <option value="">-- اختر اللون --</option>
                    <option *ngFor="let c of colors" [value]="c.name">{{ c.name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">نوع الوقود</label>
                  <select [(ngModel)]="editingVehicle.fuel_type" name="edit_fuel" class="form-select">
                    <option value="">-- اختر نوع الوقود --</option>
                    <option *ngFor="let ft of fuelTypes" [value]="ft.name">{{ ft.name }} ({{ ft.price_per_liter }} {{ ft.currency }})</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">القسم التابع له</label>
                  <select [(ngModel)]="editingVehicle.department" name="edit_dept" class="form-select">
                    <option value="">-- اختر القسم --</option>
                    <option *ngFor="let d of departments" [value]="d.name">{{ d.name }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">السائق المعين</label>
                  <select [(ngModel)]="editingVehicle.assigned_driver" name="edit_driver" class="form-select">
                    <option [ngValue]="null">-- بدون سائق معين --</option>
                    <option *ngFor="let drv of drivers" [value]="drv.id">{{ drv.full_name }} ({{ drv.phone_number }})</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">الحالة التشغيلية *</label>
                  <select [(ngModel)]="editingVehicle.status" name="edit_st" required class="form-select">
                    <option value="ACTIVE">نشطة في الخدمة</option>
                    <option value="IN_MAINTENANCE">في الصيانة</option>
                    <option value="OUT_OF_SERVICE">خارج الخدمة</option>
                    <option value="RETIRED">متقاعدة</option>
                  </select>
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">ملاحظات</label>
                  <textarea [(ngModel)]="editingVehicle.notes" name="edit_notes" rows="2" class="form-control"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showEditModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ تعديلات المركبة</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: Confirm Delete Vehicle (Admin) -->
      <div *ngIf="showDeleteModal && vehicle" class="modal-overlay">
        <div class="modal-box" style="max-width: 440px;">
          <div class="modal-header">
            <h3 style="font-weight: 700; font-size: 1.1rem; color: #e11d48; margin: 0; display: flex; align-items: center; gap: 8px;">
              <app-icon name="alert-triangle" [size]="20"></app-icon>
              <span>تأكيد حذف المركبة</span>
            </h3>
            <button (click)="showDeleteModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>
          <div class="modal-body" style="padding: 1.25rem;">
            <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin: 0;">
              هل أنت متأكد من حذف المركبة
              <strong style="color: #0f172a;">#{{ vehicle.internal_fleet_number }} ({{ vehicle.plate_number }})</strong>؟
              سيتم نقلها إلى المحذوفات وحجبها من العمليات.
            </p>
          </div>
          <div class="modal-footer" style="padding: 1rem 1.25rem;">
            <button type="button" (click)="showDeleteModal = false" class="btn btn-secondary">إلغاء</button>
            <button type="button" (click)="confirmDeleteVehicle()" class="btn btn-danger" style="display: inline-flex; align-items: center; gap: 6px;">
              <app-icon name="trash" [size]="15"></app-icon>
              <span>نعم، حذف المركبة</span>
            </button>
          </div>
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
export class VehicleDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fleetService = inject(FleetService);
  private fuelService = inject(FuelService);
  private driverService = inject(DriverService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  vehicleId!: number;
  vehicle: Vehicle | null = null;
  activeTab: 'OVERVIEW' | 'PARTS' | 'ODOMETER' | 'MAINTENANCE' | 'FUEL' | 'DOCUMENTS' = 'OVERVIEW';

  parts: VehiclePart[] = [];
  odometerHistory: OdometerReading[] = [];
  maintenanceRecords: any[] = [];
  fuelRecords: any[] = [];
  documents: VehicleDocument[] = [];

  evaluating = false;
  showOdometerModal = false;
  newOdometerReading = 0;
  odometerNotes = '';

  showReplacePartModal = false;
  selectedPartToReplace: VehiclePart | null = null;
  replaceOdometer = 0;
  replaceDate = new Date().toISOString().slice(0, 10);
  replaceNotes = '';

  showEditModal = false;
  showDeleteModal = false;
  editingVehicle: any = {};
  models: VehicleModel[] = [];
  colors: VehicleColor[] = [];
  fuelTypes: FuelType[] = [];
  departments: Department[] = [];
  vehicleTypes: any[] = [];
  drivers: any[] = [];

  get canWrite(): boolean {
    return this.authService.canWrite();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.vehicleId = +id;
      this.loadAllVehicleData();
    }
  }

  loadAllVehicleData(): void {
    this.fleetService.getVehicle(this.vehicleId).subscribe({
      next: (v) => {
        this.vehicle = v;
        this.newOdometerReading = v.current_odometer;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل بيانات المركبة');
        this.cdr.markForCheck();
      }
    });

    this.fleetService.getVehicleParts(this.vehicleId).subscribe({
      next: (p) => {
        this.parts = p;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.fleetService.getOdometerHistory(this.vehicleId).subscribe({
      next: (h) => {
        this.odometerHistory = h;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.fleetService.getVehicleMaintenance(this.vehicleId).subscribe({
      next: (m) => {
        this.maintenanceRecords = m;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.fleetService.getVehicleFuel(this.vehicleId).subscribe({
      next: (f) => {
        this.fuelRecords = f;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.fleetService.getVehicleDocuments(this.vehicleId).subscribe({
      next: (d) => {
        this.documents = d;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  evaluateVehicle(): void {
    this.evaluating = true;
    this.cdr.markForCheck();
    this.fleetService.evaluateVehicle(this.vehicleId).subscribe({
      next: () => {
        this.evaluating = false;
        this.toastService.success('تم فحص حالة الصيانة وتحديث التنبيهات بنجاح');
        this.loadAllVehicleData();
        this.cdr.markForCheck();
      },
      error: () => {
        this.evaluating = false;
        this.toastService.error('فشل فحص حالة الصيانة');
        this.cdr.markForCheck();
      }
    });
  }

  submitOdometerUpdate(): void {
    if (!this.vehicle) return;
    this.fleetService.updateOdometer(this.vehicleId, {
      new_reading: this.newOdometerReading,
      notes: this.odometerNotes,
      source: 'MANUAL'
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم تحديث العداد');
        this.showOdometerModal = false;
        this.loadAllVehicleData();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل تحديث العداد';
        this.toastService.error(msg);
      }
    });
  }

  openReplacePartModal(part: VehiclePart): void {
    this.selectedPartToReplace = part;
    this.replaceOdometer = this.vehicle ? this.vehicle.current_odometer : 0;
    this.replaceDate = new Date().toISOString().slice(0, 10);
    this.replaceNotes = '';
    this.showReplacePartModal = true;
  }

  submitPartReplacement(): void {
    if (!this.selectedPartToReplace) return;
    this.fleetService.replaceVehiclePart(this.selectedPartToReplace.id, {
      new_odometer: this.replaceOdometer,
      replacement_date: this.replaceDate,
      notes: this.replaceNotes
    }).subscribe({
      next: (res) => {
        this.toastService.success(res.message || 'تم تسجيل الاستبدال');
        this.showReplacePartModal = false;
        this.loadAllVehicleData();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل تسجيل استبدال القطعة';
        this.toastService.error(msg);
      }
    });
  }

  loadLookups(): void {
    this.fleetService.getVehicleModels().subscribe({
      next: (res) => { this.models = res.results; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.fleetService.getVehicleColors().subscribe({
      next: (res) => { this.colors = res.results; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.fuelService.getFuelTypes().subscribe({
      next: (res) => { this.fuelTypes = res.results; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.fleetService.getDepartments().subscribe({
      next: (res) => { this.departments = res.results; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.fleetService.getVehicleTypes().subscribe({
      next: (res) => { this.vehicleTypes = res.results; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.driverService.getDrivers().subscribe({
      next: (res: any) => { this.drivers = res.results; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  openEditVehicleModal(): void {
    if (!this.vehicle) return;
    this.loadLookups();
    this.editingVehicle = {
      make: this.vehicle.make,
      model: this.vehicle.model,
      year: this.vehicle.year,
      plate_number: this.vehicle.plate_number,
      vehicle_type: this.vehicle.vehicle_type,
      color: this.vehicle.color || '',
      fuel_type: this.vehicle.fuel_type || '',
      department: this.vehicle.department || '',
      assigned_driver: this.vehicle.assigned_driver || null,
      status: this.vehicle.status,
      notes: this.vehicle.notes || ''
    };
    this.showEditModal = true;
  }

  saveVehicleEdit(): void {
    this.fleetService.updateVehicle(this.vehicleId, this.editingVehicle).subscribe({
      next: () => {
        this.toastService.success('تم تحديث بيانات المركبة بنجاح');
        this.showEditModal = false;
        this.loadAllVehicleData();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.plate_number?.[0] || 'فشل تحديث بيانات المركبة';
        this.toastService.error(msg);
      }
    });
  }

  confirmDeleteVehicle(): void {
    this.fleetService.deleteVehicle(this.vehicleId).subscribe({
      next: () => {
        this.toastService.success('تم حذف المركبة بنجاح');
        this.showDeleteModal = false;
        this.router.navigate(['/vehicles']);
      },
      error: (err) => {
        const msg = err.error?.detail || 'فشل حذف المركبة';
        this.toastService.error(msg);
      }
    });
  }
}
