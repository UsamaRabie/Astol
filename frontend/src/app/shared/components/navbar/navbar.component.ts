import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { VehicleAlert } from '../../../core/models/models';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <header class="topbar no-print" style="background: #ffffff; border-bottom: 1px solid #e2e8f0; height: 68px; display: flex; align-items: center; justify-content: space-between; padding: 0 1.75rem; position: sticky; top: 0; z-index: 40; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <!-- Right Side (RTL Start): Context & Organization Indicator -->
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 8px; color: #475569; font-size: 13.5px; font-weight: 600;">
          <app-icon name="activity" [size]="16" style="color: #0284c7;"></app-icon>
          <span>بوابة العمليات والتشغيل المركزي</span>
          <span style="color: #cbd5e1;">/</span>
          <span style="color: #64748b; font-weight: 500; font-size: 12.5px;">المقر الرئيسي</span>
        </div>
      </div>

      <!-- Left Side (RTL End): Notifications, User Profile, Logout -->
      <div style="display: flex; align-items: center; gap: 1rem;">
        <!-- Notification Bell Dropdown -->
        <div style="position: relative;">
          <button (click)="toggleAlerts()"
                  class="btn-icon"
                  style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; display: flex; align-items: center; justify-content: center; color: #475569; cursor: pointer; position: relative; transition: all 0.15s ease;"
                  title="التنبيهات">
            <app-icon name="bell" [size]="18"></app-icon>
            <span *ngIf="unreadCount > 0"
                  style="position: absolute; top: 4px; left: 4px; width: 18px; height: 18px; border-radius: 9999px; background: #ef4444; color: #ffffff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff;">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </button>

          <!-- Dropdown Menu -->
          <div *ngIf="showAlertsDropdown"
               class="card"
               style="position: absolute; left: 0; top: 125%; width: 340px; z-index: 50; padding: 1rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 700; font-size: 14px; color: #0f172a;">التنبيهات النشطة</span>
                <span *ngIf="unreadCount > 0" class="badge badge-danger" style="font-size: 10.5px; padding: 1px 6px;">{{ unreadCount }} جديدة</span>
              </div>
              <a routerLink="/notifications" (click)="showAlertsDropdown = false" style="color: #0284c7; font-size: 12px; font-weight: 600; text-decoration: none;">
                عرض الكل
              </a>
            </div>

            <div *ngIf="recentAlerts.length === 0" style="text-align: center; padding: 1.5rem 0.5rem; color: #94a3b8;">
              <app-icon name="check-circle" [size]="28" style="color: #10b981; margin-bottom: 6px;"></app-icon>
              <div style="font-size: 12.5px; font-weight: 600; color: #475569;">لا توجد تنبيهات عاجلة</div>
              <div style="font-size: 11px; color: #94a3b8;">جميع المركبات والوثائق بحالة سليمة</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto;">
              <div *ngFor="let alert of recentAlerts"
                   style="border-radius: 8px; padding: 10px 12px; font-size: 12px; border: 1px solid;"
                   [ngClass]="{
                     'bg-rose-50 border-rose-200 text-rose-900': alert.severity === 'CRITICAL',
                     'bg-amber-50 border-amber-200 text-amber-900': alert.severity === 'WARNING',
                     'bg-slate-50 border-slate-200 text-slate-800': alert.severity === 'NORMAL'
                   }">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-weight: 700; font-size: 12.5px;">{{ alert.title }}</span>
                  <span style="font-size: 10px; opacity: 0.8;">{{ alert.created_at | date:'shortTime' }}</span>
                </div>
                <div style="font-size: 11.5px; line-height: 1.4; color: inherit; opacity: 0.9;">
                  {{ alert.message }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User Information & Role -->
        <div style="display: flex; align-items: center; gap: 12px; padding-right: 12px; border-right: 1px solid #e2e8f0;">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; letter-spacing: 0.5px;">
            {{ getUserInitials() }}
          </div>
          <div style="text-align: right; line-height: 1.2;">
            <div style="font-weight: 700; font-size: 13.5px; color: #0f172a;">{{ currentUser?.full_name }}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
              <span class="badge" [ngClass]="{
                'badge-danger': currentUser?.role === 'ADMIN',
                'badge-info': currentUser?.role === 'OPERATOR',
                'badge-secondary': currentUser?.role === 'REPORTER'
              }" style="font-size: 10px; padding: 1px 7px;">
                {{ getRoleArabic(currentUser?.role) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Logout Action -->
        <button (click)="logout()"
                class="btn btn-outline btn-sm"
                title="تسجيل الخروج من الحساب"
                style="display: flex; align-items: center; gap: 6px; border-radius: 8px; color: #ef4444; border-color: #fecaca; background: #fff5f5; font-size: 12.5px; padding: 6px 12px; cursor: pointer;">
          <app-icon name="log-out" [size]="15"></app-icon>
          <span>خروج</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .btn-icon:hover {
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }
  `]
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.authService.getCurrentUser();
  unreadCount = 0;
  recentAlerts: VehicleAlert[] = [];
  showAlertsDropdown = false;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      this.cdr.markForCheck();
    });
    this.loadAlertsCount();
  }

  loadAlertsCount(): void {
    this.alertService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount = res.unread_count;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
    this.alertService.getAlerts({ is_read: false }).subscribe({
      next: (res) => {
        this.recentAlerts = res.results.slice(0, 4);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  toggleAlerts(): void {
    this.showAlertsDropdown = !this.showAlertsDropdown;
    if (this.showAlertsDropdown) {
      this.loadAlertsCount();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    if (!this.currentUser?.full_name) return 'م';
    const parts = this.currentUser.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2);
    return `${parts[0].charAt(0)}.${parts[1].charAt(0)}`;
  }

  getRoleArabic(role?: string): string {
    if (role === 'ADMIN') return 'مدير النظام';
    if (role === 'OPERATOR') return 'مسؤول التشغيل';
    if (role === 'REPORTER') return 'مراقب التقارير';
    return role || '';
  }
}
