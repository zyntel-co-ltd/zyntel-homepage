-- Adds Figma gated link support + mockup pack storage pointers.
-- Idempotent migration (safe to run multiple times).

ALTER TABLE preview_clients
  ADD COLUMN IF NOT EXISTS figma_url TEXT,
  ADD COLUMN IF NOT EXISTS figma_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS figma_sent_at TIMESTAMPTZ;

-- Store mockups outside Git as uploaded packs (R2).
CREATE TABLE IF NOT EXISTS preview_mockup_packs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_client_id UUID NOT NULL REFERENCES preview_clients(id) ON DELETE CASCADE,
  r2_prefix         TEXT NOT NULL,
  entry_path        TEXT NOT NULL DEFAULT 'presentation.html',
  original_filename TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS preview_mockup_packs_client_id_idx ON preview_mockup_packs(preview_client_id);
CREATE INDEX IF NOT EXISTS preview_mockup_packs_created_at_idx ON preview_mockup_packs(created_at);

ALTER TABLE preview_clients
  ADD COLUMN IF NOT EXISTS active_mockup_pack_id UUID REFERENCES preview_mockup_packs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS preview_clients_active_mockup_pack_id_idx ON preview_clients(active_mockup_pack_id);

