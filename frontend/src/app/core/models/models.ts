// Core TypeScript Models for Astol Fleet Management System

export type UserRole = 'ADMIN' | 'OPERATOR' | 'REPORTER';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  role_display?: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  is_admin?: boolean;
  is_operator?: boolean;
  is_reporter?: boolean;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface VehicleType {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  vehicle_count?: number;
}

export interface VehicleModel {
  id: number;
  name: string;
  make?: string;
  description?: string;
  created_at?: string;
}

export interface VehicleColor {
  id: number;
  name: string;
  code?: string;
  created_at?: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface FuelType {
  id: number;
  name: string;
  price_per_liter: number | string;
  currency: string;
  description?: string;
  created_at?: string;
}

export interface Vehicle {
  id: number;
  internal_fleet_number: string;
  plate_number: string;
  vehicle_type: number;
  vehicle_type_name?: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
  engine_number?: string;
  current_odometer: number;
  fuel_type: string;
  fuel_type_display?: string;
  status: 'ACTIVE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED';
  status_display?: string;
  assigned_driver?: number | null;
  driver_name?: string;
  department?: string;
  purchase_date?: string;
  registration_expiry_date?: string;
  insurance_expiry_date?: string;
  periodic_inspection_expiry_date?: string;
  notes?: string;
  documents?: VehicleDocument[];
  recent_readings?: OdometerReading[];
}

export interface OdometerReading {
  id: number;
  vehicle: number;
  reading: number;
  date_time: string;
  source: 'MANUAL' | 'TRIP' | 'MAINTENANCE' | 'FUEL' | 'INITIAL';
  source_display?: string;
  user?: number;
  user_name?: string;
  notes?: string;
}

export interface VehicleDocument {
  id: number;
  vehicle: number;
  doc_type: string;
  doc_type_display?: string;
  document_number?: string;
  issue_date?: string;
  expiry_date: string;
  file?: string;
  notes?: string;
  is_expired?: boolean;
  days_until_expiry?: number;
}

export interface Driver {
  id: number;
  full_name: string;
  national_id: string;
  phone: string;
  license_number: string;
  license_expiry_date: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  status_display?: string;
  current_vehicle_id?: number | null;
  current_vehicle_plate?: string | null;
  current_vehicle_fleet?: string | null;
  notes?: string;
}

export interface DriverAssignment {
  id: number;
  driver: number;
  driver_name?: string;
  vehicle: number;
  vehicle_plate?: string;
  fleet_number?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  assigned_by_name?: string;
}

export type WorkPermitStatus = 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface WorkPermit {
  id: number;
  permit_number: string;
  vehicle: number;
  vehicle_plate?: string;
  fleet_number?: string;
  driver: number;
  driver_name?: string;
  driver_phone?: string;
  requesting_department: string;
  departure_location?: string;
  destination: string;
  purpose: string;
  description?: string;
  departure_date: string;
  departure_time?: string;
  return_date?: string;
  return_time?: string;
  starting_odometer?: number;
  ending_odometer?: number;
  distance_traveled: number;
  status: WorkPermitStatus;
  status_display?: string;
  created_by_name?: string;
  approved_by_name?: string;
  notes?: string;
  created_at?: string;
}

export interface PartCatalog {
  id: number;
  name: string;
  category: string;
  category_display?: string;
  default_interval_km: number;
  warning_threshold_km?: number;
  default_interval_days: number;
  unit: string;
  description?: string;
  usage_count?: number;
}

export interface VehiclePart {
  id: number;
  vehicle: number;
  vehicle_fleet?: string;
  vehicle_plate?: string;
  part: number;
  part_name?: string;
  part_category?: string;
  part_number?: string;
  brand?: string;
  installation_date: string;
  installation_odometer: number;
  interval_km: number;
  interval_days: number;
  next_replacement_km: number;
  next_replacement_date: string;
  current_status: 'OK' | 'UPCOMING' | 'DUE_SOON' | 'OVERDUE';
  status_display?: string;
  remaining_km?: number;
  remaining_days?: number;
  notes?: string;
}

export interface MaintenanceType {
  id: number;
  name: string;
  description?: string;
  is_periodic: boolean;
  recommended_km: number;
  recommended_days: number;
  record_count?: number;
}

export interface MaintenanceRecord {
  id: number;
  vehicle: number;
  vehicle_plate?: string;
  fleet_number?: string;
  maintenance_type: number;
  maintenance_type_name?: string;
  maintenance_date: string;
  odometer: number;
  description?: string;
  cost: string | number;
  service_provider?: string;
  technician?: string;
  notes?: string;
  status: string;
  status_display?: string;
  parts_replaced?: number[];
  parts_replaced_details?: { id: number; name: string }[];
  created_by_name?: string;
  created_at?: string;
}

export interface FuelRecord {
  id: number;
  vehicle: number;
  vehicle_plate?: string;
  fleet_number?: string;
  date: string;
  odometer: number;
  fuel_type: string;
  fuel_type_display?: string;
  quantity: string | number;
  price_per_unit: string | number;
  total_cost: string | number;
  station?: string;
  driver?: number;
  driver_name?: string;
  notes?: string;
  created_by_name?: string;
  created_at?: string;
}

export interface VehicleAlert {
  id: number;
  vehicle?: number;
  vehicle_plate?: string;
  fleet_number?: string;
  alert_type: string;
  alert_type_display?: string;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  severity_display?: string;
  title: string;
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_name?: string;
  user_role?: string;
  action: string;
  action_display?: string;
  module: string;
  object_repr: string;
  object_id: string;
  details: any;
  ip_address?: string;
  timestamp: string;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description?: string;
}

export interface DashboardData {
  kpis: {
    total_vehicles: number;
    active_vehicles: number;
    in_maintenance_vehicles: number;
    out_of_service_vehicles: number;
    active_trips: number;
    completed_trips: number;
    due_maintenance: number;
    upcoming_maintenance: number;
    overdue_maintenance: number;
    total_distance: number;
    total_maintenance_cost: number;
    total_fuel_cost: number;
    total_fuel_liters: number;
  };
  status_chart: { label: string; count: number; color: string }[];
  monthly_trends: {
    month: string;
    trips: number;
    distance: number;
    maintenance_cost: number;
    fuel_cost: number;
  }[];
  recent_permits: WorkPermit[];
  critical_alerts: VehicleAlert[];
}

export interface ReportData {
  report_type: string;
  title: string;
  generated_at: string;
  generated_by: string;
  filters_used: any;
  columns: { key: string; label: string }[];
  data: any[];
  summary: Record<string, any>;
}
