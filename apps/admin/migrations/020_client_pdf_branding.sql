-- Per-client PDF branding overrides.
-- When set, pdf_header_name replaces the Zyntel logo in all document headers.
-- When set, pdf_footer_text replaces the default Zyntel footer line in all documents.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pdf_header_name TEXT,
  ADD COLUMN IF NOT EXISTS pdf_footer_text TEXT;
