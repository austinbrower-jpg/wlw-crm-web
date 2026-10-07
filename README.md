# Relay CRM

A functional, public CRM demo for small service businesses. Built as a standalone Wild Logic portfolio project: a quiet, practical sales workspace with an ink sidebar, warm canvas, cobalt accents, and connected workflows.

## Run locally

Requires Node.js 22 or later and npm. All application fonts are bundled locally.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. The first visit creates an independent fictional workspace in that browser.

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

`npm run build` creates the static site in `out/`. `npm run preview` serves it on port 3000; stop the development server before using the same port. Upload `out/` to a static host for a deployment preview. No database, API keys, or application server are required. This project has not been published to a live website.

## A short walkthrough

1. **Companies → New company.** Add a fictional company. In its drawer, use **Create linked contact**.
2. Create a contact with an `example.com` email. From its drawer, use **Create linked deal**. Give the deal a value and a follow-up due today. The task appears on **Today**.
3. Add a note or log a call in the deal drawer. Change its stage and review the activity timeline. The toast offers **Undo**.
4. Move the deal to **Won** and create its three-task handoff. Repeated stage changes keep one checklist, including already completed or archived handoff tasks.
5. Archive a record with confirmation. Find it through the **Archived records** filter or global search, then restore it. Relationships and notes survive.
6. Import fictional companies first, then contacts. Download a template, map columns, inspect validation and duplicate decisions, and explicitly commit the import.

Use **⌘K / Ctrl K** to search records or create a company, contact, deal, or task. Arrow keys and Enter operate the command palette; Escape closes dialogs. Record dialogs contain focus and restore it on close. Native date fields work on mobile, and calendar dates can be selected directly.

## Included

- Today: calculated metrics, due and overdue tasks, upcoming/completed views, pinned companies, recent activity.
- Companies and contacts: search, filters, sorting, inline industry/title editing, forms, connected record drawers.
- Deals: six-stage Kanban, drag-and-drop, stage selectors, table view, search, filters, sorting, undo, won handoffs.
- Tasks: list/calendar, due dates, priorities, filters, completion/reopening, and linked records.
- CSV: template, field mapping, full-file validation, duplicate skip/update, preview, and explicit commit. Export reflects current filters and safely escapes values and spreadsheet formulas.
- Confirmed archive/restore and reset, storage failure guidance, keyboard navigation, reduced-motion support, responsive cards/navigation.
- Stable first-launch seed: 12 fictional companies, 24 contacts, 18 deals, 20 tasks, and 36 activities. Dates are relative to the initial visit, then persist.

## Architecture

| Area                                                 | Responsibility                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/app`                                            | Next.js App Router entry, metadata, error boundary, design system and responsive CSS                         |
| `src/components/workspace.tsx`                       | Application shell, navigation, dialogs, notifications and action wiring                                      |
| `src/components/views`                               | Today, company/contact records, deals, tasks and shared task rows                                            |
| `src/components/forms.tsx`, `drawer.tsx`             | Validated forms, record details, relationships, notes and activity                                           |
| `src/components/command-palette.tsx`, `importer.tsx` | Global keyboard search and deliberate import workflow                                                        |
| `src/lib/domain.ts`                                  | Typed entities, validation schemas, relationship constraints, date/currency helpers and metrics              |
| `src/lib/repository.ts`                              | Pure immutable mutations, activity logging, archive, stages, undo, task completion and handoff deduplication |
| `src/lib/persistence.ts`                             | Replaceable `PersistenceAdapter`; versioned and validated localStorage implementation                        |
| `src/lib/store.ts`                                   | React external-store subscription, immediate persistence and temporary fallback                              |
| `src/lib/csv.ts`                                     | CSV parsing, mapping, validation, duplicate handling, safe export and atomic import                          |
| `src/lib/seed.ts`                                    | Fictional first-launch data                                                                                  |

Stack: Next.js, React, TypeScript, Tailwind CSS, Lucide, Zod, and locally bundled Geist. Runtime versions are pinned by `package-lock.json`. The app is client-side and statically exportable. React renders record/import content as text; no record data is interpreted as HTML.

## Metric definitions

All money is USD. No summary totals are hard-coded.

- **Open pipeline:** sum of active deal amounts, excluding Won/Lost and archived deals.
- **Weighted forecast:** open amount × stage probability. Lead 10%; Qualified 30%; Proposal 60%; Negotiation 80%.
- **Won value:** active Won deals whose actual close date is in the selected month, or all time. Moving to Won/Lost sets the actual close date; reopening clears it. Undo restores the previous stage and exact actual close date.
- **Follow-ups due:** active, incomplete tasks due today or earlier.

## Demo boundaries

This is a fictional browser-local demo, with independent data for each visitor and browser origin. It does not provide authentication, shared team data, production security, multi-tenant support, server persistence, analytics, or external messaging. Contact forms/imports require `example.com` emails. Use fictional data only.

localStorage writes are validated and synchronous. Unsupported/malformed saved workspaces load a temporary seed without overwriting the original; **Reset demo** explicitly replaces it. Unavailable/full storage keeps the app usable for the visit and displays a warning. Clearing browser data removes the workspace. Concurrent tabs are not synchronized; use one tab per demo session. No compatibility migration beyond the current version is claimed.

CSV limits are 2 MB / 1,000 data rows. Contact company names must match existing active companies. Duplicate company names and contact emails match case-insensitively. Updating a contact to a different company is blocked when that would break existing deals. The whole import succeeds or fails without partial commits. Preview displays the first 50 rows; validation includes every row.

Kanban uses native desktop drag-and-drop; stage selectors provide the touch and keyboard alternative. The board scrolls internally across six stages. No page-wide horizontal overflow is expected at 1440, 1024, 768, or 390 pixels.

## Verification and screenshots

See [TESTING.md](TESTING.md) for the final results and limitations. Screenshots for every screen at all four target widths are in `screenshots/`, plus calendar and mobile form captures. `screenshots/showcase-today.png`, `screenshots/record-drawer-1440.png`, and `screenshots/showcase-mobile.png` are viewport captures suitable for your project page. Use [PORTFOLIO.md](PORTFOLIO.md) for editable project copy.

The current dependency audit reports five transitive **development-tool-only** findings in the Next.js ESLint → fast-glob → micromatch → braces chain. The installed upstream braces release has no patched version. The production dependency audit is clean. Do not use dependency audit “force” fixes that downgrade the application framework; recheck upstream tooling before broader development use.

## Portfolio deployment

Build a namespaced export with `RELAY_BASE_PATH=/demos/relay npm run build`.
The prefix is compiled into the assets and favicon; rebuilding is required to change it.
Serve that build locally with `RELAY_BASE_PATH=/demos/relay PORT=3307 npm run preview`.
The website integration serves the exported HTML directly, outside its React layout,
authentication middleware, intake forms, and analytics. Storage remains isolated under
`relay-crm.workspace.v1`; the demo never reads or writes website cookies or storage keys.
Its static files and source commit are recorded in the website's hashed deployment manifest.
Update that distribution using the website's documented `relay:update` command from a clean,
committed CRM checkout. Never edit the website's generated demo files by hand.

Browser tests now build and start their own production export on port 3307; an explicit
`RELAY_TEST_URL` can target an already running standalone preview. This avoids accidentally
reusing a different app on port 3000.
