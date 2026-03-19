# Product Overview

## Purpose
GS1 Nicaragua internal tool to generate compliant product QR codes and manage GS1 link registry entries for GTINs. Provides two main workflows: (1) bulk QR creation for products already in GS1 Activate, and (2) CRUD operations on GS1 Digital Link records with batch feedback tracking.

## Core User Flows
- **Generador de Códigos QR** (`src/routes/generador-codigos-qr/+page.svelte`)
  - Upload Excel exported from GS1 Activate: GTINs in column B, descriptions (optional) in column F, starting row 3.
  - Validate/append manual GTINs via `/api/get-gtin` (GS1 Verified GTIN) and fallback description lookup via `/api/query-links`.
  - Configure domain (id.gs1.org or resolver-st.gs1.org) and QR module size (0.495–0.99 mm) with GS1 guidance toggle.
  - Generate per-GTIN SVG QR codes (with optional `(01) GTIN` text), zip them via JSZip, and download `codigos-qr.zip`.
- **Gestionar Enlaces** (`src/routes/manejo-enlaces/+page.svelte`)
  - Search a GTIN (`GtinSearch.svelte`) to validate existence and load current links (`/api/get-gtin` + `/api/query-links`).
  - View/delete existing non-default links (`LinksTable.svelte`) or delete all links for the GTIN (`/api/delete-link`).
  - Add/merge new links (`LinkEditor.svelte`), auto-creating a default link when missing, and submit updates to GS1 (`/api/update-link`).
  - Monitor batch processing codes from GS1 (`FeedbackStatus.svelte`) via `/api/feedback` polling.
- **Landing** (`src/routes/+page.svelte`): simple welcome/entry point with top-nav links to the two flows.

## Backend Integrations (SvelteKit endpoints)
- **GTIN verification**: POST `/api/get-gtin` → `https://grp.gs1.org/grp/v3.2/gtins/verified`.
- **Link query**: POST `/api/query-links` → `https://grp.gs1.org/grp/v3.2/links/01/<gtin>`; returns all links (default kept hidden in UI).
- **Link update**: POST `/api/update-link` → `https://grp.gs1.org/grp/v3.2/links`; sanitizes strings, validates absolute URLs, returns `batchId`.
- **Link delete**: POST `/api/delete-link` → same GS1 links endpoint with DELETE; supports per-link or delete-all payloads.
- **Batch feedback**: POST `/api/feedback` → `https://grp.gs1.org/grp/v3.2/feedback/<batchId>`; polled until terminal codes.

## Inputs and Outputs
- **Input file**: Excel `.xlsx/.xls`, GTINs column B, descriptions column F, from row 3.
- **Manual input**: GTIN text; validated against GS1, deduped before adding.
- **Generated assets**: SVG files per GTIN (with sanitized filenames), bundled into `codigos-qr.zip`.

## Configuration & Security
- Requires environment variable `API_KEY` (GS1 Group Registry) on the server for all GS1 API calls.
- HTTP Basic Auth enforced globally in `src/hooks.server.js` (credentials: `admin / password123`).
-- Node engine constraint: >=18 <25 (package.json).

## Key UI Assets
- Static metadata lists under `static/` (`countries.json`, `languages.json`, `gs1-linktypes.json`) to populate link editors.
- Custom button and table styling in `src/app.css`; Tailwind base/utilities imported globally via `src/routes/+layout.svelte`.

## Limitations / Notes
- No persistence beyond GS1 APIs; state is client-side until submitted.
- Link editor blocks restricted link types and requires absolute URLs; defaults to CURIE or full IRI representation to mirror existing data.
- QR generation targets GS1 quiet zone and module sizing; no PNG export—SVG only.
