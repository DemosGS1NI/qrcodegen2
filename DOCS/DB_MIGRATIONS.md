# Database Migrations (Plain SQL)

This project uses plain SQL files as the source of truth for schema changes.
No ORM migration tool is required.

## Automatic Apply

Migrations are applied automatically through the Neon driver on first DB access.
The runtime creates and uses a `schema_migrations` table to track applied files.

Execution behavior:

1. Read `db/migrations/*.sql` in lexical order.
2. Skip files already recorded in `schema_migrations`.
3. Validate checksum for already applied files (fails if a file was modified).
4. Apply only pending files.

## Folder Structure

- db/migrations/001_create_qr_generation_logs.sql
- db/migrations/002_create_qr_reports_views.sql
- db/migrations/003_enforce_unique_product_qr_logs.sql
- db/migrations/004_add_qr_content_column.sql

## Rules

1. Never edit a migration that was already applied in shared environments.
2. Add a new file for every schema change.
3. Keep numeric ordering: 001, 002, 003, ...
4. Prefer idempotent SQL when possible (IF NOT EXISTS, CREATE OR REPLACE VIEW).

## Apply Migrations Manually (Optional)

If needed, you can still apply SQL files manually with your own tooling.
Automatic runtime migration is the default workflow for this project.

## Rollback Strategy

Create a forward-fix migration instead of editing history. Example:

- 003_alter_qr_generation_logs_add_column.sql
- 004_backfill_new_column.sql

## Current Reporting Views

1. qr_logs_company_daily: daily totals and unique GTINs by company/licence.
2. qr_logs_product_daily: daily totals and unique licences by GTIN/product.

## De-duplication Rule

QR generation logs are unique by `(licence_key, gtin, qr_domain)`.
If the same product QR is generated multiple times, only one row is kept.

## QR Content Column

`qr_generation_logs.qr_content` stores the exact string encoded in the QR.
Format: `<domain-without-trailing-slash>/01/<gtin>`.
