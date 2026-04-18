-- Link maintenance "service products" to the single invoicing client record
ALTER TABLE service_clients
  ADD COLUMN IF NOT EXISTS invoice_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS service_clients_invoice_client_id_idx ON service_clients(invoice_client_id);
