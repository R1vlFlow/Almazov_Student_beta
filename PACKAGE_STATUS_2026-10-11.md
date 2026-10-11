# Package and schedule data status — 2026-10-11

## Readiness

**Data status: `not-ready` for publication; static local application is buildable.** The UI and data report distinguish complete snapshots, partial snapshots, unpublished courses, and unresolved source conflicts. A successful static build does not mean the timetable is complete or safe to describe as full.

The machine-generated coverage report is [`reports/data-coverage-latest.json`](reports/data-coverage-latest.json), with a readable summary at [`reports/data-coverage-latest.md`](reports/data-coverage-latest.md). Every build regenerates both and bundles the JSON into `dist/data/coverage.json`.

## Current source audit

- Six General Medicine (31.05.01) course schedules were rebuilt from current official schedule PDFs. The four formerly rejected KUG PDFs now parse through the PDF text-trace fallback; the KUG manifest validates all 10 published PDFs and the official academic-week calendar.
- The old 42 missing practical assignments were recovered from current official schedules wherever present. One roster assignment remains unconfirmed: General Medicine course 4, stream B, group 424. The current official PDF contains groups 413–423; it does not contain group 424. No replacement lesson was invented.
- The audit scans all 18 course snapshots. Current snapshot status is generated automatically: the six General Medicine snapshots are classified from group/source integrity, four Pediatrics/Clinical Psychology snapshots remain recovery-only and unverified by source bytes, and eight specialist snapshots have no published schedule.
- The integrity audit detects same-group, same-date, same-start-time assignments with different lesson data. Affected course snapshots are marked partial and show a warning; rows remain in the bundle for review. Weekly matrix blocks without a weekday are not assigned an inferred date.
- Latest counts: **2 full, 8 partial, 8 unpublished** of 18 snapshots; **1** missing group practice assignment; **77** same-time conflicts remain for source/subgroup review; **6** malformed PDF rows are quarantined; **0** exact duplicates; all **43/43** schedule/KUG source records pass current hash/year/byte validation.
- Official source PDFs omit teacher names for the General Medicine rows; the report counts this field separately instead of fabricating teacher names. Missing venues are also counted. Records without group/date/time or with duplicate/conflicting keys are reported as integrity defects.

## Local static application

Run `node scripts/serve-static.mjs` from this repository to serve `dist/` at `http://127.0.0.1:4173`. Static mode does not use API/Redis/server schedule requests. Personal events and support notes stay in local browser storage; support submissions are not sent.

The build sequence is `node scripts/clean-dist.mjs`, TypeScript compilation, `scripts/copy-public.mjs` (which generates the coverage report before fingerprinting), then `scripts/validate-dist.mjs`. It must finish without build errors even when the data report is `not-ready`; the report and UI preserve that status instead of presenting partial data as a complete release.

## Release blockers

1. Confirm or correct the missing 4/B group 424 practical assignment from a current official source.
2. Resolve same-time schedule collisions against the original PDFs, including whether any represent unlabelled subgroups or parser overlap.
3. Re-parse and verify official source bytes/SHA-256 for the four Pediatrics/Clinical Psychology recovery snapshots.
4. Keep the eight unpublished specialist snapshots visibly unavailable until the university publishes them.
5. Local runtime does not have `esbuild`; its bundle is not minified and is not a production artifact.

Latest offline validation: **74/74** Node tests, **14/14** KUG data-contract checks, **16/16** schedule-coverage checks, offline recovery integrity, official parser contract, generated-index validation, and schedule-data validation all pass. The production audit still reports `not-ready` with the blockers above; local QA does not waive them.

Do not label this checkout release-ready until the generated audit has no unresolved errors/blockers and the production bundle passes the minified release checks.
