-- 003_enforce_unique_product_qr_logs.sql
-- Keep one row per product QR key (licence_key + gtin + qr_domain).

DELETE FROM qr_generation_logs q
USING qr_generation_logs d
WHERE q.id < d.id
  AND q.licence_key = d.licence_key
  AND q.gtin = d.gtin
  AND q.qr_domain = d.qr_domain;

CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_logs_product_qr
  ON qr_generation_logs (licence_key, gtin, qr_domain);
