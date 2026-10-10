import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.class]="'lucide lucide-' + name + ' ' + className"
      style="display: inline-block; vertical-align: middle; flex-shrink: 0;"
    >
      <!-- Dashboard -->
      <ng-container *ngIf="name === 'dashboard' || name === 'layout-dashboard'">
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </ng-container>

      <!-- Truck / Vehicles -->
      <ng-container *ngIf="name === 'truck' || name === 'vehicle'">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
        <path d="M15 18H9"/>
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
        <circle cx="17" cy="18" r="2"/>
        <circle cx="7" cy="18" r="2"/>
      </ng-container>

      <!-- Clipboard List / Work Permits -->
      <ng-container *ngIf="name === 'clipboard-list' || name === 'permits'">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M12 11h4"/>
        <path d="M12 16h4"/>
        <path d="M8 11h.01"/>
        <path d="M8 16h.01"/>
      </ng-container>

      <!-- Wrench / Maintenance -->
      <ng-container *ngIf="name === 'wrench' || name === 'maintenance'">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </ng-container>

      <!-- Cog / Parts -->
      <ng-container *ngIf="name === 'cog' || name === 'settings' || name === 'parts'">
        <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/>
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
        <path d="M12 2v2"/>
        <path d="M12 20v2"/>
        <path d="m4.93 4.93 1.41 1.41"/>
        <path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/>
        <path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/>
        <path d="m19.07 4.93-1.41 1.41"/>
      </ng-container>

      <!-- Fuel -->
      <ng-container *ngIf="name === 'fuel'">
        <line x1="3" x2="15" y1="22" y2="22"/>
        <line x1="4" x2="14" y1="9" y2="9"/>
        <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/>
        <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
      </ng-container>

      <!-- Users / Drivers -->
      <ng-container *ngIf="name === 'users' || name === 'drivers'">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </ng-container>

      <!-- User / Single -->
      <ng-container *ngIf="name === 'user'">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </ng-container>

      <!-- File Text / Reports -->
      <ng-container *ngIf="name === 'file-text' || name === 'reports'">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
        <path d="M10 9H8"/>
        <path d="M16 13H8"/>
        <path d="M16 17H8"/>
      </ng-container>

      <!-- Bell / Notifications -->
      <ng-container *ngIf="name === 'bell' || name === 'notifications'">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </ng-container>

      <!-- Shield / Audit -->
      <ng-container *ngIf="name === 'shield' || name === 'shield-check' || name === 'audit'">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
        <path d="m9 12 2 2 4-4"/>
      </ng-container>

      <!-- Plus -->
      <ng-container *ngIf="name === 'plus'">
        <path d="M5 12h14"/>
        <path d="M12 5v14"/>
      </ng-container>

      <!-- Search -->
      <ng-container *ngIf="name === 'search'">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </ng-container>

      <!-- Refresh / Rotate -->
      <ng-container *ngIf="name === 'refresh' || name === 'refresh-cw'">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
      </ng-container>

      <!-- Calendar -->
      <ng-container *ngIf="name === 'calendar'">
        <path d="M8 2v4"/>
        <path d="M16 2v4"/>
        <rect width="18" height="18" x="3" y="4" rx="2"/>
        <path d="M3 10h18"/>
      </ng-container>

      <!-- Clock -->
      <ng-container *ngIf="name === 'clock'">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </ng-container>

      <!-- Gauge / Speedometer / Odometer -->
      <ng-container *ngIf="name === 'gauge' || name === 'odometer'">
        <path d="m12 14 4-4"/>
        <path d="M3.34 19a10 10 0 1 1 17.32 0"/>
      </ng-container>

      <!-- Map Pin / Destination -->
      <ng-container *ngIf="name === 'map-pin'">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
        <circle cx="12" cy="10" r="3"/>
      </ng-container>

      <!-- Check / Success -->
      <ng-container *ngIf="name === 'check'">
        <polyline points="20 6 9 17 4 12"/>
      </ng-container>

      <!-- Check Circle -->
      <ng-container *ngIf="name === 'check-circle'">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </ng-container>

      <!-- Alert Triangle / Warning -->
      <ng-container *ngIf="name === 'alert-triangle' || name === 'warning'">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
        <line x1="12" x2="12" y1="9" y2="13"/>
        <line x1="12" x2="12.01" y1="17" y2="17"/>
      </ng-container>

      <!-- Alert Circle / Info -->
      <ng-container *ngIf="name === 'info' || name === 'alert-circle'">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="8" y2="12"/>
        <line x1="12" x2="12.01" y1="16" y2="16"/>
      </ng-container>

      <!-- X / Close -->
      <ng-container *ngIf="name === 'x'">
        <line x1="18" x2="6" y1="6" y2="18"/>
        <line x1="6" x2="18" y1="6" y2="18"/>
      </ng-container>

      <!-- X Circle -->
      <ng-container *ngIf="name === 'x-circle'">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" x2="9" y1="9" y2="15"/>
        <line x1="9" x2="15" y1="9" y2="15"/>
      </ng-container>

      <!-- Eye / View / Details -->
      <ng-container *ngIf="name === 'eye'">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
        <circle cx="12" cy="12" r="3"/>
      </ng-container>

      <!-- Edit / Pencil -->
      <ng-container *ngIf="name === 'edit' || name === 'pencil'">
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
        <path d="m15 5 4 4"/>
      </ng-container>

      <!-- Trash -->
      <ng-container *ngIf="name === 'trash' || name === 'trash-2'">
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" x2="10" y1="11" y2="17"/>
        <line x1="14" x2="14" y1="11" y2="17"/>
      </ng-container>

      <!-- More Vertical -->
      <ng-container *ngIf="name === 'more-vertical'">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="12" cy="5" r="1"/>
        <circle cx="12" cy="19" r="1"/>
      </ng-container>

      <!-- More Horizontal -->
      <ng-container *ngIf="name === 'more-horizontal'">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="19" cy="12" r="1"/>
        <circle cx="5" cy="12" r="1"/>
      </ng-container>

      <!-- Printer -->
      <ng-container *ngIf="name === 'printer'">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect width="12" height="8" x="6" y="14"/>
      </ng-container>

      <!-- Download -->
      <ng-container *ngIf="name === 'download'">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" x2="12" y1="15" y2="3"/>
      </ng-container>

      <!-- Filter -->
      <ng-container *ngIf="name === 'filter'">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </ng-container>

      <!-- Log Out -->
      <ng-container *ngIf="name === 'log-out'">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" x2="9" y1="12" y2="12"/>
      </ng-container>

      <!-- Chevron Left (Next in RTL) -->
      <ng-container *ngIf="name === 'chevron-left'">
        <path d="m15 18-6-6 6-6"/>
      </ng-container>

      <!-- Chevron Right (Prev in RTL) -->
      <ng-container *ngIf="name === 'chevron-right'">
        <path d="m9 18 6-6-6-6"/>
      </ng-container>

      <!-- Chevron Down -->
      <ng-container *ngIf="name === 'chevron-down'">
        <path d="m6 9 6 6 6-6"/>
      </ng-container>

      <!-- Arrow Up Right (External / Details) -->
      <ng-container *ngIf="name === 'arrow-up-right'">
        <path d="M7 7h10v10"/>
        <path d="M7 17 17 7"/>
      </ng-container>

      <!-- Activity / Pulse -->
      <ng-container *ngIf="name === 'activity'">
        <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2"/>
      </ng-container>

      <!-- Bar Chart -->
      <ng-container *ngIf="name === 'bar-chart' || name === 'chart'">
        <line x1="12" x2="12" y1="20" y2="10"/>
        <line x1="18" x2="18" y1="20" y2="4"/>
        <line x1="6" x2="6" y1="20" y2="16"/>
      </ng-container>

      <!-- Lock -->
      <ng-container *ngIf="name === 'lock'">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </ng-container>

      <!-- Key -->
      <ng-container *ngIf="name === 'key'">
        <path d="m21 2-2 2m-1.5 1.5L14 9l2 2m-2-2-4 4-2-2-5 5a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l5-5-2-2 4-4 2 2Z"/>
      </ng-container>
    </svg>
  `
})
export class IconComponent {
  @Input() name: string = 'info';
  @Input() size: number = 18;
  @Input() strokeWidth: number = 1.75;
  @Input() className: string = '';
}
