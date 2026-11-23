"""Prepare an organizer packet in a new directory. Use print.cjs to print its HTML files."""
import argparse
import csv
import random
import shutil
from pathlib import Path
from materials import (CASES, CHARTS, EXAMS, HERE, LESSONS, card, chart, document, exam_pages,
                       grid, heading, identity, lesson_pages, page, para)
from score import FIELDS, KEY_FIELDS, REVIEW_ITEMS


def table(path, fields, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def layout(rng):
    rows = []
    for i,c in enumerate(CASES):
        # Each group of four covers all side/order crossings. Alternate the fifth across pairs.
        combos = [(s, o) for s in (0, 1) for o in (0, 1)]
        # Three fifth copies of A, three of B across the six pairs.
        combos.append((i % 2, 0 if i in (0,3,4) else 1))
        memory = CASES[(i + 2) % len(CASES)]
        displays = [0,1,0,1,i%2]
        choices = [1,0,0,1,1-i%2]
        rng.shuffle(displays)
        rng.shuffle(choices)
        for (side, order), first, option in zip(combos,displays,choices):
            rows.append((c,side,order,memory,first,option))
    rng.shuffle(rows)
    return rows


def reading(title, body, evidence):
    return heading(title) + para(body) + para(evidence)


def reader_files(row, code):
    c, side, order, m, first, option = row
    s = c['sides'][side]
    facts = chart(c,s)
    old = facts['control']
    texts = [reading(s['title'],s['body'],s['premise']),
             reading(old['title'],old['body'],old['evidence'])]
    if order:
        texts.reverse()
    main = para(f'{c["date"]}　{s["hour"]:02d}:30，UTC+08:00，女盤。兩段解讀用的是同一張盤。') + grid(facts)
    for letter,t in zip('AB',texts):
        main += heading('版本 ' + letter) + '<section>' + t + '</section>'
    main += para('如果只留一段給下個讀者，你會留 A、B，還是兩段無差？請回覆代號、選擇，以及影響你決定的一句話。')
    mem = para(f'{m["date"]}，UTC+08:00，女盤。把兩個時刻各讀一遍。讀完關掉檔案，回覆「已讀」就好。')
    for idx in (first,1-first):
        t = m['sides'][idx]
        mem += heading(f'{t["hour"]:02d}:30　' + chart(m,t)['fourPillars']) + card(t['title'],t['body']) + para(t['premise'])
    recall = para('先不翻昨天的資料。昨天第二份檔案有兩個出生時刻。你還記得兩張盤的差別嗎？哪個時刻適合怎麼做，為什麼？')
    recall += para('請回覆代號，再用一兩句自己的話寫下來。可以只記得一張，也可以回「想不起來」。回覆後，主持人會另給兩個選項。')
    match = para(f'昨天第二份檔案的兩個時刻是 {m["sides"][0]["hour"]:02d}:30 和 {m["sides"][1]["hour"]:02d}:30。請為每個時刻選一項，每項使用一次。')
    for label,index in zip('甲乙',(option,1-option)):
        match += card(label,m['sides'][index]['cue'])
    match += para('請回覆代號、較早時刻選甲或乙、較晚時刻選甲或乙。')
    docs = {filename: [page('讀者 ' + code, title, body)] for filename,title,body in (
        ('01-今天先讀','同一張盤，讀兩種寫法',main),('02-回覆後再讀','同一天的兩個時刻',mem),
        ('03-隔天先答','你記得哪個差別？',recall),('04-交回答案後','把兩項建議配回去',match))}
    key = dict(code=code, pair=c['id'], hour=s['hour'], preferred='AB'[order], memory=m['id'],
               earlier='甲乙'[option], first_hour=m['sides'][first]['hour'])
    return docs,key


def experts():
    intro = (para('請獨立審讀，下判斷前先在影印本、文字本或發行資料找到依據。研究主持人會在兩份意見都交回後再讓兩人交換看法。') +
             para('每個代號回覆「可用／小修／重大」，附原句、柱位或原典段落、修正理由。重大包括引錯原典、柱位或關係錯誤、把現代情境冒充命理必然。意見不一致時保留兩份原判。') +
             para('六組命例請兩個時刻都看：判斷能否指回盤面？能否整段互換？三堂課另查原典、現代例及練習答案。最後三題請審查可接受的同義答案與給分規則。'))
    pages = [page('獨立審讀　・　填寫方式','請核對這十二個項目',intro)]
    for c in CASES:
        body = ''
        for s in c['sides']:
            row = chart(c,s)
            body += heading(f'{s["hour"]:02d}:30　' + row['fourPillars']) + card(s['title'],s['body']) + para(s['premise'])
            body += '<aside>' + para('v2.1 同段：' + row['control']['title'] + row['control']['body']) + '</aside>'
        year = c['date'][:4]
        base = 'https://github.com/openfate-ai/bazi-engine/releases/download/corpus-v2.1.0/'
        body += (f'<aside><a href="{base}{year}.jsonl.gz">查同年盤面</a>　'
                 f'<a href="{base}{year}.book.jsonl.zst">查同年舊稿</a>　'
                 f'取 chapters.{c["topic"]}.parts[0]。</aside>')
        pages.append(page(c['id'] + '　' + c['date'] + '　固定 UTC+08:00 女盤',c['name'],body))
    pages += lesson_pages()[:-1]
    pages.append(page('審讀參照　・　課內練習', '核對課內答案', ''.join(card(l['id'],l['answer']) for l in LESSONS)))
    pages += exam_pages()
    pages.append(page('審讀參照　・　一週後','核對陌生盤計分', ''.join(card(f'T{i}',x['rubric']) for i,x in enumerate(EXAMS,1)) +
                      para('全部審讀代號：' + '、'.join(REVIEW_ITEMS))))
    return pages


def build(target):
    target.mkdir(parents=True, exist_ok=False)
    host = target / '主持人專用'
    host.mkdir()
    def put(folder,name,pages):
        folder.mkdir(parents=True,exist_ok=True)
        (folder/(name+'.html')).write_text(document(pages))
    manual = (HERE/'HOST.md').read_text()
    invite = manual.split('## 可以直接轉貼的邀請',1)[1].split('## 成稿組怎麼發',1)[0].strip()
    (target/'招募訊息.txt').write_text(invite.replace('**','')+'\n')
    (target/'先讀我.txt').write_text(
        '先用「招募訊息」邀請兩組各 30 位不同讀者，以及兩位審讀者。\n'
        '成稿組每人領一個 R 代號，先傳該夾 01；收到選擇再傳 02。隔天先傳 03，收回憶後才傳 04。\n'
        '學習組每人領一個 L 代號，先傳 01；一週後才傳 02。審讀者各收一份獨立審讀本。\n'
        '整包與「主持人專用」留在自己手上。發檔時序、時間窗及收卷方式請見 主持人專用/HOST.md。\n')
    keys = []
    for i,row in enumerate(layout(random.SystemRandom()),1):
        code = f'R{i:02d}'
        docs,key = reader_files(row,code)
        keys.append(key)
        for name,pages in docs.items():
            put(target/'成稿組'/code,name,pages)
    put(target/'學習組','01-今天三堂課',lesson_pages())
    put(target/'學習組','02-一週後作答',exam_pages())
    put(target/'審讀者','獨立審讀本',experts())
    table(host/'key.csv',KEY_FIELDS,keys)
    table(host/'responses.csv',FIELDS,[dict(code=f'{prefix}{i:02d}') for prefix in 'RL' for i in range(1,31)])
    table(host/'panel.csv',('expert','person','qualified','independent'),[dict(expert=e) for e in ('E1','E2')])
    table(host/'experts.csv',['expert','item','verdict','note'],[dict(expert=e,item=k) for e in ('E1','E2') for k in REVIEW_ITEMS])
    for n in ('score.py','HOST.md'):
        shutil.copyfile(HERE/n,host/n)
    rubric = ['# 回憶與陌生盤評分表','', '先依原始答覆評自由回憶，再開 key.csv 核對選擇。對同義措辭給相同分數。','']
    for c in CASES:
        rubric += ['## '+c['id']+'　'+c['date'],'']
        for s in c['sides']:
            rubric += [f'- {s["hour"]:02d}:30　{s["cue"]}。{s["premise"]}']
        rubric.append('')
    rubric += ['## 陌生盤',''] + [f'- 第 {i} 題　{x["rubric"]}' for i,x in enumerate(EXAMS,1)]
    (host/'rubric.md').write_text('\n'.join(rubric)+'\n')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('output',type=Path)
    build(p.parse_args().output)
