"""Extract review candidates from scanned thematic tables, never publish them.

Input: a PDF source manifest and matching *-N-ocr.{png,json} files. OCR JSON
contains lines/words with bounding boxes. Table ruling lines, not whitespace,
define cells. Only a separately reviewed catalogue may be bundled by the app.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageFilter


def clusters(values: list[int], gap: int = 3) -> list[int]:
    groups: list[list[int]] = []
    for value in values:
        if not groups or value > groups[-1][-1] + gap:
            groups.append([value])
        else:
            groups[-1].append(value)
    return [round(sum(group) / len(group)) for group in groups]


def grid_columns(image: Image.Image) -> list[int]:
    width, height = image.size
    run = max(150, round(height * .25))
    pattern = re.compile(b"\x00{" + str(run).encode() + b",}")
    return clusters([x for x in range(width) if pattern.search(image.crop((x, 50, x + 1, height - 35)).tobytes())])


def column_for(x: float, columns: list[int]) -> tuple[int, int] | None:
    for left, right in zip(columns, columns[1:]):
        if left + 3 < x < right - 3:
            return left, right
    return None


def cell_text(words: list[dict], bounds: tuple[int, int], top: int, bottom: int) -> str:
    left, right = bounds
    selected = [w for w in words if left + 2 < w['x'] + w['width'] / 2 < right - 2 and top + 2 < w['y'] + w['height'] / 2 < bottom - 2]
    selected.sort(key=lambda w: (round(w['y'] / 8), w['x']))
    return re.sub(r'\s+', ' ', ' '.join(w['text'] for w in selected)).strip()


def semester_markers(lines: list[dict]) -> list[tuple[float, int, int]]:
    markers = []
    for index, line in enumerate(lines):
        if not re.search(r'семес', line['text'], re.I):
            continue
        text = ' '.join(item['text'] for item in lines[max(0, index - 1):index + 2])
        text = text.replace('З', '3').replace('—', '-').replace('–', '-')
        # Restrict OCR numeral repair to the semester token, never topic prose.
        text = re.sub(r'(семес[тгрp]*\s*[-:]?\s*)[SＳ](?=\s|$)', r'\g<1>5', text, flags=re.I)
        text = re.sub(r'(семес[тгрp]*\s*[-:]?\s*)[бb](?=\s|$)', r'\g<1>6', text, flags=re.I)
        match = re.search(r'(?:Курс|К\s*с|(?<!\w)с(?=\s*-))\s*[-:]?\s*([1-6]).{0,20}?семес[тгрp]*\s*[-:]?\s*(1[012]|[1-9])(?=\D|$)', text, re.I)
        if match and line['words']:
            course, semester = int(match[1]), int(match[2])
            if (semester + 1) // 2 == course:
                markers.append((min(w['y'] for w in line['words']), course, semester))
    return markers


def extract_document(source: dict, directory: Path) -> dict:
    pages = sorted(directory.glob(source['id'] + '-*-ocr.json'), key=lambda p: int(p.stem.split('-')[-2]))
    kind = None
    course = semester = None
    columns_by_kind: dict[str, tuple[tuple[int, int], tuple[int, int], int]] = {}
    rows: list[dict] = []
    totals: list[dict] = []
    warnings: list[str] = []
    for path in pages:
        number = int(path.stem.split('-')[-2])
        ocr = json.loads(path.read_text(encoding='utf-8-sig'))
        lines = ocr['lines']
        words = [word for line in lines for word in line['words']]
        transitions = []
        for line_index, line in enumerate(lines):
            text = line['text'].lower()
            heading_context = ' '.join(item['text'].lower() for item in lines[max(0, line_index - 1):line_index + 3])
            heading_number = text.replace('з', '3').replace('ч', '4')
            y = min((w['y'] for w in line['words']), default=0)
            thematic = bool(re.search(r'темат|ематич', text))
            if (re.match(r'^\s*4[.,]\s*3\b', heading_number) and re.search(r'темат|лекц|план|заняти', heading_context)) or (thematic and 'лекцион' in heading_context):
                transitions.append((y, 'lecture'))
            elif (re.match(r'^\s*4[.,]\s*4\b', heading_number) and re.search(r'темат|семин|план|заняти', heading_context)) or (thematic and 'семина' in heading_context):
                transitions.append((y, 'practice'))
            elif re.match(r'^\s*(?:4[.,]5|5[.\s])', text) and re.search(r'самосто|метод|организа|обеспеч|фонд|оценоч', text):
                transitions.append((y, None))
        if not kind and not transitions:
            continue
        image_path = path.with_name(path.name.replace('-ocr.json', '-ocr.png'))
        if not image_path.exists():
            warnings.append(f'page {number}: image absent')
            continue
        image = Image.open(image_path).convert('L').point(lambda p: 0 if p < 220 else 255).filter(ImageFilter.MinFilter(3))
        columns = grid_columns(image)
        # Headers can be split over several OCR lines. Use the actual word's
        # position to select the enclosing ruled cell, independent of its width.
        title_headers = [w for w in words if re.match(r'наимен', w['text'], re.I)]
        hour_headers = [w for w in words if re.match(r'часы', w['text'], re.I)]
        markers = semester_markers(lines)
        active_kind = kind
        segments = [(0, active_kind)] + sorted(transitions)
        for seg_index, (top, active_kind) in enumerate(segments):
            bottom = segments[seg_index + 1][0] if seg_index + 1 < len(segments) else image.height - 20
            if not active_kind:
                continue
            header_title = next((w for w in title_headers if top <= w['y'] < bottom), None)
            header_hours = next((w for w in hour_headers if top <= w['y'] < bottom), None)
            title_col = column_for(header_title['x'] + header_title['width'] / 2, columns) if header_title else None
            hour_col = column_for(header_hours['x'] + header_hours['width'] / 2, columns) if header_hours else None
            if title_col and hour_col and title_col[1] <= hour_col[0] + 4:
                columns_by_kind[active_kind] = (title_col, hour_col, image.width)
            previous = columns_by_kind.get(active_kind)
            if not previous:
                warnings.append(f'page {number}: {active_kind} columns unresolved')
                continue
            title_col, hour_col, old_width = previous
            if old_width != image.width:
                ratio = image.width / old_width
                title_col = tuple(round(x * ratio) for x in title_col)
                hour_col = tuple(round(x * ratio) for x in hour_col)
            left, right = hour_col
            ruling = []
            for y in range(max(0, round(top)), min(image.height, round(bottom))):
                pixels = image.crop((left + 4, y, right - 4, y + 1)).tobytes()
                if pixels and pixels.count(0) / len(pixels) > .88:
                    ruling.append(y)
            edges = clusters(ruling)
            for y1, y2 in zip(edges, edges[1:]):
                if y2 - y1 < 16:
                    continue
                for marker_y, marker_course, marker_semester in markers:
                    if top <= marker_y < y1 + 12:
                        course, semester = marker_course, marker_semester
                title = cell_text(words, title_col, y1, y2)
                hours_text = cell_text(words, hour_col, y1, y2)
                if not title:
                    continue
                if re.search(r'всего|итого за|всегоза', title, re.I):
                    match = re.match(r'\s*(\d+)', hours_text)
                    if match:
                        totals.append({'type': active_kind, 'course': course, 'semester': semester, 'hours': int(match[1]), 'page': number})
                    continue
                if re.search(r'наимен|раздел|семестр|форма проведения|курс', title, re.I):
                    continue
                match = re.match(r'\s*([1-9]\d{0,2})(?=\s|[-–—.,чЧ]|$)', hours_text)
                if not match:
                    # A cell crossing a page boundary has no repeated hours.
                    if rows and rows[-1]['type'] == active_kind and y1 == edges[0] and not hours_text and len(title) > 8:
                        rows[-1]['title'] += ' ' + title
                        rows[-1]['pages'].append(number)
                    continue
                title = re.sub(r'^Тема\s*[\d.,\-– ]+\s*', '', title, flags=re.I).strip(' .')
                row_warnings = []
                if not course or not semester:
                    row_warnings.append('semester-unresolved')
                if re.search(r'название темы|наименование темы', title, re.I):
                    row_warnings.append('source-placeholder')
                if len(title) < 6:
                    row_warnings.append('short-title')
                rows.append({'type': active_kind, 'course': course, 'semester': semester, 'title': title, 'hours': int(match[1]), 'page': number, 'pages': [number], 'bounds': [*title_col, y1, y2], 'warnings': row_warnings})
        if transitions:
            kind = sorted(transitions)[-1][1]
    return {'schemaVersion': 1, 'review': 'candidate', 'source': source, 'rows': rows, 'totals': totals, 'warnings': sorted(set(warnings))}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--ocr-directory', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    sources = json.loads(args.manifest.read_text(encoding='utf-8'))
    result = [extract_document(source, args.ocr_directory) for source in sources if source.get('status') == 'downloaded']
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Candidate extraction: {len(result)} documents, {sum(len(r["rows"]) for r in result)} rows; publication disabled.')


if __name__ == '__main__':
    main()
