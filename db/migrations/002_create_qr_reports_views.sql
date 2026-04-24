-- 002_create_qr_reports_views.sql
-- Optional read-only views to simplify reporting queries.

CREATE OR REPLACE VIEW qr_logs_company_daily AS
SELECT
  DATE(generated_at) AS day,
  licence_key,
  licensee_name,
  COUNT(*) AS total_qr_generated,
  COUNT(DISTINCT gtin) AS unique_gtins
FROM qr_generation_logs
GROUP BY DATE(generated_at), licence_key, licensee_name;

CREATE OR REPLACE VIEW qr_logs_product_daily AS
SELECT
  DATE(generated_at) AS day,
  gtin,
  product_description,
  COUNT(*) AS total_qr_generated,
  COUNT(DISTINCT licence_key) AS unique_licences
FROM qr_generation_logs
GROUP BY DATE(generated_at), gtin, product_description;
