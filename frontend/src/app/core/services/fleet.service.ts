import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Vehicle, VehicleType, OdometerReading, VehicleDocument,
  VehiclePart, PartCatalog, VehicleModel, VehicleColor, Department,
  PaginatedResponse
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

  getNextFleetNumber(): Observable<{ next_fleet_number: string }> {
    return this.http.get<{ next_fleet_number: string }>(`${this.apiUrl}/vehicles/next-fleet-number/`);
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

  createVehicleType(type: Partial<VehicleType>): Observable<VehicleType> {
    return this.http.post<VehicleType>(`${this.apiUrl}/vehicle-types/`, type);
  }

  updateVehicleType(id: number, type: Partial<VehicleType>): Observable<VehicleType> {
    return this.http.put<VehicleType>(`${this.apiUrl}/vehicle-types/${id}/`, type);
  }

  deleteVehicleType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicle-types/${id}/`);
  }

  // Vehicle Models
  getVehicleModels(params?: any): Observable<PaginatedResponse<VehicleModel>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<VehicleModel>>(`${this.apiUrl}/vehicle-models/`, { params: httpParams });
  }

  createVehicleModel(model: Partial<VehicleModel>): Observable<VehicleModel> {
    return this.http.post<VehicleModel>(`${this.apiUrl}/vehicle-models/`, model);
  }

  updateVehicleModel(id: number, model: Partial<VehicleModel>): Observable<VehicleModel> {
    return this.http.put<VehicleModel>(`${this.apiUrl}/vehicle-models/${id}/`, model);
  }

  deleteVehicleModel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicle-models/${id}/`);
  }

  // Vehicle Colors
  getVehicleColors(params?: any): Observable<PaginatedResponse<VehicleColor>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<VehicleColor>>(`${this.apiUrl}/vehicle-colors/`, { params: httpParams });
  }

  createVehicleColor(color: Partial<VehicleColor>): Observable<VehicleColor> {
    return this.http.post<VehicleColor>(`${this.apiUrl}/vehicle-colors/`, color);
  }

  updateVehicleColor(id: number, color: Partial<VehicleColor>): Observable<VehicleColor> {
    return this.http.put<VehicleColor>(`${this.apiUrl}/vehicle-colors/${id}/`, color);
  }

  deleteVehicleColor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicle-colors/${id}/`);
  }

  // Departments
  getDepartments(params?: any): Observable<PaginatedResponse<Department>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k]) httpParams = httpParams.set(k, params[k]);
      });
    }
    return this.http.get<PaginatedResponse<Department>>(`${this.apiUrl}/departments/`, { params: httpParams });
  }

  createDepartment(dept: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.apiUrl}/departments/`, dept);
  }

  updateDepartment(id: number, dept: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/departments/${id}/`, dept);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departments/${id}/`);
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

  updatePartCatalog(id: number, part: Partial<PartCatalog>): Observable<PartCatalog> {
    return this.http.put<PartCatalog>(`${this.apiUrl}/part-catalog/${id}/`, part);
  }

  deletePartCatalog(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/part-catalog/${id}/`);
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
