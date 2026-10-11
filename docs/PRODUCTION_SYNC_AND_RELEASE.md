# Production sync and release gate — 2026-10-10

## Release decision

**Current state: `BLOCKED_FOR_PRODUCTION`.** The local build and offline QA are green, but the raw PDF bytes could not be downloaded in this runtime because direct DNS/network access to the official host is unavailable. No SHA-256 checksum is fabricated. The RC is not a claim that the live website has been deployed.

## Official publication inventory

The current official student hub is:

- https://education.almazovcentre.ru/about_institute/programm/specialist_programme/student/

The hub currently publishes 10 course KUGs: General Medicine (31.05.01), years 1–6; Pediatrics (31.05.02), years 1–2; Clinical Psychology (37.05.01), years 1–2. It does not show linked timetables/KUG for Pediatrics years 3–6 or Clinical Psychology years 3–5. Those 7 potential program/course combinations remain explicitly unpublished; no groups or events are synthesized for them.

`data/kug-source-manifest.json` includes direct URLs for the 10 observed KUG PDFs. All entries have status `url-reviewed-awaiting-live-byte-verification` and deliberately empty `sha256`, `contentBytes`, `checkedAt`, and extracted-year provenance. The manifest only gives users direct official links; it is **not** a live source attestation.

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
2. All 6 General Medicine course datasets with every group in each published stream, both lecture and practice source coverage, no fixture rows, and a direct practice assignment for every roster group.
3. Ten KUG PDFs, correct programme/course/year identity, study and attestation periods, dates inside 2026/2027, and independent direct URLs.
4. The official 2026/2027 academic week calendar, contiguous week numbering, and weekly-block assignments mapped to actual official week ranges.
5. Fresh generated snapshots for Pediatrics and Clinical Psychology courses 1–2, with group coverage and source provenance.
6. Strict treatment of contradictory PDF date headers: a matrix is only shown as a week-based rotation until the official week calendar safely maps it. The parser never guesses a weekday/date from a matrix column.
7. A production bundle minified via `esbuild`, passing QA and release validation a second time.

The GitHub Actions workflows `Deploy GitHub Pages (live-synced release gate)` and `Sync official schedules and deploy` perform this process on a runner with network access. They fail closed if the live data or build requirements are incomplete. Push/merge this candidate into the repository and inspect both workflows before treating the website as released.

## Explicit source exceptions

- The official Pediatrics year-2 lecture PDF at `https://education.almazovcentre.ru/wp-content/uploads/2026/09/raspisanielekczij_2k_pediatry-osen-1.pdf` has a wrong specialty code in its header. The exception is limited to that exact URL, expected programme 31.05.02, course 2, Flow A, and group markers 201П/202П/203П. The parser must retain the exception in warnings/provenance; any missing condition rejects the file.
- The General Medicine 4B practical PDF currently linked from the hub is `https://education.almazovcentre.ru/wp-content/uploads/2026/09/4k_ld_b-26-27-na-sajt.pdf`. Older cached rows still refer to an October URL. They are kept in the recovery snapshot as historical provenance, not silently relabelled as data parsed from the current PDF.
- Practical matrix files for courses 4–6 have contradictory embedded date/year labels. Do not globally shift 2025 dates to 2026. The live parser captures SHA-256 and date-label diagnostics and only maps explicit week columns via the official academic-week PDF.

## Local checks verified in this runtime

- `npm run qa`: PASS after latest fixes.
- Node unit tests: **82/82 PASS**.
- Deployment contract: **13/13 PASS**; CI consistency: **10/10 PASS**.
- KUG data contract: **13/13 PASS**.
- Live release unit contracts: pass, including hash logic, official week range handling, stale-date detection and the exact Pediatrics exception.
- Production gate: intentionally FAILS while `data/academic-weeks-2026-2027.json` and `data/program-schedules.json` are absent and no live hashes exist.

A green offline QA run is not equivalent to successful live-sync or deployment. Release only after the remote workflows complete and publish a fully validated live snapshot.
