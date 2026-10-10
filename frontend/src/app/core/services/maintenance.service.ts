import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MaintenanceType, MaintenanceRecord, PaginatedResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getTypes(params?: any): Observable<PaginatedResponse<MaintenanceType>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<MaintenanceType>>(`${this.apiUrl}/maintenance-types/`, { params: httpParams });
  }

  createType(type: Partial<MaintenanceType>): Observable<MaintenanceType> {
    return this.http.post<MaintenanceType>(`${this.apiUrl}/maintenance-types/`, type);
  }

  updateType(id: number, type: Partial<MaintenanceType>): Observable<MaintenanceType> {
    return this.http.put<MaintenanceType>(`${this.apiUrl}/maintenance-types/${id}/`, type);
  }

  deleteType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/maintenance-types/${id}/`);
  }

  getRecords(params?: any): Observable<PaginatedResponse<MaintenanceRecord>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<MaintenanceRecord>>(`${this.apiUrl}/maintenance-records/`, { params: httpParams });
  }

  getRecord(id: number): Observable<MaintenanceRecord> {
    return this.http.get<MaintenanceRecord>(`${this.apiUrl}/maintenance-records/${id}/`);
  }

  createRecord(record: any): Observable<MaintenanceRecord> {
    return this.http.post<MaintenanceRecord>(`${this.apiUrl}/maintenance-records/`, record);
  }

  updateRecord(id: number, record: any): Observable<MaintenanceRecord> {
    return this.http.put<MaintenanceRecord>(`${this.apiUrl}/maintenance-records/${id}/`, record);
  }

  deleteRecord(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/maintenance-records/${id}/`);
  }

  evaluateFleet(): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance-records/evaluate-fleet/`, {});
  }
}
