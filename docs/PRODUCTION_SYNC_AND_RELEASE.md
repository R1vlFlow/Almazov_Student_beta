# Production sync and release gate — 2026-10-10

## Release decision

**Current data state: `not-ready` for publication; local static app is buildable.** The latest sync verifies all 10 KUG PDFs and the calendar-week PDF. Schedule integrity still has unresolved same-time collisions; General Medicine 4/B group 424 has no matching practical assignment in the current official PDF; four specialist recovery snapshots lack byte/hash verification; and eight specialist course snapshots are unpublished. See [`../reports/data-coverage-latest.md`](../reports/data-coverage-latest.md).

## Official publication inventory

The current official student hub is:

- https://education.almazovcentre.ru/about_institute/programm/specialist_programme/student/

The hub currently publishes 10 course KUGs: General Medicine (31.05.01), years 1–6; Pediatrics (31.05.02), years 1–2; Clinical Psychology (37.05.01), years 1–2. Timetable data for specialist years 1–2 is still a local recovery snapshot pending verified source bytes. Specialist years 3–6 are shown as unpublished; no groups or events are synthesized for them.

`data/kug-source-manifest.json` includes direct URLs for the 10 observed KUG PDFs with current byte counts, SHA-256, check times, and extracted academic-year provenance. The PDF trace-text fallback recovers the 4 files previously rejected with `KUG_NO_STUDY_PERIODS`.

## Required live process

Run on a runner with outbound HTTPS access to the official source:

```bash
npm install
python -m pip install -r requirements-official-sync.txt
python scripts/sync_kug_and_calendar.py
python scripts/build_official_schedule.py
python scripts/build_specialist_program_schedules.py
python scripts/validate_production_release.py
REQUIRE_MINIFICATION=1 REQUIRE_SPECIALIST_SNAPSHOT=1 npm run qa
python scripts/validate_production_release.py
```

The release gate verifies all of the following before deployment:

1. Fresh source bytes and SHA-256 hashes; `checkedAt` no older than 36 hours.
2. All 6 General Medicine course datasets with every group in each published stream, both lecture and practice source coverage, no fixture rows, and a direct practice assignment for every roster group. A remaining group 424 gap must be resolved from an official source.
3. Ten KUG PDFs, correct programme/course/year identity, study and attestation periods, dates inside 2026/2027, and independent direct URLs.
4. The official 2026/2027 academic week calendar, contiguous week numbering, and weekly-block assignments mapped to actual official week ranges.
5. Fresh generated snapshots for Pediatrics and Clinical Psychology courses 1–2, with group coverage and source provenance; the present recovered rows do not meet this requirement.
6. Strict treatment of contradictory PDF date headers: a matrix is only shown as a week-based rotation until the official week calendar safely maps it. The parser never guesses a weekday/date from a matrix column.
7. A production bundle minified via `esbuild`, passing QA and release validation a second time.

This checkout has no `.github/workflows` directory, so it contains no automated publish or live-sync workflow. The current task is local-only; no remote publication is configured. The audit status is not release-ready until every remaining source and integrity blocker is resolved.

## Explicit source exceptions

- The official Pediatrics year-2 lecture PDF at `https://education.almazovcentre.ru/wp-content/uploads/2026/09/raspisanielekczij_2k_pediatry-osen-1.pdf` has a wrong specialty code in its header. The exception is limited to that exact URL, expected programme 31.05.02, course 2, Flow A, and group markers 201П/202П/203П. The parser must retain the exception in warnings/provenance; any missing condition rejects the file.
- The General Medicine 4B practical PDF currently linked from the hub contains groups 413–423. The roster contract also lists 424, which is not in that PDF. The current snapshot flags 424 as missing and does not borrow a row from an older PDF.
- Practical matrix files for courses 4–6 have contradictory embedded date/year labels. Do not globally shift 2025 dates to 2026. The live parser captures SHA-256 and date-label diagnostics and only maps explicit week columns via the official academic-week PDF.

## Local checks verified in this runtime

- Static TypeScript compilation and dist validation: PASS; see the current build output.
- Node unit tests: run locally with `node --test`; any current failures are recorded with the data coverage report and must not be hidden.
- Deployment contract: **13/13 PASS**; CI consistency: **10/10 PASS**.
- KUG data contract: **13/13 PASS**.
- Live release unit contracts: pass, including hash logic, official week range handling, stale-date detection and the exact Pediatrics exception.
- Production gate: produces `not-ready`/`partially-ready` with machine-readable blockers; it is not a certification of a complete release.

A green offline QA run is not equivalent to successful live-sync or deployment. Release only after the remote workflows complete and publish a fully validated live snapshot.
