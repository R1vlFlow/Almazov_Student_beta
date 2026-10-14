from pathlib import Path
import build_official_schedule as parser
root=Path(__file__).resolve().parents[1]
events=parser.parse_practice((root/'tests/fixtures/1k_ld_b_live_2026_2027.pdf').read_bytes(),1,'fixture://1b','B')
org=[e for e in events if e['group']=='124' and e['weekNumber']==7 and e['weekday']==5 and 'государственности' in e['subject']]
assert {e['start'] for e in org}=={'13:30','15:20'},org
conflict=[e for e in events if e['group']=='130' and e['weekNumber']==7 and e['weekday']==3 and e['start']=='09:20']
assert {e['subject'] for e in conflict}=={'Иностранный язык','Безопасность жизнедеятельности АСЦ'},conflict
events=parser.parse_practice((root/'tests/fixtures/3k_ld_b_live_2026_2027.pdf').read_bytes(),3,'fixture://3b','B')
assert {e['group'] for e in events}==set(map(str,range(313,323)))
rows=[e for e in events if e['group']=='315' and e['weekNumber']==2 and e['weekday']==0]
assert {(e['start'],e['subject']) for e in rows}=={('09:00','Общая хирургия'),('10:55','Общая хирургия'),('13:30','Пропедевтика внутренних болезней'),('15:20','Пропедевтика внутренних болезней')},rows
assert not any(e['group']=='315' and e['weekday']==0 and e['subject']=='Патологическая анатомия' for e in events)
print('DAILY MERGED CELLS: PASS — true second lessons, stable day columns, source ambiguity preserved')
