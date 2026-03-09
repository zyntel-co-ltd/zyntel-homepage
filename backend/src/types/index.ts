export interface User {
  id: number;
  username: string;
  email?: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'technician' | 'viewer';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface TestMetadata {
  id: number;
  test_name: string;
  current_price: number;
  current_tat: number;
  current_lab_section: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TestRecord {
  id: number;
  encounter_date: Date;
  invoice_no: string;
  lab_no: string;
  source: string;
  test_name: string;
  test_metadata_id?: number;
  price_at_test: number;
  tat_at_test: number;
  lab_section_at_test: string;
  is_urgent: boolean;
  is_received: boolean;
  is_resulted: boolean;
  is_cancelled: boolean;
  cancellation_reason?: string;
  cancelled_at?: Date;
  cancelled_by?: number;
  time_in: Date;
  time_out?: Date;
  actual_tat?: number;
  shift: string;
  laboratory: string;
  created_at: Date;
  updated_at: Date;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  month?: number;
  year?: number;
  updated_at: Date;
  updated_by?: number;
}

export interface UnmatchedTest {
  id: number;
  test_name: string;
  source: string;
  first_seen: Date;
  occurrence_count: number;
  last_seen: Date;
  is_resolved: boolean;
  resolved_at?: Date;
  resolved_by?: number;
}

export interface TimeoutRecord {
  id: number;
  file_name: string;
  creation_time: Date;
  imported_at: Date;
}

export interface TestCancellation {
  id: number;
  test_record_id: number;
  reason: string;
  refund_amount: number;
  cancelled_by: number;
  cancelled_at: Date;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export interface FilterParams {
  startDate?: string;
  endDate?: string;
  period?: string;
  labSection?: string;
  shift?: string;
  laboratory?: string;
  testName?: string;
}

export interface RevenueData {
  totalRevenue: number;
  targetRevenue: number;
  targetTooltip?: string;
  percentage: number;
  avgDailyRevenue: number;
  revenueGrowthRate: number;
  dailyRevenue: { date: string; revenue: number }[];
  sectionRevenue: { section: string; revenue: number }[];
  testRevenue: { test_name: string; revenue: number }[];
  hospitalUnitRevenue: { unit: string; revenue: number }[];
}