# Proposed Phase 2 File Structure

- `index.html` — thin shell + auth gate + root containers.
- `src/main.js` — app bootstrap, tab/router wiring.
- `src/lib/state.js` — shared loaded state for calendar/agenda/templates.
- `src/lib/ac-client.js` — proxy-backed GET/POST/PUT/DELETE with retry/backoff.
- `src/lib/data-loader.js` — existing pipeline+stage+per-deal field loading logic.
- `src/lib/templates-store.js` — Netlify Blobs CRUD adapter.
- `src/lib/task-tags.js` — `[ipmi:tmpl=...:entry=...]` encode/parse helpers.
- `src/lib/sync-engine.js` — pure reconciliation planner.
- `src/views/calendar.js` — existing monthly calendar view.
- `src/views/agenda.js` — 6-week per-rep agenda.
- `src/views/templates-editor.js` — template list + editor + save/sync.
- `netlify/functions/ac-proxy.js` — extended methods GET/POST/PUT/DELETE.
- `netlify/functions/templates.js` — Netlify Blobs endpoints for templates.
- `tools/probe-ac.js` — AC endpoint probe script.
- `docs/ac-api-notes.md` — account-specific AC response notes.
