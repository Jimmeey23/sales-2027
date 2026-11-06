#!/usr/bin/env python3
"""Extract the 2027 pack's Insights + Targets-summary documents and target workbooks into JSON.

    python3 scripts/pack-insights-to-json.py [pack-folder]

Writes server/data/pack-2027/insights.json (served by GET /api/pack-insights) and
server/data/pack-2027/history.json (prior-year/target figures per studio from the xlsx).
Reads the .docx XML directly (no textutil needed) and the 'Monthly Targets' sheets.
"""
import json, re, sys, zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
import openpyxl

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
STUDIOS = {'Kemps_Corner': 'Kemps Corner', 'Bandra': 'Bandra', 'Kenkere_House': 'Kenkere House', 'Pop-ups': 'Pop-up'}
pack = Path(sys.argv[1] if len(sys.argv) > 1 else '/Users/jimmeeygondaa/Downloads/P57_2027_Sales_Plan_Pack (2)')
out_dir = Path(__file__).resolve().parent.parent / 'server' / 'data' / 'pack-2027'


def runs(p):
    res = []
    for r in p.iter(W + 'r'):
        t = ''.join(x.text or '' for x in r.iter(W + 't'))
        if not t:
            continue
        b = r.find(f'{W}rPr/{W}b')
        bold = b is not None and b.get(W + 'val') not in ('false', '0')
        res.append((t, bold))
    return res


def para(p):
    rs = runs(p)
    text = ''.join(t for t, _ in rs).strip()
    lead = None
    if rs and rs[0][1] and len(rs) > 1 and not all(b for _, b in rs):
        k = 0
        while k < len(rs) and rs[k][1]:
            k += 1
        lead = ''.join(t for t, _ in rs[:k]).strip()
        text = ''.join(t for t, _ in rs[k:]).strip()
    return text, lead


def parse_docx(path):
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    body = root.find(W + 'body')
    blocks = []
    for el in body:
        if el.tag == W + 'p':
            style = el.find(f'{W}pPr/{W}pStyle')
            style = style.get(W + 'val') if style is not None else ''
            text, lead = para(el)
            if not text and not lead:
                continue
            if style == 'Title':
                blocks.append({'t': 'title', 'text': (lead or '') + text})
            elif style in ('Heading1', 'Heading2', 'Heading3'):
                blocks.append({'t': 'h' + style[-1], 'text': (lead or '') + text})
            elif el.find(f'{W}pPr/{W}numPr') is not None or style == 'ListParagraph':
                blocks.append({'t': 'li', 'lead': lead, 'text': text})
            elif el.find(f'{W}pPr/{W}shd') is not None:
                blocks.append({'t': 'callout', 'lead': lead, 'text': text})
            else:
                blocks.append({'t': 'p', 'lead': lead, 'text': text})
        elif el.tag == W + 'tbl':
            rows = []
            for tr in el.findall(W + 'tr'):
                rows.append([' '.join(para(p)[1:] and [(para(p)[1] or '') + ' ' + para(p)[0]] or [para(p)[0]]).strip()
                             for tc in tr.findall(W + 'tc') for p in tc.findall(W + 'p')[:1]]
                            if False else [' '.join(filter(None, [(lambda x: (x[1] or '') + (' ' if x[1] and x[0] else '') + x[0])(para(p)) for p in tc.findall(W + 'p')])).strip()
                                           for tc in tr.findall(W + 'tc')])
            if rows:
                blocks.append({'t': 'table', 'head': rows[0], 'rows': rows[1:]})
    return blocks


def sections(blocks):
    """Group blocks into {title, subtitle, summary, sections:[{title, blocks}]}."""
    doc = {'title': '', 'subtitle': '', 'intro': [], 'sections': []}
    cur = None
    for b in blocks:
        if b['t'] == 'title':
            doc['title'] = b['text']
        elif b['t'] == 'h1':
            cur = {'title': b['text'], 'blocks': []}
            doc['sections'].append(cur)
        elif cur is None:
            if b['t'] == 'p' and not doc['subtitle']:
                doc['subtitle'] = b['text']
            else:
                doc['intro'].append(b)
        else:
            cur['blocks'].append(b)
    return doc


def xlsx_sheets(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    res = {}
    for ws in wb.worksheets:
        rows = []
        for r in ws.iter_rows(values_only=True):
            if any(c is not None for c in r):
                rows.append([c.isoformat()[:10] if hasattr(c, 'isoformat') else c for c in r])
        res[ws.title] = rows
    return res


insights, history = {}, {}
for prefix, name in STUDIOS.items():
    ins = sections(parse_docx(pack / '1_Insights' / f'{prefix}_1_Performance_History_and_Insights.docx'))
    tsum = sections(parse_docx(pack / '2_Targets' / f'{prefix}_2_Targets_2027_Summary.docx'))
    insights[name] = {'insights': ins, 'targetsSummary': tsum}
    sheets = xlsx_sheets(pack / '2_Targets' / f'{prefix}_2_Targets_2027.xlsx')
    history[name] = {k: v for k, v in sheets.items() if k in ('Monthly Targets', 'History', 'Inputs', 'Products', 'Scenarios')}
out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / 'insights.json').write_text(json.dumps({'source': 'P57 2027 Sales Plan Pack', 'studios': insights}, ensure_ascii=False, indent=1))
(out_dir / 'history.json').write_text(json.dumps({'source': 'P57 2027 Sales Plan Pack / 2_Targets xlsx', 'studios': history}, ensure_ascii=False, indent=1, default=str))
for n, d in insights.items():
    print(n, [s['title'] for s in d['insights']['sections']], '|', [s['title'] for s in d['targetsSummary']['sections']])
for n, h in history.items():
    print(n, {k: len(v) for k, v in h.items()})
