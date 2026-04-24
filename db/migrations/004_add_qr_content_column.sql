-- 004_add_qr_content_column.sql
-- Store the exact string encoded into the QR as an independent column.

ALTER TABLE qr_generation_logs
ADD COLUMN IF NOT EXISTS qr_content TEXT;

UPDATE qr_generation_logs
SET qr_content = CONCAT(
  REGEXP_REPLACE(COALESCE(qr_domain, ''), '/+$', ''),
  '/01/',
  gtin
)
WHERE (qr_content IS NULL OR qr_content = '')
  AND gtin IS NOT NULL
  AND gtin <> '';

ALTER TABLE qr_generation_logs
ALTER COLUMN qr_content SET NOT NULL;
