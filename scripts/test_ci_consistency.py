#!/usr/bin/env python3
"""Validate current Pages deployment and scheduled sync workflow contracts."""
from pathlib import Path
import re
import json
ROOT=Path(__file__).resolve().parents[1]
pages=(ROOT/'.github/workflows/pages.yml').read_text(encoding='utf-8')
sync=(ROOT/'.github/workflows/sync-official-schedules.yml').read_text(encoding='utf-8')
guide=(ROOT/'README_FIRST.md').read_text(encoding='utf-8')
pkg=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
official_sync=pkg.get('scripts',{}).get('sync:official','')
checks=[
 ('normal deploy handles main/master', bool(re.search(r'branches:\s*\[\s*main,\s*master\s*\]',pages))),
 ('normal deploy supports workflow_dispatch','workflow_dispatch:' in pages),
 ('scheduled sync is manual/scheduled', 'workflow_dispatch:' in sync and 'schedule:' in sync),
 ('sync does not compete on normal pushes', not re.search(r'^\s*push:\s*$',sync,re.M)),
 ('shared deployment queue cannot cancel in-progress release', 'group: pages' in pages and 'group: pages' in sync and 'cancel-in-progress: false' in pages and 'cancel-in-progress: false' in sync),
 ('both workflows deploy dist artifacts', pages.count('path: dist')>=1 and sync.count('path: dist')>=1),
 ('canonical URL instructions avoid /dist/', 'без `/dist/`' in guide),
 ('page deploy runs current official sync and strict production gate', 'run: npm run sync:official' in pages and all(token in official_sync for token in ('scripts/sync_kug_and_calendar.py','scripts/build_official_schedule.py','scripts/build_specialist_program_schedules.py','scripts/validate_production_release.py'))),
 ('normal deploy never silently reuses specialist last-good data', '--use-last-good' not in pages),
 ('scheduled sync checks all KUG and official hashes', 'run: npm run sync:official' in sync and 'data/kug-source-manifest.json' in sync and 'scripts/sync_kug_and_calendar.py' in official_sync and 'scripts/validate_production_release.py' in official_sync),
]
failed=[name for name,ok in checks if not ok]
print(f'CI CONSISTENCY CONTRACT: {len(checks)-len(failed)}/{len(checks)} passed')
for name in failed: print('FAILED: '+name)
if failed: raise SystemExit(1)
