# QR Code Generator (GS1 Nicaragua)

SvelteKit app for:

1. Generating QR SVG files from GTIN lists.
2. Querying GS1 links by GTIN (read-only flow).
3. Logging QR generation events for reporting.

## Development

Install and run locally:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment

Required server environment variable:

1. QRCODEGEN_API_KEY: GS1 API key used by server endpoints.

Recommended local workflow with Vercel:

```bash
npx vercel env pull .env.local
```

Because sensitive values may not be pulled, keep a local-only secret copy in `.env.development.local`:

```dotenv
QRCODEGEN_API_KEY=your_gs1_api_key_here
```

`.env.development.local` is git-ignored and will not be overwritten by `vercel env pull .env.local`.

## Database Migrations (Plain SQL)

Schema changes are managed in-repo with plain SQL files under db/migrations.

Apply them in order using your Neon DATABASE_URL:

```bash
psql "$DATABASE_URL" -f db/migrations/001_create_qr_generation_logs.sql
psql "$DATABASE_URL" -f db/migrations/002_create_qr_reports_views.sql
```

Detailed migration guidelines are in DOCS/DB_MIGRATIONS.md.
