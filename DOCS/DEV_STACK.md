# Dev Stack

## Runtime & Tooling
-- Node.js **>=18 <25** (per `package.json engines`).
- Package scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint` (Prettier + ESLint), `npm run format`.
- Vite 6 + SvelteKit 2 (Svelte 5) scaffolded via `sv` CLI; includes adapters `adapter-auto` and `adapter-vercel`.

## Frontend
- SvelteKit routes:
  - `src/routes/generador-codigos-qr/+page.svelte` (QR generator UI).
  - `src/routes/manejo-enlaces/+page.svelte` with components `GtinSearch`, `LinksTable`, `LinkEditor`, `FeedbackStatus`.
  - Global layout/nav in `src/routes/+layout.svelte`; landing page in `src/routes/+page.svelte`.
- Styling: Tailwind CSS 3 with `@tailwindcss/forms`; custom button/table system in `src/app.css` imported globally.
- QR tooling: `qrcode-svg` for SVG generation, `jszip` for zipping downloads, `xlsx` for Excel parsing.

## Backend (Server Routes)
- SvelteKit endpoint handlers under `src/routes/api/` call GS1 Group Registry v3.2 APIs:
  - `get-gtin` (verify GTIN), `query-links` (fetch links), `update-link` (create/modify), `delete-link` (delete), `feedback` (batch status).
- Environment: requires `QRCODEGEN_API_KEY` (GS1 API key) available to server runtime.
- Security: HTTP Basic Auth middleware in `src/hooks.server.js` with credentials `admin / password123` (change for production).

## Data & Assets
- Static JSON vocabularies in `static/` (`countries.json`, `languages.json`, `gs1-linktypes.json`) feed select options in the link editor.
- `static/guidelines/` houses documentation assets used by `src/lib/Guidelines.svelte`.

## Development Notes
- Preferred flow: `npm install` → `npm run dev` for local; `npm run build` for production bundle.
- Linting/formatting via Prettier + ESLint (`npm run lint` or `npm run format`).
- Deployments can target Vercel (adapter present) or other environments via `adapter-auto`; ensure `QRCODEGEN_API_KEY` and updated Basic Auth credentials are set.
