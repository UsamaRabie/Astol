import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VehicleAlert, PaginatedResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getAlerts(params?: any): Observable<PaginatedResponse<VehicleAlert>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null) {
          httpParams = httpParams.set(k, params[k]);
        }
      });
    }
    return this.http.get<PaginatedResponse<VehicleAlert>>(`${this.apiUrl}/notifications/`, { params: httpParams });
  }

  markRead(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/notifications/${id}/mark-read/`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.post(`${this.apiUrl}/notifications/mark-all-read/`, {});
  }

  resolveAlert(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/notifications/${id}/resolve/`, {});
  }

  getUnreadCount(): Observable<{ unread_count: number; critical_count: number }> {
    return this.http.get<{ unread_count: number; critical_count: number }>(`${this.apiUrl}/notifications/unread-count/`);
  }
}
