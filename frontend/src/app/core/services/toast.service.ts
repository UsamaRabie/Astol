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

  show(type: 'success' | 'warning' | 'danger' | 'info', title: string, message: string, durationMs = 5000): void {
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

  error(messageOrErr: any, title = 'حدث خطأ'): void {
    const message = this.extractErrorMessage(messageOrErr);
    this.show('danger', title, message, 7000);
  }

  info(message: string, title = 'معلومة'): void {
    this.show('info', title, message);
  }

  remove(id: string): void {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }

  extractErrorMessage(err: any): string {
    if (!err) return 'حدث خطأ أثناء تنفيذ العملية';
    if (typeof err === 'string') return err;

    const errorBody = err.error !== undefined ? err.error : err;
    if (typeof errorBody === 'string') return errorBody;

    if (errorBody && typeof errorBody === 'object') {
      if (errorBody.detail && typeof errorBody.detail === 'string') {
        return errorBody.detail;
      }
      if (errorBody.message && typeof errorBody.message === 'string') {
        return errorBody.message;
      }

      const fieldLabels: Record<string, string> = {
        vehicle: 'المركبة',
        driver: 'السائق',
        permit_number: 'رقم إذن التشغيل',
        departure_location: 'مكان الانطلاق',
        destination: 'الوجهة ومسار الرحلة',
        purpose: 'الغرض من الرحلة',
        departure_date: 'تاريخ الانطلاق',
        departure_time: 'وقت الانطلاق',
        return_date: 'تاريخ العودة',
        return_time: 'وقت العودة',
        starting_odometer: 'عداد البداية',
        ending_odometer: 'عداد العودة',
        maintenance_type: 'نوع الصيانة',
        odometer: 'قراءة العداد',
        cost: 'التكلفة الإجمالية',
        service_provider: 'مزود الخدمة',
        technician: 'اسم الفني',
        description: 'الوصف والتفاصيل',
        notes: 'الملاحظات',
        fuel_type: 'نوع الوقود',
        quantity: 'كمية الوقود',
        price_per_unit: 'سعر الوحدة',
        station: 'محطة الوقود',
        plate_number: 'رقم اللوحة',
        internal_fleet_number: 'الرقم الداخلي',
        status: 'الحالة التشغيلية',
        non_field_errors: 'تنبيه'
      };

      const messages: string[] = [];
      for (const [key, val] of Object.entries(errorBody)) {
        const label = fieldLabels[key] || key;
        if (Array.isArray(val)) {
          messages.push(`${label}: ${val.join('، ')}`);
        } else if (typeof val === 'string') {
          messages.push(`${label}: ${val}`);
        } else if (val && typeof val === 'object') {
          messages.push(`${label}: ${JSON.stringify(val)}`);
        }
      }

      if (messages.length > 0) {
        return messages.join(' | ');
      }
    }

    return err.message || 'حدث خطأ أثناء معالجة الطلب في الخادم';
  }
}
