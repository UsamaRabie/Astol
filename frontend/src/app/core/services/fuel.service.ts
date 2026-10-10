import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FuelRecord, PaginatedResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FuelService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getRecords(params?: any): Observable<PaginatedResponse<FuelRecord>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<FuelRecord>>(`${this.apiUrl}/fuel-records/`, { params: httpParams });
  }

  createRecord(record: any): Observable<FuelRecord> {
    return this.http.post<FuelRecord>(`${this.apiUrl}/fuel-records/`, record);
  }

  deleteRecord(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/fuel-records/${id}/`);
  }

  getSummary(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get(`${this.apiUrl}/fuel-records/summary/`, { params: httpParams });
  }
}
