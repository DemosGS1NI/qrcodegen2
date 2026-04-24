-- 001_create_qr_generation_logs.sql
-- Source-of-truth schema for QR generation audit events.

CREATE TABLE IF NOT EXISTS qr_generation_logs (
  id BIGSERIAL PRIMARY KEY,
  licensee_name TEXT NOT NULL,
  licence_key TEXT NOT NULL,
  gtin TEXT NOT NULL,
  product_description TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('Manual', 'File')),
  qr_domain TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_logs_generated_at
  ON qr_generation_logs (generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_logs_licence_key_generated_at
  ON qr_generation_logs (licence_key, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_logs_gtin_generated_at
  ON qr_generation_logs (gtin, generated_at DESC);
