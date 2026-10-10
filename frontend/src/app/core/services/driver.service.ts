import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Driver, DriverAssignment, PaginatedResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getDrivers(params?: any): Observable<PaginatedResponse<Driver>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<Driver>>(`${this.apiUrl}/drivers/`, { params: httpParams });
  }

  getDriver(id: number): Observable<Driver> {
    return this.http.get<Driver>(`${this.apiUrl}/drivers/${id}/`);
  }

  createDriver(driver: Partial<Driver>): Observable<Driver> {
    return this.http.post<Driver>(`${this.apiUrl}/drivers/`, driver);
  }

  updateDriver(id: number, driver: Partial<Driver>): Observable<Driver> {
    return this.http.put<Driver>(`${this.apiUrl}/drivers/${id}/`, driver);
  }

  deleteDriver(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/drivers/${id}/`);
  }

  assignVehicle(driverId: number, data: { vehicle_id: number; start_date?: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/drivers/${driverId}/assign-vehicle/`, data);
  }

  getDriverHistory(driverId: number): Observable<DriverAssignment[]> {
    return this.http.get<DriverAssignment[]>(`${this.apiUrl}/drivers/${driverId}/history/`);
  }
}
