import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToastComponent } from '../toast/toast.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, ToastComponent],
  template: `
    <div class="app-layout-root" style="height: 100vh; width: 100vw; display: flex; overflow: hidden; background: #f8fafc;">
      <app-toast></app-toast>

      <!-- Fixed Full-Height Sidebar (Right side in RTL) -->
      <app-sidebar></app-sidebar>

      <!-- Main Column: Fixed Topbar + Scrollable Content -->
      <div style="flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100vh; overflow: hidden;">
        <app-navbar style="flex-shrink: 0;"></app-navbar>

        <main class="main-content" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1.75rem; background: #f8fafc;">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class LayoutComponent {}
