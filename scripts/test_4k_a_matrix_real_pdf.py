#!/usr/bin/env python3
"""Real-source regression for the new 4th-course A practice matrix.

The fixture is the official Almazov PDF supplied for this release. The test
checks the semantic structure that matters to the app: all 12 groups, the
fixed practice time, weekly (not invented daily) events, correct multi-slot
week expansion, and clean subject/location separation.
"""
from pathlib import Path
import importlib.util
from collections import Counter, defaultdict
from contextlib import redirect_stderr
import io
import json

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "tests" / "fixtures" / "4k_ld_a_stream_header_2026_2027.pdf"
spec = importlib.util.spec_from_file_location("build", ROOT / "scripts" / "build_official_schedule.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

raw = PDF.read_bytes()
diagnostics = io.StringIO()
with redirect_stderr(diagnostics):
    events = mod.parse_practice(raw, 4, "fixture://4k_ld_a_stream_header_2026_2027.pdf", "A")
records = [json.loads(line) for line in diagnostics.getvalue().splitlines() if line.strip()]
complete = [record for record in records if record.get("event") == "practice_parse_complete"]
assert complete and complete[-1].get("eventCount") == 246
assert complete[-1].get("missingGroups") == []
assert all(record.get("component") == "universal_schedule_parser" for record in records)

expected_groups = {str(x) for x in range(401, 413)}
got_groups = {str(e.get("group")) for e in events}
assert got_groups == expected_groups, (got_groups, expected_groups)
assert events, "4A fixture produced no practice events"
assert all(e.get("stream") == "A" for e in events)
assert all(e.get("type") == "practice" for e in events)
assert all(e.get("weekday") is None for e in events), "matrix parser invented a weekday"
assert all(e.get("scheduleMode") == "weekly-block" for e in events)
assert all((e.get("start"), e.get("end")) == ("09:00", "12:25") for e in events)
assert all(1 <= int(e.get("weekNumber", 0)) <= 16 for e in events)

# No row may inherit a neighbouring group's room/subject.
for e in events:
    subject = str(e.get("subject") or "").strip()
    location = str(e.get("location") or "")
    assert subject and len(subject) > 1
    assert subject not in location, (e["group"], e["weekNumber"], subject, location)
    assert "  " not in location

assert all("диагност ика" not in str(e["subject"]) for e in events)
assert all("диагностик а" not in str(e["subject"]) for e in events)

# Validate that each group has a broad set of actual matrix assignments. Exact
# subject variants are asserted in the paired 4B and 5B fixture tests; this A
# fixture specifically guards stream-header mapping, full-roster recovery, and dedupe.
counts = Counter(str(e["group"]) for e in events)
assert set(counts) == expected_groups, counts
assert min(counts.values()) >= 18, counts
by_group_week = defaultdict(list)
for e in events:
    by_group_week[(str(e["group"]), int(e["weekNumber"]))].append(e["subject"])
assert any("Внутренние болезни" in subjects for subjects in by_group_week.values())
assert any("Гинекология" in subject for e in events for subject in [e["subject"]])

identity = [(str(e.get('group')), int(e.get('weekNumber') or 0), e.get('start'), e.get('end'), e.get('subject'), e.get('location')) for e in events]
assert len(identity) == len(set(identity)), '4A parser produced duplicate event rows'
assert len(events) == 246, f'expected 246 assignments from official fixture, got {len(events)}'
print(f"4A REAL MATRIX REGRESSION: PASS — {len(events)} assignments, {len(got_groups)} groups, JSON diagnostics and deduplication verified.")

assert by_group_week[('405', 1)] == ['Лучевая диагностика'], 'week 2 subject leaked into narrow week 1 column'
