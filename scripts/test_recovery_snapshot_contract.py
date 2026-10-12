#!/usr/bin/env python3
"""Current schedule provenance contract for release snapshots.

This guards against fixture data and false "complete" labels while allowing the
real states used by the current pipeline: live, explicitly partial, recovery,
and initial bootstrap.
"""
from __future__ import annotations
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
payload = json.loads((ROOT / "data/official-schedules.json").read_text(encoding="utf-8"))
specialist = json.loads((ROOT / "data/program-schedules.json").read_text(encoding="utf-8"))
copy_public = (ROOT / "scripts/copy-public.mjs").read_text(encoding="utf-8")
deep_audit = (ROOT / "scripts/deep_schedule_audit.py").read_text(encoding="utf-8")
release_gate = (ROOT / "scripts/validate_production_release.py").read_text(encoding="utf-8")
specialist_builder = (ROOT / "scripts/build_specialist_program_schedules.py").read_text(encoding="utf-8")
pages = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")

checks: list[tuple[str, bool]] = []
def check(name: str, condition: bool) -> None:
    checks.append((name, bool(condition)))

all_events = [event for course in payload.get("courses", {}).values() for event in course.get("events", [])]
all_sources = [source for course in payload.get("courses", {}).values() for source in course.get("sources", [])]
allowed_states = {"bootstrap-pending", "live-generated", "live-generated-partial", "local-recovery-snapshot"}
check("schedule snapshot uses a recognized provenance state", payload.get("dataState") in allowed_states)
check("no event is marked as a synthetic fixture", all(
    not str(event.get("sourceUrl", "")).startswith("fixture://")
    and event.get("sourceKind") != "practice-fallback-fixture"
    and event.get("parser") != "fixture"
    for event in all_events
))
check("official source manifests contain no synthetic practice fixtures",
      all(source.get("kind") != "practice-fixture" for source in all_sources))

weekly_practice = [
    (course_id, event)
    for course_id, course in payload.get("courses", {}).items()
    for event in course.get("events", [])
    if event.get("type") == "practice" and event.get("scheduleMode") == "weekly-block"
]
check("weekly matrix practices stay undated and do not invent weekdays", all(
    not event.get("date") and event.get("weekday") is None
    and (isinstance(event.get("matrixSlots"), list) or event.get("weekNumber") is not None)
    for _, event in weekly_practice
))
check("courses 4–6 retain imported weekly practice blocks when present", all(
    any(cid == course_id for cid, _ in weekly_practice)
    for course_id in ("4", "5", "6")
))

check("partial and recovery snapshots are visibly labeled in the static build",
      "Частичное официальное расписание" in copy_public
      and "SCHEDULE_COVERAGE_INCOMPLETE" in copy_public
      and "LOCAL_RECOVERY_SNAPSHOT" in copy_public
      and "NOT_FOR_PRODUCTION" in copy_public)
check("deep schedule audit keeps the strict 100% group/stream coverage rule",
      "Strict 100% group/stream lesson coverage is required" in deep_audit
      and "live-generated" in deep_audit)
check("production release gate rejects incomplete official sources and coverage",
      "missingGroupAssignments" in release_gate
      and "NO_PUBLISHED_DATA" in release_gate
      and "quarantined source" in release_gate
      and "live-generated-partial" in release_gate)
check("specialist parser quarantines empty parses instead of publishing empty courses",
      "PARSER_EMPTY_SOURCE" in specialist_builder
      and "No valid events for published program/course" in specialist_builder
      and "quarantined" in specialist_builder)
check("Pages checks official schedule completeness before packaging or deployment",
      pages.index("run: python scripts/validate_production_release.py")
      < pages.index("run: npm run qa")
      < pages.index("actions/upload-pages-artifact@v3"))

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(f'{"PASS" if ok else "FAIL"} — {name}')
print(f"SCHEDULE PROVENANCE CONTRACT: {len(checks) - len(failed)}/{len(checks)} passed")
if failed:
    print("FAILED:\n - " + "\n - ".join(failed))
    sys.exit(1)
