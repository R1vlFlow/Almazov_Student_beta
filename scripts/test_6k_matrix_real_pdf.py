from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from universal_schedule_parser import UniversalScheduleParser
import build_official_schedule as legacy

FIXTURE=Path(__file__).resolve().parents[1]/'tests/fixtures/6k_ld_2026_2027.pdf'
raw=FIXTURE.read_bytes()
parser=UniversalScheduleParser(legacy)
events,profile=parser.parse_practice(raw,6,'https://education.almazovcentre.ru/wp-content/uploads/2026/09/6k_ld-26-27-na-sajt-1.pdf','')
# The checked-in 6K PDF has a corrupted/missing font layer. It must be rejected
# rather than published as fake subjects. Structural analysis still has to
# recognise the weekly matrix and the complete 601–618 roster.
assert profile.layout=='weekly-matrix', profile
assert profile.confidence>=0.8, profile.confidence
assert profile.groups==[str(x) for x in range(601,619)], profile.groups
assert events==[], f'corrupt 6K fixture unexpectedly produced {len(events)} events'
print('6K CORRUPT-FIXTURE REGRESSION: PASS — weekly-matrix detected, 18 groups recognised, garbage schedule rejected.')

# Real official bytes, independently checked against the published source hash.
# This catches uneven row heights, vertical merges and continuation pages.
import hashlib
raw=(FIXTURE.parent/'6k_ld_live_2026_2027.pdf').read_bytes()
assert hashlib.sha256(raw).hexdigest()=='2294790533845318f1016a74f4d22c6394090b4eda19ac7a48df2bbbc4524bc3'
events,profile=parser.parse_practice(raw,6,'https://education.almazovcentre.ru/wp-content/uploads/2026/09/6k_ld-26-27-na-sajt-1.pdf','')
assert {e['group'] for e in events}==set(map(str,range(601,619)))
assert len(events)==372
def subjects(group,week):
    return {e['subject'] for e in events if e['group']==group and e['weekNumber']==week}
assert subjects('609',1)=={'Фтизиатрия'}
assert subjects('609',11)=={'Внутренние болезни'}
assert subjects('610',3)=={'Клиническая диетология','Хирургические болезни'}
assert subjects('611',1)=={'Анестезиология, реаниматология и интенсивная терапия'}
assert subjects('612',4)=={'Судебная медицина','Клиническая диетология'}
assert all(e.get('sourcePageNumber')==2 for e in events if int(e['group'])>=611)
assert all(e['weekday'] is None and e['scheduleMode']=='weekly-block' for e in events)
assert all(not any(s in e['subject'] for s in ('КПК', 'ГПТД', 'Бюро судебной', 'Патологиче ская')) for e in events)
assert len({(e['group'],e['weekNumber'],e['subject'],e['location']) for e in events})==len(events)
print('6K LIVE PDF REGRESSION: PASS — 18 groups, two pages, merged cells and uncontaminated subjects.')
