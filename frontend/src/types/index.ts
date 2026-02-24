// Shared types between frontend and backend
export interface AuthResponse {
  token: string;
  user: User;
}

export interface FilterParams {
  startDate?: string;
  endDate?: string;
  period?: string;
  labSection?: string;
  shift?: string;
  hospitalUnit?: string;
  laboratory?: string;
  status?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'manager' | 'technician' | 'viewer';
  is_active: boolean;
}

export interface TestMetadata {
  id: number;
  test_name: string;
  current_price: number;
  current_tat: number;
  current_lab_section: string;
  is_default: boolean;
}

export interface TestRecord {
  id: number;
  encounter_date: string;
  lab_no: string;
  test_name: string;
  price_at_test: number;
  tat_at_test: number;
  lab_section_at_test: string;
}