"""Source-shaped vector PDF regressions; no live website dependency."""
import sys
import unittest
from pathlib import Path

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from extract_digital_topic_plans import extract_theme_flow, hour_amount


class SourceHourCells(unittest.TestCase):
    def test_practical_subtotal_is_included_and_typographical_errors_are_not_silently_fixed(self):
        self.assertEqual(hour_amount('4, 2 из них на ПП'), 4)
        self.assertEqual(hour_amount('6 из них 2 часа на ПП'), 6)
        self.assertEqual(hour_amount('42'), 42)
        for value in ['2,5', '2.5', 'Итого 12', '', 'два', '6 из них на ПП **',
                      '30 из них на ПП **']:
            self.assertIsNone(hour_amount(value))


FONT = next((p for p in [Path('C:/Windows/Fonts/arial.ttf'),
                        Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
             if p.exists()), None)


@unittest.skipUnless(FONT, 'A Cyrillic font is required for the vector PDF fixture')
class DigitalThemeTables(unittest.TestCase):
    def page(self, doc):
        page = doc.new_page(width=800, height=650)
        page.insert_font(fontname='fixture', fontfile=str(FONT))
        return page

    def text(self, page, x, y, text):
        page.insert_text((x, y), text, fontname='fixture', fontsize=10)

    def grid(self, page, ys):
        for x in [40, 220, 300, 700]:
            page.draw_line((x, ys[0]), (x, ys[-1]))
        for y in ys:
            page.draw_line((40, y), (700, y))

    def header(self, page):
        self.text(page, 45, 116, 'Наименова ние темы занятия')
        self.text(page, 230, 116, 'Часы')

    def test_merged_hours_cross_page_continuation_and_fifth_practice_survive(self):
        doc = fitz.open()
        page = self.page(doc)
        self.text(page, 40, 30, '4.3 Тематический план занятий лекционного типа')
        self.text(page, 40, 65, 'Курс 1 семестр 1')
        self.grid(page, [100, 130, 300])
        self.header(page)
        page.draw_line((220, 215), (700, 215))
        self.text(page, 45, 155, 'Тема 1.1. Первая тема')
        self.text(page, 230, 155, '2')
        self.text(page, 230, 240, '2')
        page = self.page(doc)
        self.grid(page, [40, 100, 200, 230])
        self.text(page, 230, 65, '2')  # empty title cell continues the previous theme
        self.text(page, 45, 125, 'Тема 1.2. Вторая тема')
        self.text(page, 230, 125, '4')
        self.text(page, 45, 220, 'Итого')
        self.text(page, 230, 220, '10')
        page = self.page(doc)
        self.text(page, 40, 30, '4.4 Тематический план занятий семинарского типа')
        self.text(page, 40, 65, 'Курс 1 семестр 1')
        self.grid(page, [100, 130, 190, 250, 310, 370, 430, 460])
        self.header(page)
        for index in range(5):
            y = 155 + index * 60
            self.text(page, 45, y, f'Тема {index + 1}. Практическая тема')
            self.text(page, 230, y, '4 из них 2 часа на ПП*')
        self.text(page, 45, 450, 'Всего за семестр')
        self.text(page, 230, 450, '20')
        self.text(page, 40, 500, '4.5 Содержание внеаудиторной самостоятельной работы')
        self.grid(page, [520, 570])
        self.text(page, 45, 545, 'Тема 99. Самостоятельная работа')
        self.text(page, 230, 545, '100')
        # Reopen serialized bytes to exercise real PDF table detection.
        result = extract_theme_flow(fitz.open(stream=doc.tobytes(), filetype='pdf'),
                                    {'startPage': 1, 'endPage': 3})
        lectures = [r for r in result['rows'] if r['type'] == 'lecture']
        practices = [r for r in result['rows'] if r['type'] == 'practice']
        self.assertEqual([(r['title'], r['hours']) for r in lectures],
                         [('Первая тема', 6), ('Вторая тема', 4)])
        self.assertEqual(lectures[0]['endPage'], 2)
        self.assertEqual([r['hours'] for r in practices], [4] * 5)
        self.assertEqual([r['hours'] for r in result['totals']], [10, 20])
        self.assertTrue(all(r['semester'] == 1 for r in result['rows']))
        self.assertFalse(any('Самостоятельная' in r['title'] for r in result['rows']))

    def test_page_broken_preparation_subtotal_does_not_become_contact_hours(self):
        doc = fitz.open()
        page = self.page(doc)
        self.text(page, 40, 30, '4.4 Тематический план занятий семинарского типа')
        self.text(page, 40, 65, 'Курс 2 семестр 4')
        self.grid(page, [100, 130, 250])
        self.header(page)
        self.text(page, 45, 155, 'Тема 1. Первая тема')
        self.text(page, 230, 155, '8')
        page = self.page(doc)
        self.grid(page, [40, 100, 200, 290])
        self.text(page, 230, 65, '6 из них на ПП **')
        self.text(page, 45, 125, 'Тема 2. Вторая тема')
        self.text(page, 230, 125, '4')
        self.text(page, 45, 220, 'Всего за семестр')
        self.text(page, 230, 220, '12')
        page.draw_line((220, 240), (300, 240))
        self.text(page, 230, 265, '6 из них на ПП **')
        result = extract_theme_flow(fitz.open(stream=doc.tobytes(), filetype='pdf'),
                                    {'startPage': 1, 'endPage': 2})
        self.assertEqual([r['hours'] for r in result['rows']], [8, 4])
        self.assertEqual([r['hours'] for r in result['totals']], [12])


if __name__ == '__main__':
    unittest.main()
