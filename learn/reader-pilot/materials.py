"""Render the teaching diagrams, public reading room and printable pages."""
import base64
import html
from pathlib import Path
from urllib.parse import quote
from freeze import HERE, POSITIONS, identity, read

CASES, LESSONS, EXAMS, CHARTS = map(read, ('cases.json', 'lessons.json', 'holdouts.json', 'charts.json'))
LABELS = ('年柱', '月柱', '日柱', '時柱')
TOPICS = {'love': '感情', 'temperament': '性格', 'work': '工作'}


def esc(text):
    return html.escape(str(text))


def diagram(lesson):
    cols = lesson['columns']
    widths = {3: [230, 235, 295], 5: [240, 130, 130, 130, 130]}[len(cols)]
    rows = [cols] + lesson['rows']
    height = len(rows) * 60 + 4
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="760" height="{height}" viewBox="0 0 760 {height}" role="img" aria-labelledby="title desc">',
           f'<title id="title">{esc(lesson["title"])}</title><desc id="desc">{esc("。".join("，".join(row) for row in rows))}</desc>',
           '<g font-family="PingFang TC, Noto Sans CJK TC, Microsoft JhengHei, sans-serif" font-size="20">']
    if lesson['id'] == 'edges':
        svg.append('<rect width="760" height="184" fill="#f4f3ee"/>')
        for i, (time, left, right) in enumerate(lesson['rows']):
            y = 22 + i * 94
            hour = time.split('　')[1][0]
            svg.append(f'<text x="14" y="{y+25}" fill="#183d3b">{time[:5]}</text>')
            for x, label in ((110, '月支 戌'), (360, '時支 '+hour), (610, '日支 酉')):
                svg.append(f'<rect x="{x}" y="{y}" width="110" height="42" rx="8" fill="#214c49"/>')
                svg.append(f'<text x="{x+55}" y="{y+29}" text-anchor="middle" fill="white">{label}</text>')
            for x, rel in ((220,left), (470,right)):
                label = rel.split('　')[1]
                color = '#803c2c' if label == '相沖' else '#206457'
                svg.append(f'<path d="M{x} {y+21}h140" stroke="{color}" stroke-width="3"/>')
                svg.append(f'<text x="{x+70}" y="{y+49}" text-anchor="middle" fill="{color}">{label}</text>')
        return '\n'.join(svg + ['</g></svg>'])
    for i, row in enumerate(rows):
        x = 0
        for j, label in enumerate(row):
            dark = i == 0
            bg = '#1d4644' if dark else ('#e5f1ee' if j == len(row)-1 else '#f6f3ed')
            if lesson['id'] == 'classic' and ((i == 2 and j == 4) or (i == 3 and j == 3)):
                bg = '#f5dfc6'
            fg = '#ffffff' if dark else '#183d3b'
            svg.append(f'<rect x="{x}" y="{i*60}" width="{widths[j]-2}" height="58" fill="{bg}"/>')
            content = esc(label)
            if lesson['id'] == 'hidden' and i > 0:
                content = content.replace('辛', '<tspan fill="#963d24" font-weight="700">辛</tspan>')
            svg.append(f'<text x="{x+12}" y="{i*60+36}" fill="{fg}">{content}</text>')
            x += widths[j]
    return '\n'.join(svg + ['</g></svg>'])


def publish_readings():
    lessons = ['# 三堂讀盤課', '', '每堂先看圖，再遮住答案做一題。圖中現代盤的輸入都採固定 UTC+08:00 女盤。', '']
    for l in LESSONS:
        filename = l['id'] + '.svg'
        (HERE / filename).write_text(diagram(l) + '\n')
        lessons += ['## ' + l['title'], '', l['intro'], '', f'![{esc("。 ".join("，".join(r) for r in [l["columns"], *l["rows"]]))}]({filename})', '',
                    l['explain'], '', l['scope'] + ' [原典位置](<' + l['url'] + '>)', '',
                    l['exercise'], '', '<details><summary>核對答案</summary>', '', l['answer'], '', '</details>', '']
    (HERE / 'lessons.md').write_text('\n'.join(lessons))
    out = ['# 同一天換一個時辰，哪句建議要改？', '',
           '這六對都是教學用的合成輸入。每組固定出生日期、性別和時區，只換時刻。段後列出選擇生活情境的依據；盤上可以核對的是干支、十神和柱位。', '']
    for c in CASES:
        out += ['## ' + TOPICS[c['topic']] + '｜' + c['name'], '']
        for s in c['sides']:
            row = chart(c,s)
            out += [f'### {c["date"]}　{s["hour"]:02d}:30　{row["fourPillars"]}', '',
                    '**' + s['title'] + '**', '', s['body'], '', s['premise'], '',
                    '<details><summary>看 v2.1 同一位置的原稿及盤面依據</summary>', '',
                    row['control']['title'], '', row['control']['body'], '', row['control']['evidence'],
                    '', '</details>', '']
    (HERE / 'readings.md').write_text('\n'.join(out))


