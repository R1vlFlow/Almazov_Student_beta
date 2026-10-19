# Address tab redesign — 2026-10-19

- One campus card per base address; Solnechnoe combines letters P/S and all schedule rooms.
- Building addresses, raw schedule room details and subjects remain inside collapsed details.
- Group/course/all filters retained; search also finds subjects and room descriptions.
- Unknown locations group by building label without inventing a physical address.
- Precise lesson map matching is unchanged.
- Responsive cards, segmented scope controls, styled search and theme-aware secondary text.

Validation: 111 application tests passed, including 3 new grouping tests wired into npm test. Full QA reached final smoke-server successful HTTP assertions, then the known Windows Node UV_HANDLE_CLOSING shutdown assertion occurred. Do not describe the full process as a clean success. Final build and grouping tests passed again after visual refinements.
Browser: local preview with group 124, dark theme at 390px, search Solnechnoe returns one card. Screenshot ../../tmp/addresses-mobile.jpg. No production publication in this change.

Release follow-up: removed forced process.exit from smoke-server, drained response bodies and child output pipes. Full npm run qa passed with exit 0 on Windows after the fix (111 application tests). User authorized publication on 2026-10-19.
