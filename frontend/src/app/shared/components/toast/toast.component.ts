import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div style="position: fixed; top: 1.5rem; left: 1.5rem; z-index: 9999; width: 340px; display: flex; flex-direction: column; gap: 8px; pointer-events: none;">
      <div *ngFor="let toast of toasts$ | async"
           style="pointer-events: auto; padding: 12px 14px; border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); border: 1px solid; display: flex; align-items: flex-start; gap: 10px; font-size: 13px;"
           [ngClass]="{
             'bg-emerald-50 border-emerald-300 text-emerald-950': toast.type === 'success',
             'bg-amber-50 border-amber-300 text-amber-950': toast.type === 'warning',
             'bg-rose-50 border-rose-300 text-rose-950': toast.type === 'danger',
             'bg-sky-50 border-sky-300 text-sky-950': toast.type === 'info'
           }">
        <div style="flex-shrink: 0; margin-top: 2px;">
          <app-icon *ngIf="toast.type === 'success'" name="check-circle" [size]="18" style="color: #059669;"></app-icon>
          <app-icon *ngIf="toast.type === 'warning'" name="alert-triangle" [size]="18" style="color: #d97706;"></app-icon>
          <app-icon *ngIf="toast.type === 'danger'" name="x-circle" [size]="18" style="color: #e11d48;"></app-icon>
          <app-icon *ngIf="toast.type === 'info'" name="info" [size]="18" style="color: #0284c7;"></app-icon>
        </div>

        <div style="flex: 1;">
          <div *ngIf="toast.title" style="font-weight: 700; margin-bottom: 2px;">{{ toast.title }}</div>
          <div style="font-size: 12px; opacity: 0.9; line-height: 1.4;">{{ toast.message }}</div>
        </div>

        <button (click)="remove(toast.id)"
                style="background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; padding: 2px;"
                title="إغلاق">
          <app-icon name="x" [size]="14"></app-icon>
        </button>
      </div>
    </div>
  `
})
export class ToastComponent {
  private toastService = inject(ToastService);
  toasts$ = this.toastService.toasts$;

  remove(id: string) {
    this.toastService.remove(id);
  }
}
