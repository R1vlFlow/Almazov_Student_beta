from pathlib import Path
import json
import copy
from source_notices import apply_source_notices
import build_official_schedule as parser
root=Path(__file__).resolve().parents[1]
events=parser.parse_practice((root/'tests/fixtures/1k_ld_b_live_2026_2027.pdf').read_bytes(),1,'fixture://1b','B')
org=[e for e in events if e['group']=='124' and e['weekNumber']==7 and e['weekday']==5 and 'государственности' in e['subject']]
assert {e['start'] for e in org}=={'13:30','15:20'},org
conflict=[e for e in events if e['group']=='130' and e['weekNumber']==7 and e['weekday']==3 and e['start']=='09:20']
assert {e['subject'] for e in conflict}=={'Иностранный язык','Безопасность жизнедеятельности АСЦ'},conflict
overlays=json.loads((root/'data/verified-schedule-overrides.json').read_text(encoding='utf-8'))
assert not overlays['overrides'], 'Retired overlays must not replace current PDF assignments'
for old in overlays['retiredOverrides']:
    assert any(all(row.get(k)==old.get(k) for k in ('group','weekNumber','weekday','start','end','subject')) for row in events),old
merged=parser.merge_consecutive_identical_events(events)
morning=next(e for e in merged if e['group']=='124' and e['weekNumber']==2 and e['weekday']==0 and e['start']=='09:00')
assert morning['lessonParts']==[{'start':'09:00','end':'10:35'},{'start':'10:55','end':'12:25'}],morning
afternoon=next(e for e in merged if e['group']=='124' and e['weekNumber']==2 and e['weekday']==0 and e['start']=='13:30')
assert afternoon['location']=='ШКОЛА, ауд. 6',afternoon
notice=json.loads((root/'data/official-source-notices.json').read_text(encoding='utf-8'))[0]
sample={'courses':{'1':{'sources':[{'url':notice['sourceUrl'],'sha256':notice['sha256']}],
    'events':[{'group':'130','date':'2026-10-15','sourceUrl':notice['sourceUrl'],
    'subject':notice['subjects'][0],'start':'09:20','end':'10:45'}]}}}
assert apply_source_notices(sample,root)==[notice]
assert sample['courses']['1']['events'][0]['sourceNoticeId']==notice['id']
for field,value in [('group','131'),('date','2026-10-22'),('subject','Химия'),('end','14:00')]:
    changed=copy.deepcopy(sample)
    changed['courses']['1']['events'][0][field]=value
    assert not apply_source_notices(changed,root)
    assert 'sourceNoticeId' not in changed['courses']['1']['events'][0]
changed=copy.deepcopy(sample)
changed['courses']['1']['sources'][0]['sha256']='0'*64
assert not apply_source_notices(changed,root)
assert 'sourceNoticeId' not in changed['courses']['1']['events'][0]
events=parser.parse_practice((root/'tests/fixtures/3k_ld_b_live_2026_2027.pdf').read_bytes(),3,'fixture://3b','B')
assert {e['group'] for e in events}==set(map(str,range(313,323)))
rows=[e for e in events if e['group']=='315' and e['weekNumber']==2 and e['weekday']==0]
assert {(e['start'],e['subject']) for e in rows}=={('09:00','Общая хирургия'),('10:55','Общая хирургия'),('13:30','Пропедевтика внутренних болезней'),('15:20','Пропедевтика внутренних болезней')},rows
assert not any(e['group']=='315' and e['weekday']==0 and e['subject']=='Патологическая анатомия' for e in events)
print('DAILY MERGED CELLS: PASS — true second lessons, stable day columns, source ambiguity preserved')
