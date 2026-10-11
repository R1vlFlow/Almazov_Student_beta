#!/usr/bin/env python3
"""Offline parser/data-contract checks for the current official schedule index.

This test deliberately avoids importing a remote sync entry point or relying on
public network access. Parsing and publishing are tested separately.
"""
from pathlib import Path
import json, re
ROOT=Path(__file__).resolve().parents[1]
payload=json.loads((ROOT/'data/official-schedules.json').read_text(encoding='utf-8'))
assert payload.get('schemaVersion') == 7, 'unexpected official source schema'
courses=payload.get('courses')
assert isinstance(courses,dict) and len(courses)==6, 'official data must contain course records 1–6'
events=[]
for course_key,course in courses.items():
    assert isinstance(course.get('groups'),list) and isinstance(course.get('events'),list), f'course {course_key} missing groups/events'
    for event in course['events']:
        events.append((str(course_key),event))
        date=event.get('date')
        # Weekly-block rows intentionally defer a concrete date and weekday;
        # the official academic-week range is retained instead.
        valid_date=bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(date or '')))
        valid_week_block=event.get('scheduleMode')=='weekly-block' and isinstance(event.get('weekNumber'),int) and event.get('matrixWeekNumber')==event.get('calendarWeekNumber') and event.get('weekCalendarOffset')==0 and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(event.get('weekRangeStart','')))) and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(event.get('weekRangeEnd',''))))
        assert valid_date or valid_week_block, f"event has neither date nor a materializable weekly block: {event.get('id')}"
        assert re.fullmatch(r'\d{2}:\d{2}',str(event.get('start',''))), f"invalid start time: {event.get('id')}"
        assert re.fullmatch(r'\d{2}:\d{2}',str(event.get('end',''))), f"invalid end time: {event.get('id')}"
        group=event.get('group') or event.get('groupName') or event.get('groups')
        assert group, f"event without group: {event.get('id')}"
# Repeated adjacent identical slots are represented as one continuous source event.
merged=[e for course,e in events if course=='1' and str(e.get('group'))=='123' and e.get('mergedConsecutive')]
assert merged and all(e.get('durationMinutes') in (185,205) for e in merged), 'group 123 adjacent source slots were not safely consolidated'
assert isinstance(payload.get('kugSources'),list) and isinstance(payload.get('assessmentPeriods'),list)
assert all(x.get('sourceUrl') for x in payload['assessmentPeriods']), 'assessment period without source URL'
print(f"OFFICIAL DATA PARSER CONTRACT: PASS — {len(events)} events, {len(payload['kugSources'])} KUG sources, {len(payload['assessmentPeriods'])} source-linked periods")
