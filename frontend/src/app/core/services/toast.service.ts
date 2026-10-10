import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  show(type: 'success' | 'warning' | 'danger' | 'info', title: string, message: string, durationMs = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, title, message };
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, newToast]);

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  success(message: string, title = 'نجاح العملية'): void {
    this.show('success', title, message);
  }

  warning(message: string, title = 'تنبيه مهم'): void {
    this.show('warning', title, message);
  }

  error(message: string, title = 'حدث خطأ'): void {
    this.show('danger', title, message, 6000);
  }

  info(message: string, title = 'معلومة'): void {
    this.show('info', title, message);
  }

  remove(id: string): void {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }
}
