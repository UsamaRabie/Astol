import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkPermit, PaginatedResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class WorkPermitService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getPermits(params?: any): Observable<PaginatedResponse<WorkPermit>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          httpParams = httpParams.set(k, params[k]);
        }
      });
    }
    return this.http.get<PaginatedResponse<WorkPermit>>(`${this.apiUrl}/work-permits/`, { params: httpParams });
  }

  getPermit(id: number): Observable<WorkPermit> {
    return this.http.get<WorkPermit>(`${this.apiUrl}/work-permits/${id}/`);
  }

  createPermit(permit: Partial<WorkPermit>): Observable<WorkPermit> {
    return this.http.post<WorkPermit>(`${this.apiUrl}/work-permits/`, permit);
  }

  updatePermit(id: number, permit: Partial<WorkPermit>): Observable<WorkPermit> {
    return this.http.put<WorkPermit>(`${this.apiUrl}/work-permits/${id}/`, permit);
  }

  deletePermit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/work-permits/${id}/`);
  }

  approvePermit(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/work-permits/${id}/approve/`, {});
  }

  startTrip(id: number, data: { starting_odometer?: number; departure_time?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/work-permits/${id}/start-trip/`, data);
  }

  completeTrip(id: number, data: { ending_odometer: number; return_time?: string; return_date?: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/work-permits/${id}/complete-trip/`, data);
  }

  cancelPermit(id: number, data: { notes?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/work-permits/${id}/cancel/`, data);
  }
}
