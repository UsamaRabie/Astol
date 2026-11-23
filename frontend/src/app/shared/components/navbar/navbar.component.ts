import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { UiService } from '../../../core/services/ui.service';
import { VehicleAlert } from '../../../core/models/models';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <header class="topbar no-print">
      <!-- Right Side (RTL Start): Hamburger + Mobile Brand + Desktop Context Indicator -->
      <div style="display: flex; align-items: center; gap: 0.65rem;">
        <!-- Mobile Menu Toggle Button -->
        <button (click)="ui.toggleSidebar()"
                class="mobile-menu-btn"
                title="القائمة الرئيسية"
                aria-label="تبديل القائمة">
          <app-icon [name]="ui.isSidebarOpen() ? 'x' : 'menu'" [size]="20"></app-icon>
        </button>

        <!-- Brand Icon / Name on Mobile -->
        <div class="mobile-brand">
          <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.05rem;">
            أ
          </div>
          <span style="font-weight: 800; font-size: 1.1rem; color: #0f172a;">أسطول</span>
        </div>

        <!-- Desktop Context Indicator -->
        <div class="desktop-breadcrumb" style="display: flex; align-items: center; gap: 8px; color: #475569; font-size: 13.5px; font-weight: 600;">
          <app-icon name="activity" [size]="16" style="color: #0284c7;"></app-icon>
          <span>بوابة العمليات والتشغيل</span>
          <span class="desktop-only" style="color: #cbd5e1;">/</span>
          <span class="desktop-only" style="color: #64748b; font-weight: 500; font-size: 12.5px;">المقر الرئيسي</span>
        </div>
      </div>

      <!-- Left Side (RTL End): Notifications, User Profile, Logout -->
      <div style="display: flex; align-items: center; gap: 0.65rem;">
        <!-- Notification Bell Dropdown -->
        <div style="position: relative;">
          <button (click)="toggleAlerts()"
                  class="btn-icon"
                  style="width: 38px; height: 38px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; display: flex; align-items: center; justify-content: center; color: #475569; cursor: pointer; position: relative; transition: all 0.15s ease;"
                  title="التنبيهات">
            <app-icon name="bell" [size]="18"></app-icon>
            <span *ngIf="unreadCount > 0"
                  style="position: absolute; top: 3px; left: 3px; width: 17px; height: 17px; border-radius: 9999px; background: #ef4444; color: #ffffff; font-size: 9.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff;">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </button>

          <!-- Dropdown Menu -->
          <div *ngIf="showAlertsDropdown"
               class="card alerts-dropdown"
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
        <div class="user-profile-widget" style="display: flex; align-items: center; gap: 10px; padding-right: 10px; border-right: 1px solid #e2e8f0;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12.5px; letter-spacing: 0.5px; flex-shrink: 0;">
            {{ getUserInitials() }}
          </div>
          <div class="user-text desktop-only" style="text-align: right; line-height: 1.2;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">{{ currentUser?.full_name }}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
              <span class="badge" [ngClass]="{
                'badge-danger': currentUser?.role === 'ADMIN',
                'badge-info': currentUser?.role === 'OPERATOR',
                'badge-secondary': currentUser?.role === 'REPORTER'
              }" style="font-size: 9.5px; padding: 1px 6px;">
                {{ getRoleArabic(currentUser?.role) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Logout Action -->
        <button (click)="logout()"
                class="btn btn-outline btn-sm logout-btn"
                title="تسجيل الخروج من الحساب"
                style="display: flex; align-items: center; gap: 4px; border-radius: 8px; color: #ef4444; border-color: #fecaca; background: #fff5f5; font-size: 12px; padding: 5px 10px; cursor: pointer;">
          <app-icon name="log-out" [size]="14"></app-icon>
          <span class="desktop-only">خروج</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.75rem;
      position: sticky;
      top: 0;
      z-index: 40;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .mobile-menu-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #0f172a;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mobile-brand {
      display: none;
    }
    @media (max-width: 1024px) {
      .topbar {
        height: 60px;
        padding: 0 1rem;
      }
      .mobile-menu-btn {
        display: flex;
      }
      .mobile-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .desktop-breadcrumb {
        display: none !important;
      }
    }
    @media (max-width: 640px) {
      .desktop-only {
        display: none !important;
      }
      .alerts-dropdown {
        position: fixed !important;
        top: 64px !important;
        left: 12px !important;
        right: 12px !important;
        width: auto !important;
        max-width: none !important;
        z-index: 1050 !important;
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  ui = inject(UiService);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private cd = inject(ChangeDetectorRef);

  currentUser = this.authService.getCurrentUser();
  recentAlerts: VehicleAlert[] = [];
  unreadCount: number = 0;
  showAlertsDropdown: boolean = false;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.cd.markForCheck();
    });

    this.alertService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount = res?.unread_count || 0;
        this.cd.markForCheck();
      },
      error: () => {}
    });

    this.loadAlerts();
  }

  loadAlerts(): void {
    this.alertService.getAlerts({ is_read: false }).subscribe({
      next: (res) => {
        this.recentAlerts = (res.results || []).slice(0, 5);
        this.cd.markForCheck();
      },
      error: () => {}
    });
  }

  toggleAlerts(): void {
    this.showAlertsDropdown = !this.showAlertsDropdown;
    if (this.showAlertsDropdown) {
      this.loadAlerts();
    }
  }

  getUserInitials(): string {
    if (!this.currentUser || !this.currentUser.full_name) return 'م';
    const parts = this.currentUser.full_name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return parts[0][0];
  }

  getRoleArabic(role?: string): string {
    switch (role) {
      case 'ADMIN': return 'مدير النظام';
      case 'OPERATOR': return 'مسؤول تشغيل';
      case 'REPORTER': return 'مراقب تقارير';
      default: return 'مستخدم';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
