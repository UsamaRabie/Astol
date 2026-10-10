import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top right, #1e293b, #0f172a); padding: 1.5rem;">
      <div class="card" style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; padding: 2.5rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); border: 1px solid #334155;">
        <!-- Logo & Title -->
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; width: 56px; height: 56px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.8rem; margin-bottom: 12px; box-shadow: 0 8px 16px rgba(2,132,199,0.35);">
            أ
          </div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.3px;">
            أسطول ERP
          </h1>
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            نظام إدارة الأساطيل والتشغيل والصيانة الميدانية
          </p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="login()" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div class="form-group">
            <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
              <app-icon name="user" [size]="14" style="color: #64748b;"></app-icon>
              <span>اسم المستخدم</span>
            </label>
            <input type="text"
                   [(ngModel)]="username"
                   name="username"
                   required
                   class="form-control"
                   placeholder="أدخل اسم المستخدم (مثال: admin)" />
          </div>

          <div class="form-group">
            <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
              <app-icon name="lock" [size]="14" style="color: #64748b;"></app-icon>
              <span>كلمة المرور</span>
            </label>
            <input type="password"
                   [(ngModel)]="password"
                   name="password"
                   required
                   class="form-control"
                   placeholder="••••••••" />
          </div>

          <button type="submit"
                  [disabled]="loading"
                  class="btn btn-primary"
                  style="padding: 0.8rem; border-radius: 10px; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 0.5rem;">
            <app-icon *ngIf="!loading" name="check" [size]="16"></app-icon>
            <app-icon *ngIf="loading" name="refresh" [size]="16" className="spin"></app-icon>
            <span *ngIf="!loading">تسجيل الدخول للمنظومة</span>
            <span *ngIf="loading">جاري التحقق من الهوية...</span>
          </button>
        </form>

        <!-- Quick Demo Accounts -->
        <div style="margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid #f1f5f9;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.75rem; text-align: center; letter-spacing: 0.5px;">
            حسابات تجريبية سريعة بنقرة واحدة
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
            <button type="button"
                    (click)="setCredentials('admin', 'Admin@123456')"
                    class="btn btn-secondary btn-sm"
                    style="font-size: 11px; padding: 8px 4px; display: flex; flex-direction: column; gap: 2px; text-align: center;">
              <span style="font-weight: 700; color: #0f172a;">مدير النظام</span>
              <span style="color: #94a3b8; font-size: 9.5px;">Admin</span>
            </button>
            <button type="button"
                    (click)="setCredentials('operator', 'Operator@123456')"
                    class="btn btn-secondary btn-sm"
                    style="font-size: 11px; padding: 8px 4px; display: flex; flex-direction: column; gap: 2px; text-align: center;">
              <span style="font-weight: 700; color: #0284c7;">مسؤول تشغيل</span>
              <span style="color: #94a3b8; font-size: 9.5px;">Operator</span>
            </button>
            <button type="button"
                    (click)="setCredentials('reporter', 'Reporter@123456')"
                    class="btn btn-secondary btn-sm"
                    style="font-size: 11px; padding: 8px 4px; display: flex; flex-direction: column; gap: 2px; text-align: center;">
              <span style="font-weight: 700; color: #64748b;">مراقب تقارير</span>
              <span style="color: #94a3b8; font-size: 9.5px;">Reporter</span>
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
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  username = 'admin';
  password = 'Admin@123456';
  loading = false;

  setCredentials(u: string, p: string): void {
    this.username = u;
    this.password = p;
  }

  login(): void {
    if (!this.username || !this.password) {
      this.toastService.warning('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    this.loading = true;
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        this.toastService.success(`مرحباً بك، ${res.user.full_name}`, 'تم تسجيل الدخول بنجاح');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.detail || err.error?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة';
        this.toastService.error(msg, 'فشل تسجيل الدخول');
      }
    });
  }
}
