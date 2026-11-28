"""Prepare on-demand web assets from the curator guide; never run during app startup."""
import argparse
import hashlib
import json
import io
from pathlib import Path

import fitz

SOURCE_SHA = '5507daa50508722ec9447c215f82cf7d64c4e56437062b0eaafef9ca8928a348'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path('public/assets/guides/first-year-2026-27'))
    args = parser.parse_args()
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != SOURCE_SHA:
        raise ValueError('Unexpected source PDF; review the new edition before rebuilding assets')
    args.output.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(args.source)
    if len(doc) != 71:
        raise ValueError('The reviewed edition contains 71 pages')
    links = sum(len(page.get_links()) for page in doc)
    for index, page in enumerate(doc):
        page.get_pixmap(matrix=fitz.Matrix(1200/page.rect.width, 1200/page.rect.width), alpha=False).pil_save(
            args.output / f'page-{index+1:02}.webp', format='WEBP', quality=86)
    doc[0].get_pixmap(matrix=fitz.Matrix(320/doc[0].rect.width, 320/doc[0].rect.width), alpha=False).pil_save(
        args.output/'cover.webp', format='WEBP', quality=84)
    for name, page_index, position in [('sunny',14,'top'),('imo',14,'bottom'),('school',15,'top'),('tower',15,'right'),('cdti',16,'top'),('nok',16,'bottom')]:
        page = doc[page_index]
        candidates = [(item[0], rect) for item in page.get_images(full=True) for rect in page.get_image_rects(item[0])]
        key = (lambda item: item[1].x0) if position == 'right' else (lambda item: item[1].y0)
        xref, _ = (min if position == 'top' else max)(candidates, key=key)
        image = fitz.Pixmap(doc, xref).pil_image()
        image.thumbnail((900, 900))
        image.save(args.output/f'{name}.webp', format='WEBP', quality=84)
    # The source contains malformed patterns, so avoid rebuilding page resources.
    # Replace only large image streams, retaining dimensions and soft masks.
    image_refs = {item[0] for page in doc for item in page.get_images(full=True) if item[2] >= 1000}
    recompressed = 0
    for xref in image_refs:
        image = fitz.Pixmap(doc, xref).pil_image().convert('RGB')
        encoded = io.BytesIO()
        image.save(encoded, format='JPEG', quality=84, optimize=True)
        payload = encoded.getvalue()
        if len(payload) >= len(doc.xref_stream_raw(xref)):
            continue
        doc.update_stream(xref, payload, compress=False)
        for key, value in [('Filter','/DCTDecode'),('ColorSpace','/DeviceRGB'),('BitsPerComponent','8'),('DecodeParms','null'),('Decode','null')]:
            doc.xref_set_key(xref, key, value)
        recompressed += 1
    doc.save(args.output/'guide.pdf', garbage=4, deflate=True)
    verified = fitz.open(args.output/'guide.pdf')
    if len(verified) != 71 or sum(len(p.get_links()) for p in verified) != links:
        raise ValueError('Page or link count changed')
    manifest = {'title':'Гайд первокурсника', 'edition':'2026/27', 'pages':71,
                'sourceSha256':SOURCE_SHA, 'sourceBytes':args.source.stat().st_size,
                'pdfBytes':(args.output/'guide.pdf').stat().st_size,
                'authors':['Евсюкова Эмилия','Коршунова Валентина','Телегина Алёна'],
                'organization':'Школа кураторов «PROсвет»', 'linksPreserved':links, 'photosRecompressed':recompressed}
    (args.output/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == '__main__':
    main()
