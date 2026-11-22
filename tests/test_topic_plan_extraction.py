import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from extract_topic_plans import extract_document, semester_markers


def line(text, x, y):
    return {'text': text, 'words': [{'text': text, 'x': x, 'y': y, 'width': min(220, len(text) * 8), 'height': 18}]}


class TopicTableExtraction(unittest.TestCase):
    def page(self, directory, number, heading, titles):
        image = Image.new('RGB', (1000, 900), 'white')
        draw = ImageDraw.Draw(image)
        for x in [30, 70, 400, 470, 950]:
            draw.line((x, 50, x, 800), fill='#b0b0b0', width=2)
        for y in [50, 150, 190, 220, 350, 500, 650, 800]:
            draw.line((30, y, 950, y), fill='#b0b0b0', width=2)
        lines = [line(heading, 30, 20), line('Наименование темы', 140, 80), line('Часы', 415, 80), line('Курс 2 семестр 3', 100, 165)]
        for title, hours, y in titles:
            lines.extend([line(title, 100, y), line(str(hours) + ' часа', 415, y)])
        lines.extend([line('Всего за семестр', 100, 700), line('6', 420, 700)])
        image.save(directory / f'fixture-{number}-ocr.png')
        (directory / f'fixture-{number}-ocr.json').write_text(json.dumps({'lines': lines, 'text': ' '.join(item['text'] for item in lines)}), encoding='utf-8')

    def test_ruled_cells_and_semantic_headers_survive_nonstandard_section_number(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            self.page(directory, 1, '4.3 Тематический план занятий лекционного типа', [('Первая тема', 2, 250), ('Вторая тема', 4, 390)])
            self.page(directory, 2, '1.4 Тематический план занятий семинарского типа', [('Практическая тема', 2, 250), ('Следующая практика', 4, 390)])
            result = extract_document({'id': 'fixture'}, directory)
            self.assertEqual(result['review'], 'candidate')
            self.assertEqual([(r['type'], r['title'], r['hours'], r['course'], r['semester']) for r in result['rows']], [('lecture', 'Первая тема', 2, 2, 3), ('lecture', 'Вторая тема', 4, 2, 3), ('practice', 'Практическая тема', 2, 2, 3), ('practice', 'Следующая практика', 4, 2, 3)])
            self.assertEqual([total['hours'] for total in result['totals']], [6, 6])

    def test_unresolved_semester_and_source_placeholder_require_review(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            self.page(directory, 1, '4.3 Тематический план занятий лекционного типа', [('Название темы', 2, 250), ('Другая тема', 4, 390)])
            path = directory / 'fixture-1-ocr.json'
            data = json.loads(path.read_text(encoding='utf-8'))
            data['lines'] = [row for row in data['lines'] if 'семестр' not in row['text'] or 'Всего' in row['text']]
            path.write_text(json.dumps(data), encoding='utf-8')
            result = extract_document({'id': 'fixture'}, directory)
            self.assertIn('semester-unresolved', result['rows'][0]['warnings'])
            self.assertIn('source-placeholder', result['rows'][0]['warnings'])

    def test_inconsistent_course_and_semester_are_never_inferred_from_ocr(self):
        self.assertEqual(semester_markers([line('Курс 5 семестр 1', 30, 100)]), [])
        self.assertTrue(semester_markers([line('Курс 5 семестр 10', 30, 100)]))

    def test_scanned_third_course_headers_do_not_lose_the_semester_boundary(self):
        for text, expected in [('Курс- З семестр - S', (3, 5)), ('с- З семест - б', (3, 6)), ('Курс-2 семестр-4', (2, 4))]:
            self.assertEqual(semester_markers([line(text, 30, 100)])[0][1:], expected)
        self.assertEqual(semester_markers([line('Курс 3 семестр 15', 30, 100)]), [])


if __name__ == '__main__':
    unittest.main()
