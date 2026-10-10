import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, AuditLog, SystemSetting, PaginatedResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  // Users
  getUsers(params?: any): Observable<PaginatedResponse<User>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users/`, { params: httpParams });
  }

  createUser(user: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/`, user);
  }

  updateUser(id: number, user: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}/`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}/`);
  }

  // Audit Logs
  getAuditLogs(params?: any): Observable<PaginatedResponse<AuditLog>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<AuditLog>>(`${this.apiUrl}/audit-logs/`, { params: httpParams });
  }

  // Settings
  getSettings(): Observable<PaginatedResponse<SystemSetting>> {
    return this.http.get<PaginatedResponse<SystemSetting>>(`${this.apiUrl}/settings/`);
  }

  updateSetting(id: number, value: string): Observable<SystemSetting> {
    return this.http.patch<SystemSetting>(`${this.apiUrl}/settings/${id}/`, { value });
  }
}
