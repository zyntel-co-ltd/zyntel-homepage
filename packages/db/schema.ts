export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'flutterwave' | 'cheque' | 'other';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type InvoiceType = 'one_off' | 'subscription' | 'consultation' | 'other';

export interface RecurringConfig {
  frequency: 'monthly' | 'quarterly' | 'yearly';
  next_run: string; // YYYY-MM-DD
  source_invoice_id?: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number | null;
  client_name: string;
  client_email?: string | null;
  client_phone: string | null;
  client_address: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: string;
  due_date: string | null;
  invoice_date?: string | null;
  invoice_type?: InvoiceType;
  recurring_config?: RecurringConfig | null;
  notes: string | null;
  payment_account_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface SavedItem {
  id: number;
  name: string;
  description: string;
  unit_price: number;
  default_quantity: number;
  created_at: string;
}

export interface PaymentRecord {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  created_at: string;
}

export interface PaymentAccount {
  id: number;
  name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_address: string | null;
  swift_code: string | null;
  instructions: string | null;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  /** All contact emails (primary is `email`, mirrors index 0 when set). */
  emails?: string[] | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface PreviewClient {
  id: string;
  clientId: string;
  name: string;
  email: string;
  projectType: 'website-design' | 'web-app' | 'marketplace' | 'other';
  clientFolder: string;
  presentationFile: string;
  token: string;
  status: 'active' | 'disabled';
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
  intake?: PreviewClientIntake | null;
  choiceOption?: string | null;
  choiceComments?: string | null;
  choiceSubmittedAt?: Date | null;
  choiceAnswers?: {
    q1?: string | null;
    q2?: string | null;
    q3?: string | null;
    recommended?: string | null;
  } | null;
  decisionAnswers?: {
    q1?: string | null;
    q2?: string | null;
    q3?: string | null;
    recommended?: string | null;
  } | null;
  decisionUpdatedAt?: Date | null;
  decisionSessionId?: string | null;
  stagingUrl?: string | null;
  stagingEnabled?: boolean | null;
  stagingSentAt?: Date | null;
  productionUrl?: string | null;
  productionEnabled?: boolean | null;
  productionSentAt?: Date | null;
}

export type MaintenanceStatus = 'active' | 'paused' | 'churned';

export interface MaintenanceClient {
  id: number;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  app_name: string;
  app_url: string | null;
  app_description: string | null;
  tech_stack: string | null;
  status: MaintenanceStatus;
  monthly_retainer: number;
  currency: string;
  start_date: string | null;
  original_dev_cost: number | null;
  client_id: number | null;
  metrics_api_url: string | null;
  metrics_api_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppMetric {
  id: number;
  maintenance_client_id: number;
  period: string; // YYYY-MM-DD (first of month)
  active_users: number | null;
  active_tenants: number | null;
  total_properties: number | null;
  total_landlords: number | null;
  payments_recorded: number | null;
  revenue_tracked: number | null;
  cumulative_revenue_tracked: number | null;
  hours_saved: number | null;
  hourly_value: number | null;
  zyntel_retainer_earned: number | null;
  custom: Record<string, unknown> | null;
  notes: string | null;
  recorded_by: string | null;
  auto_synced: boolean;
  created_at: string;
}

export interface PreviewClientIntake {
  industry: string;
  description: string;
  targetCustomers: string;
  tone: string[];
  coloursLike: string;
  coloursAvoid: string;
  competitors: string;
  mustHaveSections: string[];
  specialRequirements: string;
  deadline: string;
}
