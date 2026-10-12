#!/usr/bin/env python3
"""Verify the current scheduled sync pipeline and its delegated contracts."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
WF = ROOT / '.github' / 'workflows' / 'sync-official-schedules.yml'
if not WF.exists():
    raise SystemExit('WORKFLOW CONTRACT FAILED: canonical workflow is missing')
text = WF.read_text(encoding='utf-8')
package = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
scripts = package.get('scripts', {})
official_sync = scripts.get('sync:official', '')
qa = scripts.get('qa', '')

required_workflow = [
    'workflow_dispatch:', 'schedule:', 'permissions:', 'contents: write',
    'run: npm run sync:official', 'run: npm run qa',
    'actions/upload-pages-artifact@v3', 'actions/deploy-pages@v4',
    'official-schedule-sync-', 'if: always()', 'actions/upload-artifact@v4',
    'reports/live-sync-attempt-latest.json', 'reports/production-release-audit.json',
    'git add data reports', 'git push'
]
for needle in required_workflow:
    if needle not in text:
        raise SystemExit(f'WORKFLOW CONTRACT FAILED: missing {needle!r}')

required_sync = [
    'scripts/sync_kug_and_calendar.py',
    'scripts/build_official_schedule.py',
    'scripts/build_specialist_program_schedules.py',
    'scripts/validate_production_release.py'
]
for needle in required_sync:
    if needle not in official_sync:
        raise SystemExit(f'WORKFLOW CONTRACT FAILED: official sync script missing {needle!r}')

required_qa = [
    'scripts/validate_generated_index.py',
    'scripts/validate_schedule_data.py',
    'scripts/verify_workflow_contract.py'
]
for needle in required_qa:
    if needle not in qa:
        raise SystemExit(f'WORKFLOW CONTRACT FAILED: QA script missing {needle!r}')

if 'git push || true' in text:
    raise SystemExit('WORKFLOW CONTRACT FAILED: sync workflow must not hide failure to persist official data')
if text.index('git push') > text.index('actions/upload-pages-artifact@v3'):
    raise SystemExit('WORKFLOW CONTRACT FAILED: official data must be persisted before an artifact is deployed')
print('WORKFLOW CONTRACT: OK')
