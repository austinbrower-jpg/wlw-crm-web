# Verification

Verified on October 6, 2026 (America/Chicago), using the local production export as well as the development server.

| Check                       | Result                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| ESLint                      | Pass; zero warnings/errors                                                                |
| TypeScript                  | Pass                                                                                      |
| Formatting                  | Pass                                                                                      |
| Production build            | Pass; static `out/` generated                                                             |
| Unit tests                  | 44 passed                                                                                 |
| Playwright / Chromium       | 18 passed against the production preview                                                  |
| Automated accessibility     | No WCAG 2 A/AA or 2.1 AA axe violations on the six main screens and company record drawer |
| Production dependency audit | Zero reported vulnerabilities                                                             |

## Coverage

Unit tests exercise calculated metrics (including actual close periods and exclusions), relationships, required fields, impossible dates, stage undo, archive/restore, task completion, handoff deduplication, CSV quoting/mapping/validation/duplicates/atomic commit/formula protection, and versioned storage fallback.

Browser tests complete the company → contact → deal → follow-up journey, record a note and call, confirm activity history, drag and change stages, undo from the board/drawer/edit form, create a unique won handoff, reload persisted records, archive/restore relationships, complete/reopen tasks, select calendar dates, map/preview/commit imports, update duplicates, export filtered records, reject malformed imports, render imported markup as safe text, navigate commands with the keyboard, contain dialog focus, confirm/cancel reset, and handle corrupt/unavailable storage.

At **1440, 1024, 768, and 390 pixels**, tests capture Today, companies, contacts, deals, tasks, settings, and calendar screens. They assert no page-wide horizontal overflow and no browser runtime errors on those screens. At 390 pixels, tests also create a contact and task, save a native date input, and confirm that switching sections returns to the top.

Screenshots were visually inspected at every target width. The final captures include desktop/tablet layouts, mobile cards/navigation, the pipeline, calendar, record drawer, and contact/task forms. Canonical project images are `screenshots/showcase-today.png`, `screenshots/record-drawer-1440.png`, and `screenshots/showcase-mobile.png`.

## Limits and remaining issues

- Browser automation used Chromium. Physical-device testing, Firefox, Safari/WebKit, and a complete manual screen-reader audit were not performed. An automated accessibility pass does not establish complete accessibility compliance.
- The CRM intentionally uses fictional, browser-local data. It has no production authentication, team synchronization, server backup, or messaging. Concurrent tabs do not synchronize changes.
- Five high-severity transitive **development-tool** advisories remain in the Next.js lint tooling chain (`eslint-config-next` → `fast-glob` → `micromatch` → `braces`). No patched stable braces release was available in the checked registry. Production dependencies have no reported advisories. These tools are absent from the static deployment output.
- The static export is ready for hosting; no public deployment or portfolio-site publication was performed.

## Reproduce

```sh
npm ci
npm run lint
npm run typecheck
npm run check:format
npm test
npx playwright install chromium
npm run build
npm run preview
# In a second terminal:
npm run test:e2e
node scripts/capture-showcase.mjs
```

Playwright builds and starts its own production preview at `http://127.0.0.1:3307`. Set `RELAY_TEST_URL` to reuse an explicit standalone preview. The HTML report is generated in `playwright-report/`; traces/screenshots are retained for failures. Those generated directories are ignored by Git.

## Independent review — October 7, 2026

The initial 44 unit tests and 18 Chromium tests were independently rerun and passed.
The reviewed source passes 45 unit tests and 22 Chromium tests against its own rebuilt
production export. Lint, TypeScript and production build pass. Added regression coverage:

- Back/Forward to the initial URL returns to Today, closes unfinished dialogs, and preserves data.
- Trimmed, case-insensitive company/contact identities cannot bypass duplicate checks.
- Cancelled forms and draft notes do not leak into another record; empty searches render guidance.
- Returning from CSV review requires a fresh fictional-data confirmation; filtered exported
  formulas are apostrophe-prefixed text, and imported records survive reload.

The dependency audit independently confirms the same five development-only findings;
registry versions remain braces 3.0.3, micromatch 4.0.8 and eslint-config-next 16.4.0.
A framework downgrade would not be a safe fix. Production audit: zero advisories.

Mounted-route mobile accessibility review additionally found and fixed the icon-only search button losing its accessible name. The source accessibility suite now scans all main screens and the record drawer at both 390 and 1440 pixels.
