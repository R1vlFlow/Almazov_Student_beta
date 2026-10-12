#!/usr/bin/env python3
"""Common provenance and academic-year diagnostics for official schedule sources."""
from __future__ import annotations
import hashlib
import re
from datetime import datetime, timezone

DATE_LABEL_RE = re.compile(r'(?<!\d)(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?!\d)')
YEAR_PAIR_RE = re.compile(r'(?<!\d)(20\d{2})\s*[/–-]\s*(20\d{2})(?!\d)')
LOCATION_NUMBER_MARKER_RE = re.compile(
    r'\\b(?:ауд(?:итория)?|каб(?:инет)?|корп(?:ус)?|лит(?:ера)?|зал)\\.?', re.I
)
SPECIALTY_CODE_RE = re.compile(
    r'(?:специальность|код\s+(?:направления|специальности))[^\d]{0,40}'
    r'\d{2}\.\d{2}\.\d{2}', re.I
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def academic_year_from_text(text: str) -> str | None:
    matches = YEAR_PAIR_RE.findall(text or '')
    for start, end in matches:
        if int(end) == int(start) + 1:
            return f'{start}/{end}'
    return None


def date_label_audit(text: str, academic_year_start: int = 2026) -> dict:
    """Detect dates printed inside tables without assuming they are authoritative."""
    text = text or ''
    # Educational specialty identifiers such as 31.05.01 are syntactically
    # indistinguishable from DD.MM.YY dates to DATE_LABEL_RE. Exclude these
    # only when the document explicitly labels the value as a specialty code.
    specialty_spans = [m.span() for m in SPECIALTY_CODE_RE.finditer(text)]
    years: list[int] = []
    labels: list[str] = []
    for m in DATE_LABEL_RE.finditer(text):
        if any(start <= m.start() and m.end() <= end for start, end in specialty_spans):
            continue
        # Room/address codes such as "ауд. 4.2.10" and "ауд. 3.30/3.31"
        # resemble dates to a numeric pattern but are not schedule dates.
        prefix = text[max(0, m.start() - 24):m.start()]
        markers = list(LOCATION_NUMBER_MARKER_RE.finditer(prefix))
        if markers and len(prefix) - markers[-1].end() <= 12:
            continue
        d, month, raw_year = int(m.group(1)), int(m.group(2)), m.group(3)
        year = int(raw_year)
        if len(raw_year) == 2:
            year += 2000
        if not (1 <= d <= 31 and 1 <= month <= 12):
            continue
        years.append(year)
        if len(labels) < 40:
            labels.append(m.group(0))
    unique_years = sorted(set(years))
    conflicts = [year for year in unique_years if year < academic_year_start or year > academic_year_start + 1]
    return {
        'embeddedDateYears': unique_years,
        'conflictingDateYears': conflicts,
        'sampleDateLabels': labels,
        'dateLabelCount': len(years),
    }


def source_provenance(data: bytes, text: str, url: str, *, checked_at: str | None = None) -> dict:
    checked_at = checked_at or datetime.now(timezone.utc).isoformat()
    return {
        'sha256': sha256_bytes(data),
        'contentBytes': len(data),
        'checkedAt': checked_at,
        'academicYearInDocument': academic_year_from_text(text),
        'dateLabelAudit': date_label_audit(text),
        'url': url,
    }


