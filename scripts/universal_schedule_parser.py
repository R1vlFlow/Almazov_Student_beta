#!/usr/bin/env python3
"""Universal, layout-adaptive schedule parser orchestrator.

The parser does not contain course-specific layouts.  It observes a PDF and
builds a structural fingerprint first: course/stream hints, group headers,
academic-week headers, weekday/time signals, vector grid density and table
signals.  It then chooses the least-assumptive parsing strategy and preserves
uncertainty instead of inventing missing weekdays.

The low-level extractors live in build_official_schedule.py for backwards
compatibility.  This module is deliberately the *orchestrator*: future PDF
layouts can be handled by adding another layout detector/extractor without
adding a new branch such as `if course == 5`.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path


DAY_WORDS = {
    'пн','вт','ср','чт','пт','сб','вс',
    'понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'
}
CLOCK_RE = re.compile(r'(?<!\d)\d{1,2}\s*[:.]\s*\d{2}\s*[-–—]\s*\d{1,2}\s*[:.]\s*\d{2}(?!\d)')
GROUP_RE = re.compile(r'(?<!\d)(\d{3}(?:КП|П|KP|P)?)(?![\w])', re.I)
WEEK_RE = re.compile(r'(?<!\d)(?:[1-9]|[1-4]\d|5[0-2])(?!\d)')
DATE_RE = re.compile(r'(?<!\d)\d{1,2}\.\d{1,2}\.\d{4}(?!\d)')



def _log_parser_event(level, event, source_url='', course=None, stream=None, **details):
    """Emit one compact JSON diagnostic per parser decision to stderr."""
    record = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'component': 'universal_schedule_parser',
        'level': level,
        'event': event,
        'sourceUrl': str(source_url or ''),
        'course': course,
        'stream': stream,
        **details,
    }
    print(json.dumps(record, ensure_ascii=False, default=str), file=sys.stderr, flush=True)


@dataclass
class LayoutProfile:
    course: int | None
    stream: str | None
    kind: str | None
    groups: list[str]
    week_labels: list[int]
    weekday_count: int
    clock_count: int
    vector_score: float
    grid_score: float
    layout: str
    confidence: float
    reasons: list[str]

    def to_dict(self):
        return asdict(self)


class UniversalScheduleParser:
    """Adaptive parser facade.

    `legacy` is the already-tested build module.  The universal layer decides
    *which* extractor is appropriate from observed structure; it never selects
    an extractor because of a hard-coded course number.
    """

    def __init__(self, legacy_module):
        self.m = legacy_module

    @staticmethod
    def _doc_from_bytes(raw):
        import fitz
        return fitz.open(stream=raw, filetype='pdf')

    @staticmethod
    def _raw_bytes(source):
        if isinstance(source, (bytes, bytearray)):
            return bytes(source)
        if hasattr(source, 'tobytes'):
            try:
                return bytes(source.tobytes())
            except Exception:
                pass
        return None

    def _text_words(self, source):
        raw = self._raw_bytes(source)
        if raw is not None:
            doc = self._doc_from_bytes(raw)
            close = True
        else:
            doc = source
            close = False
        texts=[]; words=[]; drawings=[]
        try:
            for page in doc:
                texts.append(page.get_text('text') or '')
                try:
                    words.extend(page.get_text('words') or [])
                except Exception:
                    pass
                try:
                    drawings.extend(page.get_drawings() or [])
                except Exception:
                    pass
        finally:
            if close:
                doc.close()
        return '\n'.join(texts), words, drawings

    @staticmethod
    def _infer_course(text, url=''):
        url = url or ''
        candidates=[]
        for m in re.finditer(r'(?<!\d)(\d{1,2})\s*курс', text, re.I):
            candidates.append(int(m.group(1)))
        if candidates:
            return Counter(candidates).most_common(1)[0][0]
        m=re.search(r'(?<!\d)(\d{1,2})k(?:[_\-.]|$)', url or '', re.I)
        return int(m.group(1)) if m else None

    @staticmethod
    def _infer_stream(text, url=''):
        url = url or ''
        # Titles/header lines must win over legacy filenames. Only inspect the
        # leading region for the primary designation, as tables can mention
        # both streams in cross-reference text further down the document.
        head=(text or '')[:5000]
        m=re.search(r'(?im)^.{0,80}?поток\s*([АAБB])(?=\W|$)',head)
        if m:
            return 'A' if m.group(1).upper() in ('А','A') else 'B'
        m=re.search(r'поток\s*([АAБB])(?=\W|$)',head,re.I)
        if m:
            return 'A' if m.group(1).upper() in ('А','A') else 'B'
        m=re.search(r'[_-]([ab])(?:[_\-.]|$)', url, re.I)
        return m.group(1).upper() if m else None

    @staticmethod
    def _infer_kind(text, url=''):
        url = url or ''
        head=(text or '')[:1800].lower()
        source=(url or '').lower()
        if 'занятий семинарского типа' in head or 'практическ' in head[:600] or 'семинар' in source or 'prakt' in source:
            return 'practice'
        if 'занятий лекционного типа' in head or 'лекц' in head[:600] or 'raspisanielekczij' in source or 'lecture' in source:
            return 'lecture'
        return None

    @staticmethod
    def _group_candidates(words, course):
        vals=[]
        for w in words:
            if len(w)<5: continue
            t=str(w[4]).strip()
            if not GROUP_RE.fullmatch(t): continue
            n=int(t[:3])
            # If course is known, use it only as semantic disambiguation, not as
            # a layout selector. This prevents room numbers from becoming groups.
            if course is not None and n//100 != int(course): continue
            vals.append((t,float(w[0]),float(w[1]),float(w[2]),float(w[3])))
        return sorted(set(x[0] for x in vals), key=lambda value: (int(value[:3]), value[3:].casefold()))

    @staticmethod
    def _numeric_week_bands(words):
        nums=[]
        for w in words:
            t=str(w[4]).strip()
            if re.fullmatch(r'(?:[1-9]|[1-4]\d|5[0-2])',t):
                nums.append((int(t),float(w[0]),float(w[1]),float(w[2]),float(w[3])))
        by_y={}
        for n,x0,y0,x1,y1 in nums:
            key=round(((y0+y1)/2)/5)*5
            by_y.setdefault(key,[]).append((n,(x0+x1)/2))
        candidates=[]
        for arr in by_y.values():
            d={n:x for n,x in arr}
            if len(d)>=8:
                candidates.append(d)
        return max(candidates,key=len) if candidates else {}

    @staticmethod
    def _vector_score(drawings):
        if not drawings: return 0.0
        lines=rects=0
        for d in drawings:
            for item in d.get('items',[]):
                if item[0]=='l': lines+=1
                elif item[0]=='re': rects+=1
        return min(1.0,(lines+rects*4)/120.0)

    def analyze(self, source, url='', hinted_course=None, hinted_stream=None, hinted_kind=None):
        text,words,drawings=self._text_words(source)
        course=self._infer_course(text,url) or hinted_course
        stream=self._infer_stream(text,url) or hinted_stream
        # An explicit caller hint comes from the official source registry and
        # outranks words inside lesson cells (where "лекция" may be one cell).
        kind=hinted_kind or self._infer_kind(text,url)
        groups=self._group_candidates(words,course)
        week_map=self._numeric_week_bands(words)
        text_low=text.lower()
        weekday_count=sum(1 for token in re.findall(r'(?<![а-яёa-z])[а-яёa-z]+',text_low) if token in DAY_WORDS)
        clock_text=re.sub(r'(?<=\d)[ʼ′\u02bc\'](?=\d)',':',text)
        clock_count=len(CLOCK_RE.findall(clock_text))
        date_count=len(DATE_RE.findall(text))
        vector=self._vector_score(drawings)
        week_score=min(1.0,len(week_map)/15.0)
        day_score=min(1.0,weekday_count/5.0)
        group_score=min(1.0,len(groups)/8.0)
        grid_score=min(1.0,0.45*week_score+0.35*group_score+0.20*vector)
        reasons=[]
        if len(groups)>=2: reasons.append(f'{len(groups)} group labels detected')
        if len(week_map)>=8: reasons.append(f'{len(week_map)} academic-week labels detected')
        if weekday_count: reasons.append(f'{weekday_count} weekday labels detected')
        if clock_count: reasons.append(f'{clock_count} clock ranges detected')
        if vector>=0.35: reasons.append('vector grid/merged-cell geometry detected')
        if date_count>=4 and clock_count>=2 and vector>=0.25:
            layout='dated-grid'
            confidence=min(0.97,0.72+min(date_count/40,0.15)+min(vector*0.1,0.1))
            reasons.append(f'{date_count} dated rows and {clock_count} lesson times detected')
            reasons.append('date-row timetable selected from positioned text and grid geometry')
        elif grid_score>=0.58 and len(week_map)>=8:
            layout='weekly-matrix'
            confidence=min(0.99,0.55+0.35*week_score+0.10*group_score)
            reasons.append('matrix layout selected without course-specific rule')
        elif weekday_count and clock_count and len(groups)>=2:
            layout='daily-grid'
            confidence=min(0.97,0.55+0.25*day_score+0.20*group_score)
            reasons.append('day/time grid layout selected from document geometry')
        elif weekday_count and clock_count:
            layout='daily-list'
            confidence=0.78
            reasons.append('day/time list layout selected')
        else:
            layout='unknown'
            confidence=0.35
            reasons.append('insufficient structural signals; fallback chain will run')
        return LayoutProfile(course,stream,kind,groups,sorted(week_map),weekday_count,clock_count,vector,grid_score,layout,confidence,reasons)

    @staticmethod
    def _practice_event_issues(events, profile):
        """Return actionable reasons a candidate must not be imported."""
        issues = []
        if not events:
            return ['no_events']
        expected = set(profile.groups)
        groups = set()
        for event in events:
            candidate_group = str(event.get('group', '')).strip()
            if not re.fullmatch(r'\d{3}(?:КП|П|KP|P)?', candidate_group, re.I):
                continue
            if candidate_group in expected:
                groups.add(candidate_group)
                continue
            # Some PDF table extractors split a Cyrillic suffix into a
            # separate cell and emit a numeric-only group. Treat it as the
            # expected suffixed group only when that mapping is unambiguous;
            # the downstream specialist normalizer writes the canonical ID.
            aliases = [group for group in expected if group.startswith(candidate_group)
                       and group[len(candidate_group):].casefold() in {'п', 'кп', 'p', 'kp'}]
            groups.add(aliases[0] if len(aliases) == 1 else candidate_group)
        missing = sorted(expected - groups)
        if missing:
            issues.append('missing_groups:' + ','.join(missing[:30]))
        if profile.layout == 'weekly-matrix':
            if any(e.get('weekday') is not None for e in events):
                issues.append('matrix_contains_invented_weekday')
            if any(e.get('scheduleMode') != 'weekly-block' for e in events):
                issues.append('matrix_rows_not_marked_weekly_block')
        if profile.layout == 'dated-grid':
            for index, event in enumerate(events):
                date_value=str(event.get('date') or '')
                try:
                    parsed_date=datetime.strptime(date_value,'%Y-%m-%d').date()
                except ValueError:
                    issues.append(f'missing_or_invalid_date:event_{index}')
                    break
                if event.get('weekday') != parsed_date.weekday():
                    issues.append(f'date_weekday_mismatch:event_{index}')
                    break
                if event.get('scheduleMode') != 'dated':
                    issues.append(f'dated_row_without_date_mode:event_{index}')
                    break
        for index, event in enumerate(events):
            subject = str(event.get('subject') or '').strip()
            if not subject or not event.get('start') or not event.get('end'):
                issues.append(f'missing_required_field:event_{index}')
                break
            if any(marker in subject for marker in ('█', '�')) or re.search(r'(^|\s)I{3,}(?=\s|$)', subject):
                issues.append(f'garbled_subject:event_{index}')
                break
        return issues

    @classmethod
    def _acceptable_practice_events(cls, events, profile):
        """Reject structurally partial output before accepting it."""
        return not cls._practice_event_issues(events, profile)

    def _checked_candidate(self, candidate, profile, parser_name, url, course, stream, attempts):
        issues = self._practice_event_issues(candidate, profile)
        group_ids = sorted({str(e.get('group')) for e in candidate if e.get('group')})
        accepted = not issues
        attempts.append({'parser': parser_name, 'accepted': accepted, 'events': len(candidate or []), 'issues': issues})
        _log_parser_event('info' if accepted else 'warning', 'practice_parser_candidate', url, course, stream,
                          parser=parser_name, accepted=accepted, eventCount=len(candidate or []),
                          groupCount=len(group_ids), groups=group_ids[:30], issueCodes=issues[:20])
        return candidate if accepted else []

    def parse_practice(self, source, course, url, stream):
        profile = self.analyze(source, url, course, stream, 'practice')
        raw = self._raw_bytes(source)
        events = []
        attempts = []

        def extract_raw(parser_name, fn):
            try:
                candidate = fn() or []
                _log_parser_event('info' if candidate else 'warning', 'practice_extractor_result', url, course, stream,
                                  parser=parser_name, eventCount=len(candidate),
                                  candidateIssues=self._practice_event_issues(candidate, profile)[:12])
                attempts.append({'parser': parser_name, 'rawEvents': len(candidate), 'extractorError': None})
                return candidate
            except Exception as error:
                _log_parser_event('warning', 'practice_extractor_failed', url, course, stream,
                                  parser=parser_name, errorType=type(error).__name__, error=str(error)[:350])
                attempts.append({'parser': parser_name, 'rawEvents': 0, 'extractorError': type(error).__name__})
                return []

        def extract(parser_name, fn):
            candidate = extract_raw(parser_name, fn)
            return self._checked_candidate(candidate, profile, parser_name, url, course, stream, attempts)

        if profile.layout == 'weekly-matrix' and raw is not None:
            # Actual cell boundaries are authoritative. Unioning their output
            # with guessed row bands silently adds neighbouring subjects.
            events = extract('pdfplumber-merged-cell-matrix', lambda: self.m.parse_week_matrix_pdfplumber_cells(raw, course, url, stream))
            if not events:
                events = extract('pymupdf-coordinate-matrix', lambda: self.m.parse_week_matrix_coordinate(raw, course, url, stream))
            if not events:
                events = extract('week-matrix-text-fallback', lambda: self.m.parse_week_matrix_text_fallback(raw, course, url, stream))
            if not events:
                events = extract('week-matrix-table-fallback', lambda: self.m.parse_week_matrix_tables(raw, course, url, stream))

        if not events and profile.layout == 'dated-grid' and raw is not None:
            events = extract('pdf-dated-grid-geometry', lambda: self.m.parse_dated_grid_pdf(raw, course, url, stream))

        # Daily grid PDFs can use a separate table engine. The whole candidate is
        # still validated against the detected roster before it can be imported.
        if not events and raw is not None:
            events = extract('pdfplumber-daily-grid', lambda: self.m.parse_practice_with_pdfplumber(raw, course, url, stream))
        if not events and raw is not None:
            events = extract('pdfplumber-text-grid', lambda: self.m.parse_practice_with_pdfplumber(raw, course, url, stream, 'text'))

        # Compatibility fallback for older daily tables and newly encountered layouts.
        if not events:
            try:
                if raw is not None:
                    doc = self._doc_from_bytes(raw)
                    legacy = []
                    try:
                        for page in doc:
                            self.m._add_practice_events_from_table(legacy, page, course, url, stream)
                        if len(legacy) < 3:
                            for page in doc:
                                self.m._add_practice_events_from_words_fallback(legacy, page, course, url, stream)
                    finally:
                        doc.close()
                else:
                    legacy = []
                    for page in source:
                        self.m._add_practice_events_from_table(legacy, page, course, url, stream)
                    if len(legacy) < 3:
                        for page in source:
                            self.m._add_practice_events_from_words_fallback(legacy, page, course, url, stream)
                events = self._checked_candidate(legacy, profile, 'legacy-daily-table-fallback', url, course, stream, attempts)
            except Exception as error:
                _log_parser_event('warning', 'practice_extractor_failed', url, course, stream,
                                  parser='legacy-daily-table-fallback', errorType=type(error).__name__, error=str(error)[:350])
                attempts.append({'parser': 'legacy-daily-table-fallback', 'accepted': False, 'events': 0, 'issues': ['extractor_exception']})
                events = []

        if profile.layout == 'weekly-matrix':
            bad_any = any(
                (not str(e.get('subject', '')).strip())
                or '█' in str(e.get('subject', ''))
                or '�' in str(e.get('subject', ''))
                or bool(re.fullmatch(r'[I0-9, .-]+', str(e.get('subject', '')).strip()))
                for e in events
            )
            if bad_any:
                _log_parser_event('error', 'practice_matrix_rejected_as_garbled', url, course, stream,
                                  eventCount=len(events), layout=profile.layout)
                events = []

        # Attach provenance; the frontend may ignore it while QA and data audits
        # retain the structural decision and confidence for diagnosis.
        for event in events:
            event.setdefault('parser', 'universal-schedule-parser-v1')
            event['layoutProfile'] = profile.layout
            event['parseConfidence'] = round(profile.confidence, 3)

        parsed_groups = sorted({str(e.get('group')) for e in events if e.get('group')})
        expected_groups = sorted(set(profile.groups))
        missing_groups = sorted(set(expected_groups) - set(parsed_groups))
        _log_parser_event('info' if events and not missing_groups else 'error', 'practice_parse_complete', url, course, stream,
                          layout=profile.layout, confidence=round(profile.confidence, 3), eventCount=len(events),
                          groupCount=len(parsed_groups), expectedGroupCount=len(expected_groups),
                          parsedGroups=parsed_groups[:40], missingGroups=missing_groups[:40], attempts=attempts)
        return events, profile

        # Attach a machine-readable provenance marker to every event. The UI can
        # ignore it; diagnostics and future parsers can use it.
        for e in events:
            e.setdefault('parser','universal-schedule-parser-v1')
            e['layoutProfile']=profile.layout
            e['parseConfidence']=round(profile.confidence,3)
        return events,profile


