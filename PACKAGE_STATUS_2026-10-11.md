# Full project package — integration RC5 — 2026-10-11

- Application package: `almazov-schedule-hub` `2.8.0-rc.5`.
- UI package: `2.8.0-rc.5`.
- Schedule engine metadata: `4.9.0-rc.1`; existing sync/recovery data retains its own generation provenance.
- Package scope: complete source handoff including TypeScript application, server/importer, parser scripts, public UI/PWA assets, generated `dist`, current local schedule/KUG data, source manifests, migrations, tests, PDF/HTML fixtures, GitHub Actions workflows, audit reports, and build metadata.
- Exclusions: `.git`, `node_modules`, Python bytecode/cache, and `.DS_Store`. No real `.env` file or secrets are included; `.env.production.example` is a template.

## RC5 integration changes

1. **Practice parser and ingestion diagnostics.** `scripts/universal_schedule_parser.py` now emits newline-delimited structured JSON diagnostics for extractor failures, candidate event counts, candidate rejection reasons, garbled subjects, missing groups, parser choice, layout confidence, and final coverage. Matrix extractors can be unioned and deduplicated before whole-roster validation so a partial backend does not discard complementary rows from the other backend. Weekly blocks retain `weekday: null` and `scheduleMode: weekly-block`; no weekday or date is invented.
2. **Real Stream A regression.** Added `scripts/test_4k_a_matrix_real_pdf.py` and registered it in both the canonical offline suite and live official-sync workflow. The 4A fixture resolves 250 assignments for groups 401–412, preserves the 09:00–12:25 matrix interval, rejects duplicates, retains week-block semantics, and validates the JSON completion log. Existing 4B and 5B fixture tests still pass. The corrupt 6K fixture remains correctly rejected instead of being filled with garbled subjects.
3. **Subject color settings.** Replaced native color-input rows and unstyled tiny gradient controls with a 12-color touch-friendly preset grid, an accessible custom color picker, selected-state feedback, immediate schedule re-render, and local personalization persistence. Optional gradients are available in a collapsible section. Choosing a solid color clears the active gradient to make the result predictable. Subjects sourced only from weekly practice blocks are also included in settings.
4. **Schedule type filters.** The UI now exposes only `Все`, `Лекции`, `ПЗ`, and `Контроль`. Dedicated `Семинары`, `Лабораторные`, and `Клиника` buttons and handlers are absent. Their canonical lesson types remain supported by the normalization/import pipeline and remain visible under `Все`.
5. **Release metadata.** Bumped the integration candidate to `2.8.0-rc.5` in `package.json`, `version.json`, UI metadata, Android release workflow defaults, docs and tests. GitHub Actions has a dedicated A-stream matrix regression step before sync.

## Local validation

`npm run qa` completed with exit code 0 after the RC5 metadata and install-document contract were aligned.

- TypeScript/typecheck/lint: PASS.
- Build and dist validation: PASS; build fingerprint `3c8a77fe603e71c2`.
- JavaScript tests: 83/83 PASS.
- Canonical Python regression suite: 13/13 PASS, including the new 4A matrix fixture.
- Current release contract: 13/13 PASS.
- Recovery-snapshot contract: 20/20 PASS.
- KUG contract: 13/13 PASS.
- Schedule coverage contract: 20/20 PASS.
- 4A practice fixture: 250 assignments / 12 groups / deduplication and structured diagnostics PASS.
- 4B fixture: 248 assignments / 12 groups PASS.
- 5B fixture: 194 assignments / 10 groups PASS.
- 6K malformed practice fixture: rejected with diagnostics; zero garbled schedule rows accepted.
- Theme contrast, HTTP acceptance, production workflow contracts, recovery integrity, generated-index validation and server smoke test: PASS.

The local build is **not minified** because `esbuild` is not installed in this runtime and the supplied project has no npm lockfile. Release workflows require minification and install dependencies in CI; the local non-minified output must not be treated as the production artifact.

## Production status — BLOCKED_FOR_PRODUCTION

This is a complete integration package, not a certified production release. Live synchronization from this runtime has failed at DNS resolution before raw official PDF bytes were retrieved; consequently, source SHA-256 hashes cannot be claimed as freshly verified. The generated local data remains explicitly marked `local-recovery-snapshot`, not `live`. Specific unresolved data gaps remain: 2B practice data is still partial (12 accepted local cached rows vs official groups 217–229), 5A has not yet produced accepted practice assignments for groups 501–512, and 6K practice is quarantined because the local source's extracted subject text is garbled. Pediatrics and Clinical Psychology snapshots are recovery-only. The official KUG hub exposes 10 published programme/course PDF sets out of 17 anticipated programme/course combinations.

Do not publish the recovery snapshot as live or complete. Run `npm run sync:official` in a network-enabled runner, obtain current source bytes and SHA-256 values, verify all published group/stream and KUG coverage, resolve date/week anomalies without inferred weekdays, pass `python3 scripts/validate_production_release.py`, and run `npm run build:rc` before deployment. Release remains denied until the production gate reports zero errors.

## Entry points

- Start here: `README_FIRST.md`.
- Setup/build/test: `README.md`, `package.json`.
- Parser: `scripts/universal_schedule_parser.py`, `scripts/build_official_schedule.py`.
- Regression: `scripts/test_4k_a_matrix_real_pdf.py`, `data/ci-regression-contract.json`.
- Official sync/release: `docs/PRODUCTION_SYNC_AND_RELEASE.md`, `.github/workflows/sync-official-schedules.yml`.
- GitHub Pages: `.github/workflows/pages.yml`.
- Android build: `.github/workflows/android-apk.yml`.
