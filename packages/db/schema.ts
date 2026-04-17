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

// --- Quotes ---

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: number | null;
  title: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  total: number;
  currency: string;
  status: QuoteStatus;
  validUntil: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Joined client name — populated by lib queries that JOIN clients */
  clientName?: string | null;
  /** Joined client email */
  clientEmail?: string | null;
}

// --- Maintenance ---

export type ProductType = 'dashboard' | 'web-app' | 'saas' | 'other';
export type MaintenanceLogType = 'incident' | 'preventive' | 'support';
export type WorkOrderStatus = 'pending' | 'approved' | 'in-progress' | 'completed' | 'invoiced';

export interface ServiceClient {
  id: string;
  name: string;
  productName: string;
  productType: ProductType;
  contactName: string;
  contactEmail: string;
  healthCheckUrl: string | null;
  apiUrl: string | null;
  apiKeyHash: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface MaintenanceLog {
  id: string;
  serviceClientId: string;
  logDate: string;
  type: MaintenanceLogType;
  area: string;
  summary: string;
  actionTaken: string;
  outcome: string;
  workOrderId: string | null;
  loggedBy: string;
  createdAt: Date;
}

export interface WorkOrder {
  id: string;
  serviceClientId: string;
  woNumber: string;
  title: string;
  description: string;
  scopeItems: string[];
  estimatedCost: number | null;
  currency: string;
  status: WorkOrderStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Health checks ---

export type HealthStatus = 'up' | 'down' | 'degraded';

export interface HealthCheckResult {
  id: string;
  serviceClientId: string;
  checkedAt: Date;
  status: HealthStatus;
  responseTimeMs: number | null;
  statusCode: number | null;
  errorMessage: string | null;
}

// --- ROI snapshots ---

export type ROISource = 'api_pull' | 'manual_entry';

export interface ROISnapshot {
  id: string;
  serviceClientId: string;
  snapshotDate: string;
  metricKey: string;
  metricValue: number;
  source: ROISource;
  notes: string | null;
  createdAt: Date;
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