def chart(c, s):
    return CHARTS[identity(c['date'], s['hour'])]


def para(s):
    return '<p>' + esc(s) + '</p>'


def heading(s):
    return '<h2>' + esc(s) + '</h2>'


def card(title, body):
    return '<section>' + heading(title) + para(body) + '</section>'


def grid(row, hidden=False):
    p = row['pillars']
    detail = ''
    if hidden:
        cells = ['、'.join(h['stem'] for h in p[k]['hiddenStems']) for k in POSITIONS]
        detail = '<tr>' + ''.join('<td>藏 ' + esc(v) + '</td>' for v in cells) + '</tr>'
    return '<table><tr>' + ''.join('<th>' + k + '</th>' for k in LABELS) + '</tr><tr>' + ''.join(
        '<td>' + esc(v) + '</td>' for v in row['fourPillars'].split()) + '</tr>' + detail + '</table>'


def page(label, title, body):
    return '<article><header>' + esc(label) + '</header><h1>' + esc(title) + '</h1>' + body + '<footer>盤面與成稿節選、改編自 OpenFate Bazi Corpus（OpenFate）。<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></footer></article>'


def lesson_pages():
    pages = []
    for i,l in enumerate(LESSONS, 1):
        url = quote(l['url'], safe=':/#%_().-')
        img = base64.b64encode(diagram(l).encode()).decode()
        body = (para(l['intro']) + f'<img alt="{esc(l["title"])}" src="data:image/svg+xml;base64,{img}">' +
                para(l['explain']) + '<aside>' + para(l['scope']) +
                f'<a href="{esc(url)}">{esc(l["book"])}</a></aside>' + heading('自己試一次') + para(l['exercise']))
        pages.append(page(f'八字讀盤練習　・　第 {i} 課', l['title'], body))
    body = ''.join(card(l['title'], l['answer']) for l in LESSONS)
    pages.append(page('八字讀盤練習　・　課後核對', '做完三題，再對照這一頁', body +
                      para('請告訴主持人你已讀完。約一週後會收到三張新的盤，屆時只看題目作答。')))
    return pages


def exam_pages():
    body = para('只看這份題目。用自己的話回覆第 1、2、3 題，每題都請寫出理由。記不清的地方可以留白。')
    for i,x in enumerate(EXAMS, 1):
        row = CHARTS[identity(x['date'],x['hour'])]
        body += heading(f'第 {i} 題　{x["date"]}　{x["hour"]:02d}:30') + grid(row,x.get('hidden',False)) + para(x['ask'])
    return [page('八字讀盤練習　・　一週後', '換你讀三張新盤', body)]


CSS = """@page{size:A5;margin:14mm 13mm}*{box-sizing:border-box}body{font:11pt/1.57 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",sans-serif;color:#202e2c;margin:0}article+article{break-before:page}header{font-size:9pt;color:#436763;letter-spacing:.07em;border-bottom:1px solid #b8c9c4;padding-bottom:6px}h1{font-size:18pt;line-height:1.32;color:#173f3b;margin:10px 0 14px}h2{font-size:12pt;line-height:1.42;color:#204e48;margin:12px 0 4px}p{margin:4px 0 8px}table{width:100%;border-collapse:collapse;text-align:center;margin:6px 0 8px}th,td{padding:3px 4px;border:1px solid #c3d0cb}th{font-size:9pt;font-weight:500;background:#edf3f0}section{border-left:2px solid #a8c4bb;padding-left:9px}img{display:block;width:100%;margin:9px 0}aside{background:#f4f3ee;padding:5px 9px;font-size:9pt}a{color:#255b53}footer{border-top:1px solid #d0dbd6;margin-top:12px;padding-top:4px;font-size:7.5pt;color:#546b65}"""


def document(pages):
    return '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>八字試讀</title><style>' + CSS + '</style><body>' + ''.join(pages) + '</body></html>'


if __name__ == '__main__':
    publish_readings()
