import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../icon/icon.component';

interface NavSection {
  title: string;
  items: {
    path: string;
    title: string;
    icon: string;
    adminOnly?: boolean;
  }[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <aside class="sidebar no-print" style="width: 260px; height: 100vh; max-height: 100vh; flex-shrink: 0; background: #0f172a; color: #f8fafc; border-left: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden;">
      <!-- Brand Header (Fixed Top) -->
      <div style="height: 68px; flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 0 1.25rem; border-bottom: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.25rem; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);">
          أ
        </div>
        <div style="line-height: 1.2;">
          <span style="font-weight: 800; font-size: 1.15rem; color: #ffffff; letter-spacing: -0.3px;">أسطول</span>
          <span style="font-size: 0.7rem; color: #94a3b8; display: block; font-weight: 500;">إدارة الأساطيل والصيانة</span>
        </div>
      </div>

      <!-- Navigation Sections (Scrollable if viewport is short) -->
      <div class="sidebar-scroll" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1rem 0.75rem; display: flex; flex-direction: column; gap: 1.25rem;">
        <div *ngFor="let section of navSections">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; padding: 0 12px; margin-bottom: 6px; letter-spacing: 0.5px;">
            {{ section.title }}
          </div>
          <nav style="display: flex; flex-direction: column; gap: 2px;">
            <ng-container *ngFor="let item of section.items">
              <a *ngIf="!item.adminOnly || isAdmin"
                 [routerLink]="item.path"
                 routerLinkActive="active-nav-item"
                 class="sidebar-nav-link"
                 style="display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 8px; color: #94a3b8; font-weight: 600; font-size: 13.5px; text-decoration: none; transition: all 0.15s ease;">
                <app-icon [name]="item.icon" [size]="18" style="color: inherit;"></app-icon>
                <span>{{ item.title }}</span>
              </a>
            </ng-container>
          </nav>
        </div>
      </div>

      <!-- Footer Info (Fixed Bottom) -->
      <div style="padding: 1rem; flex-shrink: 0; border-top: 1px solid #1e293b; background: rgba(15, 23, 42, 0.85);">
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: #94a3b8; margin-bottom: 6px;">
          <span style="font-weight: 600; color: #e2e8f0;">أسطول ERP v1.0</span>
          <span style="display: inline-flex; align-items: center; gap: 5px; color: #10b981; font-weight: 600; font-size: 10.5px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
            متصل
          </span>
        </div>
        <div style="font-size: 10.5px; color: #64748b; line-height: 1.4;">
          نظام مؤسسي موحد لإدارة المركبات، الصيانة الوقائية والرحلات التشغيلية
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar-nav-link:hover {
      background-color: #1e293b;
      color: #ffffff !important;
    }
    .active-nav-item {
      background: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
    }
    .sidebar-scroll::-webkit-scrollbar {
      width: 5px;
    }
    .sidebar-scroll::-webkit-scrollbar-track {
      background: #0f172a;
    }
    .sidebar-scroll::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 9999px;
    }
    .sidebar-scroll::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }
  `]
})
export class SidebarComponent {
  private authService = inject(AuthService);

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  navSections: NavSection[] = [
    {
      title: 'الرئيسية',
      items: [
        { path: '/dashboard', title: 'لوحة التحكم', icon: 'layout-dashboard' }
      ]
    },
    {
      title: 'العمليات والأسطول',
      items: [
        { path: '/vehicles', title: 'أسطول المركبات', icon: 'truck' },
        { path: '/work-permits', title: 'أذونات التشغيل والرحلات', icon: 'clipboard-list' },
        { path: '/drivers', title: 'السائقون وحركات الإسناد', icon: 'users' }
      ]
    },
    {
      title: 'الصيانة والتشغيل',
      items: [
        { path: '/maintenance', title: 'الصيانة وجداول الفحص', icon: 'wrench' },
        { path: '/parts', title: 'قطع الغيار والكتالوج', icon: 'cog' },
        { path: '/fuel', title: 'سجلات واستهلاك الوقود', icon: 'fuel' }
      ]
    },
    {
      title: 'التقارير والمتابعة',
      items: [
        { path: '/reports', title: 'مركز التقارير والطباعة', icon: 'file-text' },
        { path: '/notifications', title: 'مركز التنبيهات', icon: 'bell' }
      ]
    },
    {
      title: 'النظام والرقابة',
      items: [
        { path: '/lookups', title: 'إدارة القوائم والخيارات', icon: 'list', adminOnly: true },
        { path: '/audit-logs', title: 'سجل التدقيق والعمليات', icon: 'shield-check', adminOnly: true },
        { path: '/settings', title: 'المستخدمون والإعدادات', icon: 'cog', adminOnly: true }
      ]
    }
  ];
}
