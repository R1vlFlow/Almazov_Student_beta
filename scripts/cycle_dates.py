"""Resolve teaching days from matrix subcolumns, never from pixel proportions."""
import datetime as dt
import re


def describe_week_cells(table, bands):
    rows = table.extract()
    labels = {}
    for ri, row in enumerate(rows):
        if str((row or [''])[0] or '').strip().casefold() != 'даты':
            continue
        for ci, value in enumerate(row):
            cell = table.rows[ri].cells[ci]
            if not cell or not value:
                continue
            for week, (left, right) in bands.items():
                if abs(cell[0]-left) < .8 and abs(cell[2]-right) < .8:
                    labels[week] = str(value)
    edges = sorted({float(x) for cell in table.cells for x in (cell[0], cell[2])})
    return {week: {'edges': [a]+[x for x in edges if a+.8 < x < b-.8]+[b],
                   'label': labels.get(week, '')} for week, (a, b) in bands.items()}


def cell_week_span(cell, descriptor):
    edges = descriptor['edges']
    slots = [i for i, (a, b) in enumerate(zip(edges, edges[1:]))
             if min(cell[2], b)-max(cell[0], a) > .8]
    return {'matrixWeekSlots': slots, 'matrixWeekSlotCount': len(edges)-1,
            'matrixDateLabel': descriptor['label']}


def resolve_cycle_dates(event, week):
    """Known weekly teaching grid: whole week or two Mon-Wed/Thu-Sat cells.

    Unequal physical column widths carry no time meaning. Unknown subdivisions
    remain unresolved. Date-label years can be stale; day/month must agree with
    the authoritative academic calendar before any dates are emitted.
    """
    event['cycleDates'] = []
    event['cycleDateStatus'] = 'unresolved'
    count = event.get('matrixWeekSlotCount')
    slots = event.get('matrixWeekSlots')
    if count not in (1, 2) or not isinstance(slots, list) or not slots:
        return
    if any(type(i) is not int or i < 0 or i >= count for i in slots):
        return
    first, last = dt.date.fromisoformat(week['from']), dt.date.fromisoformat(week['to'])
    monday = first-dt.timedelta(days=first.weekday())
    label = event.get('matrixDateLabel', '')
    bounds = re.findall(r'(\d{1,2})\.(\d{1,2})\.(?:\d{4}|\d{2})(?!\d)', label)
    if not bounds:
        return
    source_dates = []
    for day, month in bounds[:2]:
        candidates = [first+dt.timedelta(days=i) for i in range((last-first).days+1)]
        match = next((d for d in candidates if d.day == int(day) and d.month == int(month)), None)
        if match is None:
            return
        source_dates.append(match)
    start, end = source_dates[0], source_dates[-1] if len(source_dates)>1 else last
    holidays = {(int(d), int(m)) for d, m in re.findall(
        r'(\d{1,2})\.(\d{1,2})(?:\.\d{2,4})?\s*\(?\s*выходн', label, re.I)}
    for i in range((last-first).days+1):
        date = first+dt.timedelta(days=i)
        weekday = (date-monday).days
        slot = weekday//3 if count == 2 else 0
        if weekday < 6 and slot in slots and start <= date <= end and (date.day,date.month) not in holidays:
            event['cycleDates'].append(date.isoformat())
    event['cycleDateStatus'] = 'matrix-subcolumns'
    event['cycleDateBasis'] = 'source-date-labels + official-calendar + ordered-half-week-cells'


def validate_cycle_assignments(events, weeks):
    errors=[]; occupied={}
    for event in events:
        if event.get('scheduleMode')!='weekly-block':
            continue
        week=weeks.get(event.get('calendarWeekNumber',event.get('weekNumber')))
        expected=dict(event)
        if week:
            resolve_cycle_dates(expected,week)
        if not week or expected.get('cycleDateStatus')!='matrix-subcolumns' or not expected.get('cycleDates'):
            errors.append(f"unresolved cycle dates: {event.get('group')} week {event.get('weekNumber')}")
            continue
        if event.get('cycleDates')!=expected['cycleDates'] or event.get('cycleDateStatus')!='matrix-subcolumns':
            errors.append(f"cycle dates differ from matrix: {event.get('group')} week {event.get('weekNumber')}")
        for date in expected['cycleDates']:
            key=(event.get('group'),date)
            previous=occupied.setdefault(key,[])
            if any(event.get('start','')<other.get('end','') and other.get('start','')<event.get('end','') for other in previous):
                errors.append(f"overlapping practice cycles: {key[0]} {date}")
            previous.append(event)
    return errors
