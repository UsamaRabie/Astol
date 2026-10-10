import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Vehicle, VehicleType, OdometerReading, VehicleDocument,
  VehiclePart, PartCatalog, PaginatedResponse
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FleetService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  // Vehicles
  getVehicles(params?: any): Observable<PaginatedResponse<Vehicle>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          httpParams = httpParams.set(k, params[k]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Vehicle>>(`${this.apiUrl}/vehicles/`, { params: httpParams });
  }

  getVehicle(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/vehicles/${id}/`);
  }

  createVehicle(vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.apiUrl}/vehicles/`, vehicle);
  }

  updateVehicle(id: number, vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.apiUrl}/vehicles/${id}/`, vehicle);
  }

  deleteVehicle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicles/${id}/`);
  }

  // Odometer
  getOdometerHistory(vehicleId: number): Observable<OdometerReading[]> {
    return this.http.get<OdometerReading[]>(`${this.apiUrl}/vehicles/${vehicleId}/odometer/`);
  }

  updateOdometer(vehicleId: number, data: { new_reading: number; source?: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/vehicles/${vehicleId}/odometer/`, data);
  }

  // Vehicle Sub-resources
  getVehicleParts(vehicleId: number): Observable<VehiclePart[]> {
    return this.http.get<VehiclePart[]>(`${this.apiUrl}/vehicles/${vehicleId}/parts/`);
  }

  getVehicleMaintenance(vehicleId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vehicles/${vehicleId}/maintenance/`);
  }

  getVehicleFuel(vehicleId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vehicles/${vehicleId}/fuel/`);
  }

  getVehicleDocuments(vehicleId: number): Observable<VehicleDocument[]> {
    return this.http.get<VehicleDocument[]>(`${this.apiUrl}/vehicles/${vehicleId}/documents/`);
  }

  evaluateVehicle(vehicleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/vehicles/${vehicleId}/evaluate/`, {});
  }

  // Vehicle Types
  getVehicleTypes(): Observable<PaginatedResponse<VehicleType>> {
    return this.http.get<PaginatedResponse<VehicleType>>(`${this.apiUrl}/vehicle-types/`);
  }

  // Parts Catalog & Installations
  getPartCatalog(params?: any): Observable<PaginatedResponse<PartCatalog>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<PartCatalog>>(`${this.apiUrl}/part-catalog/`, { params: httpParams });
  }

  createPartCatalog(part: Partial<PartCatalog>): Observable<PartCatalog> {
    return this.http.post<PartCatalog>(`${this.apiUrl}/part-catalog/`, part);
  }

  getVehiclePartsList(params?: any): Observable<PaginatedResponse<VehiclePart>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<VehiclePart>>(`${this.apiUrl}/vehicle-parts/`, { params: httpParams });
  }

  installPartOnVehicle(data: any): Observable<VehiclePart> {
    return this.http.post<VehiclePart>(`${this.apiUrl}/vehicle-parts/`, data);
  }

  replaceVehiclePart(vehiclePartId: number, data: { new_odometer: number; replacement_date?: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/vehicle-parts/${vehiclePartId}/replace/`, data);
  }
}
