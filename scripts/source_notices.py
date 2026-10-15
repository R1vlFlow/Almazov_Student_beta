"""Source ambiguities are bounded to reviewed bytes; changed PDFs require review."""
import json
from pathlib import Path

def apply_source_notices(data, root):
    path=Path(root)/'data/official-source-notices.json'
    notices=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    used=[]
    for course,rows in data.get('courses',{}).items():
        hashes={s.get('url'):s.get('sha256') for s in rows.get('sources',[])}
        for event in rows.get('events',[]):
            event.pop('sourceNotice',None)
            event.pop('sourceNoticeId',None)
            for notice in notices:
                if (course==notice['course'] and str(event.get('group'))==notice['group']
                    and event.get('date')==notice['date'] and event.get('sourceUrl')==notice['sourceUrl']
                    and hashes.get(notice['sourceUrl'])==notice['sha256']
                    and event.get('subject') in notice['subjects']
                    and notice['start']<=event.get('start','')<event.get('end','')<=notice['end']):
                    event['sourceNotice']=notice['message']
                    event['sourceNoticeId']=notice['id']
                    if notice not in used:used.append(notice)
    return used
