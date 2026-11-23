"""Score one fixed pilot. Run in the coordinator directory with Python 3.8+."""
import csv
import sys
from datetime import datetime
from pathlib import Path

FIELDS = ('code','person','eligible','preference','pref_at','d0','recall_at','options_at','match_at',
          'recall_ok','earlier','later','week_at','q1','q2','q3')
KEY_FIELDS = ('code','pair','hour','preferred','memory','earlier','first_hour')
PAIRS = ('R1','R2','R3','P1','P2','W1')
REVIEW_ITEMS = (*PAIRS,'edges','hidden','classic','T1','T2','T3')
CODES = {f'{prefix}{i:02d}' for prefix in 'RL' for i in range(1,31)}


def rows(folder, name, fields):
    with (folder/name).open(encoding='utf-8-sig',newline='') as f:
        data = csv.DictReader(f)
        if set(data.fieldnames or ()) != set(fields) or len(data.fieldnames) != len(fields):
            raise ValueError('欄名不符：' + name)
        out = list(data)
        if any(None in row or None in row.values() for row in out):
            raise ValueError('欄數不符：' + name)
        return [{k:v.strip() for k,v in row.items()} for row in out]


def indexed(data, fields, expected):
    result = {}
    for row in data:
        k = tuple(row[f] for f in fields)
        if len(k) == 1:
            k = k[0]
        if k in result or k not in expected:
            raise ValueError('重複或不認得的代號：' + str(k))
        result[k] = row
    if result.keys() != expected:
        raise ValueError('表內缺少預留代號。未回覆請保留空列。')
    return result


def choice(value, valid):
    if value and value not in valid:
        raise ValueError('不認得的填答：' + value)
    return value


def when(value):
    if not value:
        return None
    result = datetime.fromisoformat(value)
    if result.utcoffset() is None:
        raise ValueError('時間缺少 UTC 偏移：' + value)
    return result


def window(start,end,low,high):
    return bool(start and end and low <= (end-start).total_seconds()/3600 <= high)


def evaluate(folder):
    responses = indexed(rows(folder,'responses.csv',FIELDS),('code',),CODES)
    keys = indexed(rows(folder,'key.csv',KEY_FIELDS),('code',),{c for c in CODES if c.startswith('R')})
    for k in keys.values():
        if k['preferred'] not in ('A','B') or k['earlier'] not in ('甲','乙') or k['pair'] not in PAIRS or k['memory'] not in PAIRS:
            raise ValueError('分派表有無效的值')
    reviewers = indexed(rows(folder,'panel.csv',('expert','person','qualified','independent')),('expert',),{'E1','E2'})
    reviews = indexed(rows(folder,'experts.csv',('expert','item','verdict','note')),('expert','item'),
                      {(e,k) for e in reviewers for k in REVIEW_ITEMS})
    persons = [r['person'] for r in [*responses.values(),*reviewers.values()] if r['person']]
    if len(set(persons)) != len(persons):
        raise ValueError('同一人重複參加。請核對匿名代碼。')
    pref = recall = transfer = panels = major = minor = 0
    enrolled = {'R':0,'L':0}
    for code,r in responses.items():
        group = code[0]
        allowed = {'code','person','eligible','d0'} | ({'preference','pref_at','recall_at','options_at','match_at','recall_ok','earlier','later'} if group=='R' else {'week_at','q1','q2','q3'})
        if any(v for k,v in r.items() if k not in allowed):
            raise ValueError('填入了另一組的欄位：'+code)
        choice(r['eligible'],('1','0'))
        if any(r[k] for k in FIELDS[2:]) and not r['person']:
            raise ValueError('請填匿名個人代碼：'+code)
        valid = bool(r['person'] and r['eligible']=='1')
        enrolled[group] += int(valid)
        start = when(r['d0'])
        if group == 'R':
            vote = choice(r['preference'],('A','B','無差'))
            free = choice(r['recall_ok'],('1','0'))
            early,late = (choice(r[k],('甲','乙')) for k in ('earlier','later'))
            voted,answer,sent,matched = (when(r[k]) for k in ('pref_at','recall_at','options_at','match_at'))
            pref += int(bool(valid and voted and (not start or voted <= start) and vote == keys[code]['preferred']))
            timed = (voted and start and voted <= start and window(start,answer,24,48) and sent and matched and
                     answer <= sent <= matched and window(start,matched,24,48))
            recall += int(bool(valid and timed and free=='1' and early == keys[code]['earlier'] and late and late != early))
        else:
            solved = sum(choice(r[k],('1','0')) == '1' for k in ('q1','q2','q3'))
            transfer += int(bool(valid and window(start,when(r['week_at']),168,216) and solved >= 2))
    for e,person in reviewers.items():
        for k in ('qualified','independent'):
            choice(person[k],('1','0'))
        complete = bool(person['person'] and person['qualified']=='1' and person['independent']=='1')
        for item in REVIEW_ITEMS:
            r = reviews[e,item]
            v = choice(r['verdict'],('可用','小修','重大'))
            complete = bool(complete and v and r['note'])
            major += int(v=='重大')
            minor += int(v=='小修')
        panels += int(complete)
    passed = (enrolled == {'R':30,'L':30} and pref>=21 and recall>=24 and transfer>=24 and panels==2 and not major)
    return dict(enrolled=enrolled,preference=pref,recall=recall,transfer=transfer,experts=panels,major=major,minor=minor,passed=passed)


if __name__ == '__main__':
    try:
        a = evaluate(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent)
    except (ValueError,OSError) as e:
        raise SystemExit(str(e))
    print(f'合資格人數（成稿／學習）：{a["enrolled"]["R"]}／{a["enrolled"]["L"]}')
    print(f'選試讀稿 {a["preference"]}/30；隔天回憶兼配對 {a["recall"]}/30；陌生盤過關 {a["transfer"]}/30。')
    print(f'完成獨立審讀 {a["experts"]}/2；重大 {a["major"]} 項，小修 {a["minor"]} 項。')
    print('已達本輪預設門檻。' if a['passed'] else '尚未達到本輪門檻。')
