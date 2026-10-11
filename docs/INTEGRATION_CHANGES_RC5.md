# RC5 integration changes — 2026-10-11

## Practice parser

- Extractors report JSON lines to stderr with UTC timestamp, source URL, course, stream, parser name, event count, structural rejection codes and final group coverage.
- Complementary matrix candidates are unioned on `(group, week, subject, location, start, end)` before validation, then strict validation rejects missing groups, missing required fields, invalid weekday injection into matrix data, and garbled subject text.
- Every accepted row keeps provenance (`parser`, `layoutProfile`, `parseConfidence`) and weekly matrices stay undated.
- A new real-PDF regression covers course 4 Stream A (250 rows for groups 401–412). The existing 4B and 5B regressions are retained and run by the official-sync workflow. A corrupt 6K matrix remains quarantined with JSON reason codes.

## Settings palette

- A 12-color grid replaces the cramped native swatches with 32–40 px touch targets, active outline/check mark, localized labels, and keyboard-visible focus.
- “Свой цвет” opens an accessible native picker while keeping the picker value in sync with the visible palette. Changes go through the existing central personalization store, are retained in local storage, and re-render the timetable and settings immediately.
- Gradient options are preserved, but placed inside a collapsible disclosure. Selecting a solid color clears any gradient for that subject. Settings lists subjects in both dated lessons and weekly matrix assignments.

## Lesson-type filters

- Only `all`, `lecture`, `practice`, and `assessment` are exposed as schedule filter controls.
- The state is a `LessonTypeFilter` union and ignores unsupported dataset values defensively.
- `seminar`, `lab`, and `clinical` remain in canonical lesson normalization, schedule data and labels; only their individual filter buttons were removed. Selecting “Все” continues to show all lesson categories.

## Verification and known edge cases

- Run `npm run qa` after installing dependencies. RC5 local result: exit code 0, 83/83 JS tests, 13/13 canonical Python regressions, 13/13 KUG contract, 20/20 coverage contract, build/cache validation and server smoke checks all pass.
- To generate a production release, CI must also build the minified artifact with `REQUIRE_MINIFICATION=1`. The current offline container does not have `esbuild` installed and the project archive contains no lockfile, so this local `dist` output is not minified.
- Official live PDF synchronization is not certified by this patch. The runtime could not download source bytes due to DNS/network denial. 2B remains partial, 5A remains quarantined until actual parser output passes exact roster/coverage validation, 6K remains quarantined until garbled source text is resolved, and specialist schedules are recovery-only. Keep `BLOCKED_FOR_PRODUCTION` until the online sync workflow produces fresh SHA-256 provenance and zero release-gate errors.
