import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToastComponent } from '../toast/toast.component';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, ToastComponent],
  template: `
    <div class="app-layout-root">
      <app-toast></app-toast>

      <!-- Mobile Backdrop Overlay -->
      <div 
        class="sidebar-backdrop" 
        *ngIf="ui.isSidebarOpen()" 
        (click)="ui.closeSidebar()"
      ></div>

      <!-- Sidebar (Desktop sticky / Mobile drawer) -->
      <app-sidebar></app-sidebar>

      <!-- Main Column: Fixed Topbar + Scrollable Content -->
      <div class="main-column">
        <app-navbar></app-navbar>

        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout-root {
      height: 100vh;
      width: 100vw;
      max-width: 100vw;
      display: flex;
      overflow: hidden;
      background: #f8fafc;
      position: relative;
    }
    .main-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100vh;
      overflow: hidden;
    }
    .main-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.75rem;
      background: #f8fafc;
      -webkit-overflow-scrolling: touch;
    }
    .sidebar-backdrop {
      display: none;
    }
    @media (max-width: 1024px) {
      .app-layout-root {
        overflow-x: hidden;
      }
      .main-column {
        width: 100%;
      }
      .main-content {
        padding: 1rem 0.85rem !important;
      }
      .sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(3px);
        z-index: 999;
        animation: fadeIn 0.2s ease;
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class LayoutComponent {
  ui = inject(UiService);
  private router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.ui.closeSidebar();
    });
  }
}
