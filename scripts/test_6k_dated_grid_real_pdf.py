#!/usr/bin/env python3
"""Regression coverage for the 6th-course calendar-date timetable layout."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

import build_official_schedule as legacy
from universal_schedule_parser import UniversalScheduleParser

FIXTURE = ROOT / 'tests' / 'fixtures' / '6k_11_semestr_2026.pdf'
events, profile = UniversalScheduleParser(legacy).parse_practice(
    FIXTURE.read_bytes(),
    6,
    'fixture://6k_11_semestr_2026.pdf',
    '',
)

assert profile.layout == 'dated-grid', profile.to_dict()
assert profile.kind == 'practice', profile.to_dict()
assert profile.confidence >= 0.9, profile.to_dict()
assert len(events) == 187, f'expected 187 dated lessons, got {len(events)}'

def at(date, subject_fragment, start=None, end=None, lesson_type='practice'):
    found = [e for e in events if e.get('date') == date and subject_fragment.casefold() in e['subject'].casefold()
             and (start is None or e['start'] == start)
             and (end is None or e['end'] == end)
             and e.get('type') == lesson_type]
    assert found, f'missing {date} {subject_fragment} {start or ""}-{end or ""} ({lesson_type})'
    return found[0]

# Consecutive first/second pairs are represented as one session only when the
# official PDF physically merges their cells. The afternoon pairs stay separate.
at('2026-09-03', 'АиР Поленова', '09:20', '12:25')
at('2026-09-02', 'Внутренние болезни', '13:30', '14:55')
at('2026-09-02', 'Инфекционные болезни', '15:10', '16:35')

# Week labels are taken from the PDF, including the spring section whose dates
# do not use the autumn semester's week-start calendar.
autumn = at('2026-09-07', 'АиР Поленова', '09:20', '12:25')
assert autumn.get('weekNumber') == 2 and autumn.get('weekStart') == '2026-09-07', autumn
spring = at('2026-04-27', 'Оперативное акушерство, ПЗ', '13:30', '16:35')
assert spring.get('weekNumber') == 13 and 'weekStart' not in spring, spring
at('2026-04-27', 'Оперативное акушерство, лекция', '11:00', '12:25', 'lecture')
at('2026-05-04', 'Оперативное акушерство, ПЗ', '09:20', '12:25')

# Blank dates and cells must stay blank; the parser must not extrapolate a
# repeating cycle beyond the source's last published lesson.
assert not [e for e in events if e.get('date') == '2026-12-14']
assert all(e.get('scheduleMode') == 'dated' for e in events)

print('6K DATED-GRID REGRESSION: PASS — 187 dated lessons, merged periods, week blocks, spring labels and explicit lecture cells.')

