# RC3 QA report — 2026-10-10

## Summary

`npm run qa` exits with **0** in the local development environment. This is an offline/code-readiness result, not a production deployment or live-data attestation.

| Gate | Result |
|---|---:|
| TypeScript typecheck + project lint | PASS |
| Node tests | 82/82 PASS |
| Canonical Python regression suite | 11/11 PASS |
| Deployment contract | 13/13 PASS |
| KUG data contract | 13/13 PASS |
| Live release unit contracts | PASS |
| CI consistency | 10/10 PASS |
| Schedule coverage contract | 20/20 PASS |
| Specialist source-discovery regressions | 9/9 PASS |
| RC contract | 18/18 PASS |
| Theme contrast gate | PASS (primary text combos at least 4.5:1) |
| HTTP acceptance | PASS (schedule endpoints, UTC CRUD, validation, support ownership) |
| Build/project/generated-index validation | PASS |

## Deliberate production block

`python scripts/validate_production_release.py` exits non-zero and marks `BLOCKED_FOR_PRODUCTION` because this runtime cannot complete live fetches from the university host. Required live files still absent:

- `data/academic-weeks-2026-2027.json` — actual byte-level sync of the official academic-week PDF has not completed.
- `data/program-schedules.json` — the live specialist snapshot for Pediatrics and Clinical Psychology has not been generated from fresh official PDFs.

`data/kug-source-manifest.json` currently records 10 observed direct official KUG URLs but `sha256`, `contentBytes`, `checkedAt`, and extracted document-year provenance are intentionally null. Every row says `url-reviewed-awaiting-live-byte-verification`; no hashes were made up.

The local build reports `minified=false` because `esbuild` is not installed in this runtime. `esbuild` is declared as a dev dependency; production workflows install dependencies, build with `REQUIRE_MINIFICATION=1`, and fail closed if minification does not happen.

## Changes verified

- Current LD 4B official URL corrected to the September link in active source registries; cached local events retain their prior source URL as historical provenance and remain non-live.
- A narrow parser exception permits the wrong specialty code in the official Pediatrics year-2 lecture PDF only if the exact URL, course 2, Flow A and markers 201П/202П/203П all match. Tests prove the exception rejects different URLs, wrong course and missing group evidence.
- The KUG UI now uses a warning state and does not print a false “last updated” timestamp when source bytes have not passed live SHA-256 verification.
- The release workflow first downloads KUG/calendar PDFs, then LD schedules, then Pediatrics/Clinical Psychology; the strict gate runs before and after the minified QA build. It does not silently use last-good specialist data during a production release.
- Conflicting dates inside weekly matrices are not shifted by guesswork. They remain week-only until the official academic-week document maps them.

## Release decision

**Code QA: PASS. Official source integrity: NOT VERIFIED LIVE. Production deployment: BLOCKED.**

To finish the release, push this candidate to `R1vlFlow/Zalma` and run the two repository Actions workflows on a network-enabled GitHub runner. Promote only if `validate_production_release.py`, minified QA, and the second production gate all pass and the resulting official sync manifest contains current hashes for every required source.
