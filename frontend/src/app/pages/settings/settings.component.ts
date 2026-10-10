import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { User, SystemSetting } from '../../core/models/models';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px;">
            إدارة المستخدمين وإعدادات النظام
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            إدارة حسابات الفريق وصلاحيات الوصول، وتعيين معايير وعتبات محرك الصيانة الوقائية
          </p>
        </div>

        <div>
          <button *ngIf="currentTab === 'USERS'"
                  (click)="openCreateUserModal()"
                  class="btn btn-primary"
                  style="display: flex; align-items: center; gap: 6px; border-radius: 8px; font-size: 13.5px;">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>إضافة مستخدم جديد</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; border-bottom: 2px solid #e2e8f0; gap: 0.5rem;">
        <button (click)="currentTab = 'USERS'" class="tab-btn" [class.active-tab]="currentTab === 'USERS'">
          <app-icon name="users" [size]="16"></app-icon>
          <span>إدارة المستخدمين والصلاحيات</span>
        </button>
        <button (click)="currentTab = 'SETTINGS'" class="tab-btn" [class.active-tab]="currentTab === 'SETTINGS'">
          <app-icon name="cog" [size]="16"></app-icon>
          <span>إعدادات النظام وعتبات الصيانة</span>
        </button>
      </div>

      <!-- Tab 1: Users Management -->
      <div *ngIf="currentTab === 'USERS'" style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="table-container">
          <table class="table" style="font-size: 13px;">
            <thead>
              <tr>
                <th>الاسم الكامل</th>
                <th>اسم المستخدم</th>
                <th>الدور والصلاحية</th>
                <th>البريد الإلكتروني</th>
                <th>رقم الهاتف</th>
                <th>القسم</th>
                <th>الحالة</th>
                <th style="text-align: center; width: 100px;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loadingUsers">
                <td colspan="8" style="text-align: center; padding: 3rem; color: #64748b;">
                  <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <app-icon name="refresh" [size]="18" className="spin"></app-icon>
                    <span>جاري تحميل حسابات المستخدمين...</span>
                  </div>
                </td>
              </tr>
              <tr *ngFor="let u of users">
                <td style="font-weight: 700; color: #0f172a;">{{ u.full_name }}</td>
                <td style="font-family: monospace; font-size: 12px; color: #475569;">{{ u.username }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-danger': u.role === 'ADMIN',
                    'badge-info': u.role === 'OPERATOR',
                    'badge-secondary': u.role === 'REPORTER'
                  }" style="font-size: 11px;">
                    {{ u.role_display }}
                  </span>
                </td>
                <td style="color: #475569;">{{ u.email || '-' }}</td>
                <td style="font-family: monospace; font-size: 12px; color: #475569;">{{ u.phone || '-' }}</td>
                <td>{{ u.department || '-' }}</td>
                <td>
                  <span class="badge" [ngClass]="u.is_active ? 'badge-success' : 'badge-danger'" style="font-size: 11px;">
                    {{ u.is_active ? 'نشط' : 'معطل' }}
                  </span>
                </td>
                <td style="text-align: center;">
                  <button (click)="toggleUserActive(u)"
                          class="btn btn-outline btn-sm"
                          [style.color]="u.is_active ? '#e11d48' : '#059669'"
                          [style.borderColor]="u.is_active ? '#fecaca' : '#a7f3d0'"
                          style="font-size: 11.5px; padding: 3px 8px; border-radius: 6px;">
                    {{ u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: System Settings -->
      <div *ngIf="currentTab === 'SETTINGS'" class="card" style="padding: 1.5rem;">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="cog" [size]="18" style="color: #0284c7;"></app-icon>
            <span style="font-weight: 700; font-size: 14px; color: #0f172a;">عتبات تنبيهات الصيانة ومعايير النظام</span>
          </div>
          <span style="font-size: 12px; color: #64748b;">تنعكس التعديلات فورياً على محرك التنبيهات الميدانية</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div *ngFor="let s of settings"
               style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 260px;">
              <div style="font-weight: 700; color: #0f172a; font-size: 13.5px; margin-bottom: 3px;">{{ s.key }}</div>
              <div style="font-size: 12px; color: #64748b;">{{ s.description }}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="text" [(ngModel)]="s.value" class="form-control" style="width: 200px; font-weight: 600;" />
              <button (click)="updateSetting(s)" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px;">
                <app-icon name="check" [size]="14"></app-icon>
                <span>حفظ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Create User -->
      <div *ngIf="showUserModal" class="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="user" [size]="20" style="color: #0284c7;"></app-icon>
              <h3 style="font-weight: 700; font-size: 1.15rem; color: #0f172a; margin: 0;">
                إضافة مستخدم جديد للنظام
              </h3>
            </div>
            <button (click)="showUserModal = false" class="btn btn-outline btn-sm" style="padding: 4px 8px; border-radius: 6px;">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="saveUser()">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">اسم المستخدم (للدخول) *</label>
                <input type="text" [(ngModel)]="newUser.username" name="u_name" required class="form-control" placeholder="username" />
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">كلمة المرور *</label>
                <input type="password" [(ngModel)]="newUser.password" name="u_pass" required minlength="6" class="form-control" placeholder="6 أحرف أو أرقام على الأقل" />
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">الاسم الكامل *</label>
                <input type="text" [(ngModel)]="newUser.full_name" name="u_full" required class="form-control" placeholder="الاسم الرباعي الرسمي" />
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">الدور الوظيفي والصلاحية *</label>
                <select [(ngModel)]="newUser.role" name="u_role" required class="form-select">
                  <option value="ADMIN">مدير النظام (Admin) - صلاحيات كاملة</option>
                  <option value="OPERATOR">مسؤول التشغيل (Operator) - تشغيل ميداني ومركبات</option>
                  <option value="REPORTER">مراقب التقارير (Reporter) - قراءة وطباعة فقط</option>
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem;">
                <div class="form-group">
                  <label class="form-label">البريد الإلكتروني</label>
                  <input type="email" [(ngModel)]="newUser.email" name="u_email" class="form-control" placeholder="user@company.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">رقم الجوال</label>
                  <input type="text" [(ngModel)]="newUser.phone" name="u_phone" class="form-control" placeholder="05xxxxxxxx" />
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">القسم أو الإدارة التابع لها</label>
                <input type="text" [(ngModel)]="newUser.department" name="u_dept" class="form-control" placeholder="مثال: إدارة الحركة والتشغيل" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="showUserModal = false" class="btn btn-secondary">إلغاء</button>
              <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="check" [size]="16"></app-icon>
                <span>حفظ المستخدم وتفعيل الحساب</span>
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
export class SettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  currentTab: 'USERS' | 'SETTINGS' = 'USERS';
  users: User[] = [];
  settings: SystemSetting[] = [];
  loadingUsers = true;
  loadingSettings = true;

  showUserModal = false;
  newUser: any = {
    role: 'OPERATOR',
    is_active: true
  };

  ngOnInit(): void {
    this.loadUsers();
    this.loadSettings();
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.cdr.markForCheck();
    this.adminService.getUsers().subscribe({
      next: (res) => {
        this.users = res.results;
        this.loadingUsers = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل المستخدمين');
        this.loadingUsers = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadSettings(): void {
    this.loadingSettings = true;
    this.cdr.markForCheck();
    this.adminService.getSettings().subscribe({
      next: (res) => {
        this.settings = res.results;
        this.loadingSettings = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحميل الإعدادات');
        this.loadingSettings = false;
        this.cdr.markForCheck();
      }
    });
  }

  openCreateUserModal(): void {
    this.newUser = {
      role: 'OPERATOR',
      is_active: true
    };
    this.showUserModal = true;
  }

  saveUser(): void {
    this.adminService.createUser(this.newUser).subscribe({
      next: () => {
        this.toastService.success('تمت إضافة المستخدم بنجاح');
        this.showUserModal = false;
        this.loadUsers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.message || 'فشل حفظ المستخدم';
        this.toastService.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  toggleUserActive(user: User): void {
    const updatedStatus = !user.is_active;
    this.adminService.updateUser(user.id, { is_active: updatedStatus }).subscribe({
      next: () => {
        user.is_active = updatedStatus;
        this.toastService.success(`تم ${updatedStatus ? 'تفعيل' : 'تعطيل'} حساب المستخدم بنجاح`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تغيير حالة المستخدم');
        this.cdr.markForCheck();
      }
    });
  }

  updateSetting(s: SystemSetting): void {
    this.adminService.updateSetting(s.id, s.value).subscribe({
      next: () => {
        this.toastService.success(`تم حفظ الإعداد ${s.key} بنجاح`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('فشل تحديث الإعداد');
        this.cdr.markForCheck();
      }
    });
  }
}
