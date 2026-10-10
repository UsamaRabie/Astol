import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FleetService } from '../../core/services/fleet.service';
import { FuelService } from '../../core/services/fuel.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
  VehicleModel, VehicleColor, Department, FuelType,
  PartCatalog, VehicleType, MaintenanceType
} from '../../core/models/models';

type LookupTab = 'models' | 'colors' | 'fuel' | 'departments' | 'parts' | 'vehicleTypes' | 'maintTypes';

@Component({
  selector: 'app-lookups',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="padding: 1.5rem; max-width: 1400px; margin: 0 auto;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #0369a1); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
              <app-icon name="list" [size]="22"></app-icon>
            </div>
            <div>
              <h1 style="font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0;">إدارة القوائم والخيارات الديناميكية للنظام</h1>
              <p style="font-size: 0.85rem; color: #64748b; margin: 2px 0 0 0;">
                التحكم الكامل (CRUD) في الخيارات التي تظهر في القوائم المنسدلة (الدروب داون) عبر النظام
              </p>
            </div>
          </div>
        </div>

        <div>
          <button (click)="openAddModal()"
                  style="display: inline-flex; align-items: center; gap: 8px; background: #0284c7; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35); transition: all 0.2s;">
            <app-icon name="plus" [size]="18"></app-icon>
            <span>إضافة {{ getTabTitle(activeTab) }}</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px; display: flex; gap: 6px; margin-bottom: 1.25rem; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <button *ngFor="let tab of tabs"
                (click)="switchTab(tab.id)"
                [style.background]="activeTab === tab.id ? '#0f172a' : 'transparent'"
                [style.color]="activeTab === tab.id ? '#ffffff' : '#64748b'"
                [style.font-weight]="activeTab === tab.id ? '700' : '600'"
                style="display: inline-flex; align-items: center; gap: 8px; border: none; padding: 9px 16px; border-radius: 8px; font-size: 13.5px; cursor: pointer; white-space: nowrap; transition: all 0.15s;">
          <app-icon [name]="tab.icon" [size]="16"></app-icon>
          <span>{{ tab.label }}</span>
          <span [style.background]="activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#f1f5f9'"
                [style.color]="activeTab === tab.id ? '#ffffff' : '#475569'"
                style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
            {{ getCount(tab.id) }}
          </span>
        </button>
      </div>

      <!-- Search & Filter Bar -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="position: relative; flex: 1; max-width: 400px;">
          <input type="text"
                 [(ngModel)]="searchQuery"
                 placeholder="بحث في عناصر القائمة..."
                 style="width: 100%; padding: 9px 36px 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none; transition: border 0.2s;" />
          <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8;">
            <app-icon name="search" [size]="16"></app-icon>
          </div>
        </div>

        <div style="font-size: 12.5px; color: #64748b;">
          إجمالي العناصر المعروضة: <b>{{ getFilteredList().length }}</b>
        </div>
      </div>

      <!-- Data Card / Table Container -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div *ngIf="loading" style="padding: 3rem; text-align: center; color: #64748b;">
          <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="margin-top: 12px; font-size: 13.5px; font-weight: 600;">جاري تحميل البيانات...</p>
        </div>

        <div *ngIf="!loading && getFilteredList().length === 0" style="padding: 3.5rem; text-align: center; color: #64748b;">
          <div style="width: 54px; height: 54px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; color: #94a3b8;">
            <app-icon name="info" [size]="24"></app-icon>
          </div>
          <h3 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">لا توجد عناصر مضافة بعد</h3>
          <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 16px 0;">يمكنك إضافة عنصر جديد ليظهر في القوائم المنسدلة في كافة أقسام النظام</p>
          <button (click)="openAddModal()" style="background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
            + إضافة عنصر جديد
          </button>
        </div>

        <!-- 1. VEHICLE MODELS TABLE -->
        <table *ngIf="!loading && activeTab === 'models' && getFilteredList().length > 0" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 12px 16px;">#</th>
              <th style="padding: 12px 16px;">طراز المركبة</th>
              <th style="padding: 12px 16px;">الشركة الصانعة / الماركة</th>
              <th style="padding: 12px 16px;">الوصف والمواصفات</th>
              <th style="padding: 12px 16px; text-align: left;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getFilteredModels(); let i = index" style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;">
              <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">{{ i + 1 }}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">{{ item.name }}</td>
              <td style="padding: 12px 16px;"><span style="background: #f0f9ff; color: #0369a1; padding: 3px 10px; border-radius: 6px; font-weight: 600;">{{ item.make || 'غير محدد' }}</span></td>
              <td style="padding: 12px 16px; color: #64748b;">{{ item.description || '—' }}</td>
              <td style="padding: 12px 16px; text-align: left;">
                <button (click)="openEditModal(item)" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #0284c7; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-left: 6px;">
                  تعديل
                </button>
                <button (click)="confirmDelete(item)" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                  حذف
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 2. VEHICLE COLORS TABLE -->
        <table *ngIf="!loading && activeTab === 'colors' && getFilteredList().length > 0" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 12px 16px;">#</th>
              <th style="padding: 12px 16px;">اسم اللون</th>
              <th style="padding: 12px 16px;">معاينة اللون</th>
              <th style="padding: 12px 16px;">رمز اللون (Hex/Code)</th>
              <th style="padding: 12px 16px; text-align: left;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getFilteredColors(); let i = index" style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">{{ i + 1 }}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">{{ item.name }}</td>
              <td style="padding: 12px 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span [style.background]="item.code || '#cbd5e1'" style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid #cbd5e1; display: inline-block;"></span>
                  <span style="font-size: 12px; color: #64748b;">{{ item.name }}</span>
                </div>
              </td>
              <td style="padding: 12px 16px; font-family: monospace; color: #475569;">{{ item.code || '—' }}</td>
              <td style="padding: 12px 16px; text-align: left;">
                <button (click)="openEditModal(item)" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #0284c7; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-left: 6px;">
                  تعديل
                </button>
                <button (click)="confirmDelete(item)" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                  حذف
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 3. FUEL TYPES TABLE (WITH PRICE & CURRENCY) -->
        <table *ngIf="!loading && activeTab === 'fuel' && getFilteredList().length > 0" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 12px 16px;">#</th>
              <th style="padding: 12px 16px;">نوع الوقود</th>
              <th style="padding: 12px 16px;">سعر اللتر المعتمد</th>
              <th style="padding: 12px 16px;">العملة</th>
              <th style="padding: 12px 16px;">الوصف</th>
              <th style="padding: 12px 16px; text-align: left;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getFilteredFuel(); let i = index" style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">{{ i + 1 }}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">{{ item.name }}</td>
              <td style="padding: 12px 16px;">
                <span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 4px 10px; border-radius: 6px; font-size: 14px;">
                  {{ item.price_per_liter }} {{ item.currency }}
                </span>
              </td>
              <td style="padding: 12px 16px; font-weight: 600; color: #475569;">{{ item.currency }}</td>
              <td style="padding: 12px 16px; color: #64748b;">{{ item.description || '—' }}</td>
              <td style="padding: 12px 16px; text-align: left;">
                <button (click)="openEditModal(item)" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #0284c7; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-left: 6px;">
                  تعديل
                </button>
                <button (click)="confirmDelete(item)" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                  حذف
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 4. DEPARTMENTS TABLE -->
        <table *ngIf="!loading && activeTab === 'departments' && getFilteredList().length > 0" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 12px 16px;">#</th>
              <th style="padding: 12px 16px;">اسم القسم / الإدارة</th>
              <th style="padding: 12px 16px;">الوصف والمهام</th>
              <th style="padding: 12px 16px; text-align: left;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getFilteredDepartments(); let i = index" style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">{{ i + 1 }}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">{{ item.name }}</td>
              <td style="padding: 12px 16px; color: #64748b;">{{ item.description || '—' }}</td>
              <td style="padding: 12px 16px; text-align: left;">
                <button (click)="openEditModal(item)" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #0284c7; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-left: 6px;">
                  تعديل
                </button>
                <button (click)="confirmDelete(item)" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                  حذف
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 5. SPARE PARTS CATALOG TABLE -->
        <table *ngIf="!loading && activeTab === 'parts' && getFilteredList().length > 0" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 12px 16px;">#</th>
              <th style="padding: 12px 16px;">اسم قطعة الغيار</th>
              <th style="padding: 12px 16px;">الفئة</th>
              <th style="padding: 12px 16px;">تتغير كل كام كم (فاصل الاستبدال)</th>
              <th style="padding: 12px 16px;">عتبة التحذير للسماحية (قبل كم)</th>
              <th style="padding: 12px 16px;">الفاصل بالأيام</th>
              <th style="padding: 12px 16px; text-align: left;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getFilteredParts(); let i = index" style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">{{ i + 1 }}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">{{ item.name }}</td>
              <td style="padding: 12px 16px;"><span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">{{ item.category_display || item.category }}</span></td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0284c7;">{{ item.default_interval_km | number }} كم</td>
              <td style="padding: 12px 16px;">
                <span style="background: #fffbeb; color: #b45309; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 12px;">
                  قبل {{ (item.warning_threshold_km || 1000) | number }} كم
                </span>
              </td>
              <td style="padding: 12px 16px; color: #64748b;">{{ item.default_interval_days }} يوم</td>
              <td style="padding: 12px 16px; text-align: left;">
                <button (click)="openEditModal(item)" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #0284c7; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-left: 6px;">
                  تعديل
                </button>
                <button (click)="confirmDelete(item)" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                  حذف
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 6. VEHICLE TYPES TABLE -->
        <table *ngIf="!loading && activeTab === 'vehicleTypes' && getFilteredList().length > 0" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 12px 16px;">#</th>
              <th style="padding: 12px 16px;">اسم التصنيف</th>
              <th style="padding: 12px 16px;">الأيقونة</th>
              <th style="padding: 12px 16px;">الوصف</th>
              <th style="padding: 12px 16px; text-align: left;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getFilteredVehicleTypes(); let i = index" style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">{{ i + 1 }}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">{{ item.name }}</td>
              <td style="padding: 12px 16px;"><span style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px; font-family: monospace;">{{ item.icon || 'truck' }}</span></td>
              <td style="padding: 12px 16px; color: #64748b;">{{ item.description || '—' }}</td>
              <td style="padding: 12px 16px; text-align: left;">
                <button (click)="openEditModal(item)" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #0284c7; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-left: 6px;">
                  تعديل
                </button>
                <button (click)="confirmDelete(item)" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                  حذف
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 7. MAINTENANCE TYPES TABLE -->
        <table *ngIf="!loading && activeTab === 'maintTypes' && getFilteredList().length > 0" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
              <th style="padding: 12px 16px;">#</th>
              <th style="padding: 12px 16px;">نوع الصيانة</th>
              <th style="padding: 12px 16px;">طبيعة الصيانة</th>
              <th style="padding: 12px 16px;">المسافة المقترحة (كم)</th>
              <th style="padding: 12px 16px;">المدة المقترحة (أيام)</th>
              <th style="padding: 12px 16px;">الوصف</th>
              <th style="padding: 12px 16px; text-align: left;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getFilteredMaintTypes(); let i = index" style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">{{ i + 1 }}</td>
              <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">{{ item.name }}</td>
              <td style="padding: 12px 16px;">
                <span [style.background]="item.is_periodic ? '#ecfdf5' : '#f8fafc'"
                      [style.color]="item.is_periodic ? '#047857' : '#64748b'"
                      style="padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 12px;">
                  {{ item.is_periodic ? 'صيانة دورية' : 'إصلاح طارئ' }}
                </span>
              </td>
              <td style="padding: 12px 16px; font-weight: 600; color: #0284c7;">{{ item.recommended_km ? (item.recommended_km | number) + ' كم' : '—' }}</td>
              <td style="padding: 12px 16px; color: #64748b;">{{ item.recommended_days ? item.recommended_days + ' يوم' : '—' }}</td>
              <td style="padding: 12px 16px; color: #64748b;">{{ item.description || '—' }}</td>
              <td style="padding: 12px 16px; text-align: left;">
                <button (click)="openEditModal(item)" style="background: #f1f5f9; border: 1px solid #e2e8f0; color: #0284c7; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-left: 6px;">
                  تعديل
                </button>
                <button (click)="confirmDelete(item)" style="background: #fef2f2; border: 1px solid #fee2e2; color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                  حذف
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MODAL: ADD / EDIT DIALOG -->
      <div *ngIf="showModal" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
        <div style="background: #ffffff; border-radius: 16px; max-width: 560px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; animation: popIn 0.2s ease;">
          <div style="background: #0f172a; color: #fff; padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <app-icon name="edit" [size]="20" style="color: #38bdf8;"></app-icon>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800;">
                {{ editingItem ? 'تعديل' : 'إضافة' }} {{ getTabTitle(activeTab) }}
              </h3>
            </div>
            <button (click)="closeModal()" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px;">
              <app-icon name="x" [size]="20"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveItem()" style="padding: 1.5rem;">
            <!-- COMMON NAME FIELD -->
            <div style="margin-bottom: 1.1rem;">
              <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                الاسم / العنوان <span style="color: #ef4444;">*</span>
              </label>
              <input type="text" [(ngModel)]="formData.name" name="name" required
                     placeholder="مثال: اسم الطراز أو اللون أو الوقود"
                     style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
            </div>

            <!-- MODELS TAB SPECIFIC: MAKE -->
            <div *ngIf="activeTab === 'models'" style="margin-bottom: 1.1rem;">
              <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                الشركة الصانعة / الماركة (Make)
              </label>
              <input type="text" [(ngModel)]="formData.make" name="make"
                     placeholder="مثال: تويوتا، مرسيدس بنز، إيسوزو"
                     style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
            </div>

            <!-- COLORS TAB SPECIFIC: CODE -->
            <div *ngIf="activeTab === 'colors'" style="margin-bottom: 1.1rem;">
              <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                رمز اللون (كود اللون / Hex)
              </label>
              <div style="display: flex; gap: 10px; align-items: center;">
                <input type="color" [(ngModel)]="formData.code" name="colorPicker"
                       style="width: 44px; height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; padding: 2px;" />
                <input type="text" [(ngModel)]="formData.code" name="code"
                       placeholder="مثال: #FFFFFF أو أبيض"
                       style="flex: 1; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none; font-family: monospace;" />
              </div>
            </div>

            <!-- FUEL TAB SPECIFIC: PRICE & CURRENCY -->
            <div *ngIf="activeTab === 'fuel'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.1rem;">
              <div>
                <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                  سعر اللتر <span style="color: #ef4444;">*</span>
                </label>
                <input type="number" step="0.01" [(ngModel)]="formData.price_per_liter" name="price_per_liter" required
                       placeholder="مثال: 2.18"
                       style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
              </div>
              <div>
                <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                  العملة <span style="color: #ef4444;">*</span>
                </label>
                <input type="text" [(ngModel)]="formData.currency" name="currency" required
                       placeholder="مثال: ر.س"
                       style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
              </div>
            </div>

            <!-- PARTS TAB SPECIFIC: CATEGORY, INTERVAL, WARNING THRESHOLD -->
            <div *ngIf="activeTab === 'parts'" style="margin-bottom: 1.1rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                    فئة القطعة
                  </label>
                  <select [(ngModel)]="formData.category" name="category"
                          style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;">
                    <option value="ENGINE">المحرك وملحقاته</option>
                    <option value="BRAKES">نظام الفرامل</option>
                    <option value="SUSPENSION">نظام التعليق والإطارات</option>
                    <option value="ELECTRICAL">النظام الكهربائي والبطاريات</option>
                    <option value="FLUIDS">الزيوت والسوائل</option>
                    <option value="FILTERS">الفلاتر والمرشحات</option>
                    <option value="TRANSMISSION">ناقل الحركة</option>
                    <option value="COOLING">نظام التبريد</option>
                    <option value="BODY">الهيكل والإكسسوارات</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                    وحدة القياس
                  </label>
                  <input type="text" [(ngModel)]="formData.unit" name="unit"
                         placeholder="حبة، طقم، لتر..."
                         style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                  <label style="display: block; font-size: 13px; font-weight: 700; color: #0284c7; margin-bottom: 6px;">
                    تتغير كل كام كيلو (فاصل الاستبدال) <span style="color: #ef4444;">*</span>
                  </label>
                  <input type="number" [(ngModel)]="formData.default_interval_km" name="default_interval_km" required
                         placeholder="مثال: 10000"
                         style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
                </div>
                <div>
                  <label style="display: block; font-size: 13px; font-weight: 700; color: #b45309; margin-bottom: 6px;">
                    عتبة التحذير للسماحية (قبل موعدها بكام كم) <span style="color: #ef4444;">*</span>
                  </label>
                  <input type="number" [(ngModel)]="formData.warning_threshold_km" name="warning_threshold_km" required
                         placeholder="مثال: 1000"
                         style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
                </div>
              </div>

              <div>
                <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                  الفاصل الافتراضي بالأيام
                </label>
                <input type="number" [(ngModel)]="formData.default_interval_days" name="default_interval_days"
                       placeholder="مثال: 180"
                       style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
              </div>
            </div>

            <!-- MAINTENANCE TYPES TAB SPECIFIC -->
            <div *ngIf="activeTab === 'maintTypes'" style="margin-bottom: 1.1rem;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;">
                <input type="checkbox" id="is_periodic" [(ngModel)]="formData.is_periodic" name="is_periodic" style="width: 18px; height: 18px; cursor: pointer;" />
                <label for="is_periodic" style="font-size: 13.5px; font-weight: 700; color: #334155; cursor: pointer;">
                  صيانة دورية متكررة
                </label>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                    المسافة المقترحة (كم)
                  </label>
                  <input type="number" [(ngModel)]="formData.recommended_km" name="recommended_km"
                         placeholder="مثال: 10000"
                         style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
                </div>
                <div>
                  <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                    المدة المقترحة (أيام)
                  </label>
                  <input type="number" [(ngModel)]="formData.recommended_days" name="recommended_days"
                         placeholder="مثال: 180"
                         style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
                </div>
              </div>
            </div>

            <!-- VEHICLE TYPES TAB SPECIFIC: ICON -->
            <div *ngIf="activeTab === 'vehicleTypes'" style="margin-bottom: 1.1rem;">
              <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                اسم الأيقونة (truck, car, bus...)
              </label>
              <input type="text" [(ngModel)]="formData.icon" name="icon"
                     placeholder="truck"
                     style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;" />
            </div>

            <!-- DESCRIPTION FIELD -->
            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                الوصف والملاحظات
              </label>
              <textarea [(ngModel)]="formData.description" name="description" rows="3"
                        placeholder="أي تفاصيل أو ملاحظات توضيحية..."
                        style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none; resize: vertical;"></textarea>
            </div>

            <!-- ACTION BUTTONS -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
              <button type="button" (click)="closeModal()"
                      style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 9px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer;">
                إلغاء
              </button>
              <button type="submit" [disabled]="saving"
                      style="background: #0284c7; color: #ffffff; border: none; padding: 9px 22px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);">
                <app-icon name="check" [size]="16"></app-icon>
                <span>{{ saving ? 'جاري الحفظ...' : (editingItem ? 'تحديث البيانات' : 'حفظ العنصر') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: DELETE CONFIRMATION -->
      <div *ngIf="showDeleteModal" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
        <div style="background: #ffffff; border-radius: 16px; max-width: 440px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; padding: 1.5rem; text-align: center;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <app-icon name="alert-triangle" [size]="28"></app-icon>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">تأكيد الحذف</h3>
          <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1.5rem 0; line-height: 1.5;">
            هل أنت متأكد من رغبتك في حذف <b>"{{ itemToDelete?.name }}"</b>؟ لن يظهر هذا الخيار مجدداً في القوائم المنسدلة.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button (click)="closeDeleteModal()" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 9px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
              إلغاء
            </button>
            <button (click)="executeDelete()" [disabled]="deleting" style="background: #ef4444; border: none; color: #ffffff; padding: 9px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;">
              {{ deleting ? 'جاري الحذف...' : 'تأكيد الحذف' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class LookupsComponent implements OnInit {
  private fleetService = inject(FleetService);
  private fuelService = inject(FuelService);
  private maintService = inject(MaintenanceService);
  private toast = inject(ToastService);

  activeTab: LookupTab = 'models';
  searchQuery: string = '';
  loading: boolean = false;
  saving: boolean = false;
  deleting: boolean = false;

  showModal: boolean = false;
  showDeleteModal: boolean = false;
  editingItem: any = null;
  itemToDelete: any = null;

  formData: any = {};

  tabs: { id: LookupTab; label: string; icon: string }[] = [
    { id: 'models', label: 'طرازات المركبات', icon: 'truck' },
    { id: 'colors', label: 'ألوان المركبات', icon: 'tag' },
    { id: 'fuel', label: 'أنواع وأسعار الوقود', icon: 'fuel' },
    { id: 'departments', label: 'الأقسام والإدارات', icon: 'users' },
    { id: 'parts', label: 'كتالوج قطع الغيار', icon: 'cog' },
    { id: 'vehicleTypes', label: 'تصنيفات المركبات', icon: 'truck' },
    { id: 'maintTypes', label: 'أنواع الصيانة', icon: 'wrench' },
  ];

  modelsList: VehicleModel[] = [];
  colorsList: VehicleColor[] = [];
  fuelList: FuelType[] = [];
  deptList: Department[] = [];
  partsList: PartCatalog[] = [];
  vTypesList: VehicleType[] = [];
  mTypesList: MaintenanceType[] = [];

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading = true;
    this.fleetService.getVehicleModels().subscribe({
      next: res => { this.modelsList = res.results || (res as any); }
    });
    this.fleetService.getVehicleColors().subscribe({
      next: res => { this.colorsList = res.results || (res as any); }
    });
    this.fuelService.getFuelTypes().subscribe({
      next: res => { this.fuelList = res.results || (res as any); }
    });
    this.fleetService.getDepartments().subscribe({
      next: res => { this.deptList = res.results || (res as any); }
    });
    this.fleetService.getPartCatalog().subscribe({
      next: res => { this.partsList = res.results || (res as any); }
    });
    this.fleetService.getVehicleTypes().subscribe({
      next: res => { this.vTypesList = res.results || (res as any); }
    });
    this.maintService.getTypes().subscribe({
      next: res => {
        this.mTypesList = res.results || (res as any);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  switchTab(tab: LookupTab): void {
    this.activeTab = tab;
    this.searchQuery = '';
  }

  getCount(tab: LookupTab): number {
    switch (tab) {
      case 'models': return this.modelsList.length;
      case 'colors': return this.colorsList.length;
      case 'fuel': return this.fuelList.length;
      case 'departments': return this.deptList.length;
      case 'parts': return this.partsList.length;
      case 'vehicleTypes': return this.vTypesList.length;
      case 'maintTypes': return this.mTypesList.length;
    }
  }

  getTabTitle(tab: LookupTab): string {
    const t = this.tabs.find(x => x.id === tab);
    return t ? t.label : 'عنصر';
  }

  getFilteredList(): any[] {
    switch (this.activeTab) {
      case 'models': return this.getFilteredModels();
      case 'colors': return this.getFilteredColors();
      case 'fuel': return this.getFilteredFuel();
      case 'departments': return this.getFilteredDepartments();
      case 'parts': return this.getFilteredParts();
      case 'vehicleTypes': return this.getFilteredVehicleTypes();
      case 'maintTypes': return this.getFilteredMaintTypes();
    }
  }

  getFilteredModels(): VehicleModel[] {
    if (!this.searchQuery) return this.modelsList;
    const q = this.searchQuery.toLowerCase();
    return this.modelsList.filter(m => m.name.toLowerCase().includes(q) || (m.make && m.make.toLowerCase().includes(q)));
  }

  getFilteredColors(): VehicleColor[] {
    if (!this.searchQuery) return this.colorsList;
    const q = this.searchQuery.toLowerCase();
    return this.colorsList.filter(c => c.name.toLowerCase().includes(q));
  }

  getFilteredFuel(): FuelType[] {
    if (!this.searchQuery) return this.fuelList;
    const q = this.searchQuery.toLowerCase();
    return this.fuelList.filter(f => f.name.toLowerCase().includes(q));
  }

  getFilteredDepartments(): Department[] {
    if (!this.searchQuery) return this.deptList;
    const q = this.searchQuery.toLowerCase();
    return this.deptList.filter(d => d.name.toLowerCase().includes(q));
  }

  getFilteredParts(): PartCatalog[] {
    if (!this.searchQuery) return this.partsList;
    const q = this.searchQuery.toLowerCase();
    return this.partsList.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
  }

  getFilteredVehicleTypes(): VehicleType[] {
    if (!this.searchQuery) return this.vTypesList;
    const q = this.searchQuery.toLowerCase();
    return this.vTypesList.filter(v => v.name.toLowerCase().includes(q));
  }

  getFilteredMaintTypes(): MaintenanceType[] {
    if (!this.searchQuery) return this.mTypesList;
    const q = this.searchQuery.toLowerCase();
    return this.mTypesList.filter(m => m.name.toLowerCase().includes(q));
  }

  openAddModal(): void {
    this.editingItem = null;
    this.formData = {
      name: '',
      description: '',
      currency: 'ر.س',
      price_per_liter: 2.18,
      code: '#FFFFFF',
      category: 'ENGINE',
      default_interval_km: 10000,
      warning_threshold_km: 1000,
      default_interval_days: 180,
      unit: 'حبة',
      is_periodic: true,
      recommended_km: 10000,
      recommended_days: 180,
      icon: 'truck'
    };
    this.showModal = true;
  }

  openEditModal(item: any): void {
    this.editingItem = item;
    this.formData = { ...item };
    if (!this.formData.warning_threshold_km) this.formData.warning_threshold_km = 1000;
    if (!this.formData.currency) this.formData.currency = 'ر.س';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingItem = null;
  }

  saveItem(): void {
    if (!this.formData.name) {
      this.toast.error('يرجى إدخال الاسم');
      return;
    }
    this.saving = true;

    if (this.activeTab === 'models') {
      const obs = this.editingItem
        ? this.fleetService.updateVehicleModel(this.editingItem.id, this.formData)
        : this.fleetService.createVehicleModel(this.formData);
      obs.subscribe({
        next: () => { this.onSaveSuccess(); },
        error: err => this.onSaveError(err)
      });
    } else if (this.activeTab === 'colors') {
      const obs = this.editingItem
        ? this.fleetService.updateVehicleColor(this.editingItem.id, this.formData)
        : this.fleetService.createVehicleColor(this.formData);
      obs.subscribe({
        next: () => { this.onSaveSuccess(); },
        error: err => this.onSaveError(err)
      });
    } else if (this.activeTab === 'fuel') {
      const obs = this.editingItem
        ? this.fuelService.updateFuelType(this.editingItem.id, this.formData)
        : this.fuelService.createFuelType(this.formData);
      obs.subscribe({
        next: () => { this.onSaveSuccess(); },
        error: err => this.onSaveError(err)
      });
    } else if (this.activeTab === 'departments') {
      const obs = this.editingItem
        ? this.fleetService.updateDepartment(this.editingItem.id, this.formData)
        : this.fleetService.createDepartment(this.formData);
      obs.subscribe({
        next: () => { this.onSaveSuccess(); },
        error: err => this.onSaveError(err)
      });
    } else if (this.activeTab === 'parts') {
      const obs = this.editingItem
        ? this.fleetService.updatePartCatalog(this.editingItem.id, this.formData)
        : this.fleetService.createPartCatalog(this.formData);
      obs.subscribe({
        next: () => { this.onSaveSuccess(); },
        error: err => this.onSaveError(err)
      });
    } else if (this.activeTab === 'vehicleTypes') {
      const obs = this.editingItem
        ? this.fleetService.updateVehicleType(this.editingItem.id, this.formData)
        : this.fleetService.createVehicleType(this.formData);
      obs.subscribe({
        next: () => { this.onSaveSuccess(); },
        error: err => this.onSaveError(err)
      });
    } else if (this.activeTab === 'maintTypes') {
      const obs = this.editingItem
        ? this.maintService.updateType(this.editingItem.id, this.formData)
        : this.maintService.createType(this.formData);
      obs.subscribe({
        next: () => { this.onSaveSuccess(); },
        error: err => this.onSaveError(err)
      });
    }
  }

  onSaveSuccess(): void {
    this.saving = false;
    this.toast.success(this.editingItem ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح');
    this.closeModal();
    this.loadAllData();
  }

  onSaveError(err: any): void {
    this.saving = false;
    const msg = err.error?.name || err.error?.detail || 'حدث خطأ أثناء الحفظ';
    this.toast.error(msg);
  }

  confirmDelete(item: any): void {
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  executeDelete(): void {
    if (!this.itemToDelete) return;
    this.deleting = true;
    const id = this.itemToDelete.id;

    let obs: any;
    if (this.activeTab === 'models') obs = this.fleetService.deleteVehicleModel(id);
    else if (this.activeTab === 'colors') obs = this.fleetService.deleteVehicleColor(id);
    else if (this.activeTab === 'fuel') obs = this.fuelService.deleteFuelType(id);
    else if (this.activeTab === 'departments') obs = this.fleetService.deleteDepartment(id);
    else if (this.activeTab === 'parts') obs = this.fleetService.deletePartCatalog(id);
    else if (this.activeTab === 'vehicleTypes') obs = this.fleetService.deleteVehicleType(id);
    else if (this.activeTab === 'maintTypes') obs = this.maintService.deleteType(id);

    if (obs) {
      obs.subscribe({
        next: () => {
          this.deleting = false;
          this.toast.success('تم الحذف بنجاح');
          this.closeDeleteModal();
          this.loadAllData();
        },
        error: (err: any) => {
          this.deleting = false;
          const msg = err.error?.detail || 'تعذر الحذف، قد يكون هذا العنصر مرتبطاً ببيانات أخرى في النظام';
          this.toast.error(msg);
        }
      });
    }
  }
}
