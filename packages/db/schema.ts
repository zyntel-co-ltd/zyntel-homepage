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
