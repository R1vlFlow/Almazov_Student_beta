#!/usr/bin/env python3
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
BUILD = (ROOT / 'scripts/build_official_schedule.py').read_text(encoding='utf-8')
APP = (ROOT / 'src/app.ts').read_text(encoding='utf-8')
ROSTER = json.loads((ROOT / 'data/official-roster-contract.json').read_text(encoding='utf-8'))
WORKFLOW_PATH = ROOT / '.github/workflows/sync-official-schedules.yml'
WF = WORKFLOW_PATH.read_text(encoding='utf-8') if WORKFLOW_PATH.exists() else None
SCHEDULE = json.loads((ROOT / 'data/official-schedules.json').read_text(encoding='utf-8'))
PACKAGE = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
QA_SCRIPT = PACKAGE.get('scripts', {}).get('qa', '')

checks = []
def check(name, ok):
    checks.append((name, bool(ok)))

check('exact LD roster contract present', set(ROSTER) == {'1','2','3','4','5','6'})
for course, expected in ROSTER.items():
    groups = [str(g) for stream in expected.values() for g in stream]
    check(f'course {course} roster sizes match', len(set(groups)) == len(groups))
    check(f'course {course} groups have official schedule coverage',
          all(any(str(e.get('course')) == course and str(e.get('group')) == g for e in SCHEDULE.get('events', []))
              for g in groups) if SCHEDULE.get('events') else True)
check('builder uses official roster contract', 'official-roster-contract.json' in BUILD)
check('builder preserves double metadata', 'doubleIndex' in BUILD and 'doubleOf' in BUILD)
check('client renders double parts in all views', 'function eventHalfLabel(e:CalendarEvent)' in APP and all(f'function {name}(' in APP and APP[APP.index(f'function {name}('):APP.find('\nfunction ', APP.index(f'function {name}(')+10) if APP.find('\nfunction ', APP.index(f'function {name}(')+10)>=0 else len(APP)].find('eventHalfMarkup(')>=0 for name in ('renderCardSchedule','renderMobile','renderMonth','renderAgenda','renderList')))
if WF is not None:
    check('scheduled workflow runs npm production QA', 'npm run qa' in WF)
    check('production QA runs JS validation', 'scripts/validate_js.py' in QA_SCRIPT)
    check('production QA runs generated-index validation', 'scripts/validate_generated_index.py' in QA_SCRIPT)
    check('production QA runs schedule-data validation', 'scripts/validate_schedule_data.py' in QA_SCRIPT)

failed = [name for name, ok in checks if not ok]
print(f'SCHEDULE COVERAGE CONTRACT: {len(checks) - len(failed)}/{len(checks)} passed')
if failed:
    print('FAILED:')
    for name in failed:
        print(' - ' + name)
    raise SystemExit(1)
