# Zalma RC5 — integration and QA report

Date: 2026-10-11
Package: `2.8.0-rc.5`
Build fingerprint: `3c8a77fe603e71c2`

## Delivered changes

- Reworked official practice parser candidate validation to union/deduplicate complementary PDFPlumber and PyMuPDF matrix rows before roster validation.
- Added structured JSON diagnostics on stderr: extractor attempt/error, candidate row count, group coverage, issue codes, confidence/layout and final outcome.
- Added the course 4 Stream A real-PDF fixture regression to the canonical offline suite and official schedule-sync workflow.
- Replaced the cramped subject-color controls with a 12-color swatch grid, custom color picker, keyboard/touch focus styling, local preference persistence, immediate schedule refresh and optional collapsible gradients.
- Added weekly-matrix-only subjects to the subject color settings list.
- Removed schedule filter buttons for seminars, labs and clinical lessons and constrained client filter state to `all | lecture | practice | assessment`. Data normalization/rendering for `seminar`, `lab`, and `clinical` is retained.
- Bumped integration metadata and Android workflow default to RC5.

## Verification

Full `npm run qa` returned exit code `0` after the RC5 APK-install documentation and metadata were synchronized.

- TypeScript typecheck/build/dist validation: PASS.
- Node test suite: **83/83 PASS**.
- Canonical Python regression suite: **13/13 PASS**.
- Current release contract: **13/13 PASS**.
- Recovery snapshot contract: **20/20 PASS**.
- KUG data contract: **13/13 PASS**.
- Schedule coverage contract: **20/20 PASS**.
- Release contract: **18/18 PASS**.
- 4A matrix fixture: **250** unique weekly assignments across groups **401–412**, 09:00–12:25, no weekday inference, JSON completion diagnostics: PASS.
- 4B matrix fixture: **248** assignments across groups **413–424**: PASS.
- 5B matrix fixture: **194** assignments across groups **513–522**: PASS.
- Corrupt 6K practice matrix: parser detects 18 groups but rejects garbled subject text and imports zero corrupted rows: PASS.
- Theme contrast check, HTTP acceptance, production workflow contracts, recovery integrity, generated index checks and server smoke test: PASS.

Build fingerprint is `3c8a77fe603e71c2`. Build validation reports `minified=false` because `esbuild` is not installed in the working runtime. The GitHub Actions release workflow enforces minification; use CI output, not this local `dist`, as the eventual production artifact.

## Unresolved production blockers

This patch improves integration code; it does not claim that official schedule data is complete. The local environment cannot complete a live request to the official source because DNS/network access fails before bytes are downloaded. Therefore freshly downloaded PDF SHA-256 hashes cannot be asserted.

The local recovery snapshot remains `local-recovery-snapshot` / `partial`. The practice assignments for course 2 Stream B remain partial; course 5 Stream A has no accepted matrix assignments yet; course 6 practice is quarantined because extracted subject strings are garbled. Pediatrics and Clinical Psychology data remains recovery-only. The production gate must remain blocked until a network-enabled official sync fetches current raw PDFs, writes SHA-256 provenance, resolves source/calendar inconsistencies without inferring weekdays, completes exact group/stream coverage and reports zero release-gate errors.
