# Change Log

## 2026-05-26 - Delete links from link management
- Files changed:
  - `src/routes/api/delete-link/+server.js`
  - `src/routes/manejo-enlaces/LinksTable.svelte`
  - `src/routes/manejo-enlaces/+page.svelte`
- Summary: Added a delete action to the link management results table so users can remove an existing GS1 link directly from the search results.
- Behavior:
  - Displays a trash icon button for each non-default link row.
  - Confirms before deleting a link.
  - Sends a server-side request to `DELETE https://grp.gs1.org/grp/v3.2/links` using the API key from `.env`.
  - Builds the delete payload from the selected search result, including `anchorRelative` and the link fields returned by the query API.
  - Removes the deleted link from the visible table after a successful API response.
  - Shows an inline error message if the delete request fails.
- Verification:
  - `npm run build` passes.
  - `npx eslint src/routes/api/delete-link/+server.js src/routes/manejo-enlaces/LinksTable.svelte src/routes/manejo-enlaces/+page.svelte` passes.
- Note:
  - `npm run lint` still hits the existing Prettier/Svelte formatter error: `getVisitorKeys is not a function`.

## 2026-01-07 — Upload validation added to QR generator
- Files changed:
  - `src/routes/generador-codigos-qr/+page.svelte`
- Summary: Added client-side validation to reject Excel uploads larger than 4 MB and to enforce basic MIME type / file extension checks before parsing with `xlsx`.
- Rationale: `xlsx` (SheetJS) has two high-severity advisories (Prototype Pollution and ReDoS) with no available patched version at the time of audit. Since uploads are limited to trusted users, this mitigates exposure by rejecting potentially large or malformed files that could trigger ReDoS or other parser issues.
- Behavior:
  - Rejects files > 4 MB with message: "Archivo demasiado grande (máx 4 MB)."
  - Rejects files whose `file.type` is not one of `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, or `application/octet-stream`, and whose filename does not end with `.xls`/`.xlsx`.
- Test steps:
  1. Run the dev server: `npm run dev`.
  2. Open the QR generator page and try uploading a file larger than 4 MB — it should be rejected client-side.
  3. Try uploading a non-Excel file (e.g., `.txt`) — it should be rejected client-side.
- Next steps:
  - Consider adding a parsing timeout (web worker) or moving parsing server-side into a sandbox for stronger protection.
  - Monitor SheetJS advisories and upgrade `xlsx` when a patched version is published.

## 2026-03-19 - Add MX Resolver
- qr.2dgs1ni.com. added
