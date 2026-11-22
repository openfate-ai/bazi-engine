"""Read one representative chart from a local OpenFate Bazi Corpus release."""
import argparse
import gzip
import json
from datetime import date
from pathlib import Path

TOPICS = {'overview':'命盤主線', 'season':'月令', 'roots':'藏干與日主', 'learning':'學習與支持',
          'expression':'表達與產出', 'work':'工作與責任', 'wealth':'財務與資源', 'peers':'合作與分工',
          'relationship':'親密關係', 'interactions':'地支合沖', 'onset':'起運依據',
          'firstCycle':'第一步大運', 'nextCycle':'前兩步大運的轉換'}
HOURS = tuple(f'{hour:02}:30' for hour in range(0,24,2))


def find_row(root, day, hour, gender):
    if not 1930 <= day.year <= 2026 or hour not in HOURS or gender not in ('female','male'):
        raise ValueError('Choose a listed representative time and a date in 1930–2026.')
    path = root/'years'/f'{day.year}.jsonl.gz'
    index = (day - date(day.year,1,1)).days*24 + HOURS.index(hour)*2 + (gender == 'male')
    with gzip.open(path,'rb') as rows:
        for i, line in enumerate(rows):
            if i == index:
                record = json.loads(line)
                if record['id'] == f'{day.isoformat()}T{hour}:00+08:00/{gender}':
                    return record
                break
    raise ValueError(f'Unexpected record order or incomplete file: {path}')


def markdown(row):
    lines = ['# ' + row['fourPillars'], '', row['id'], '', '真太陽時 ' + row['trueSolarDateTime'], '',
             ' · '.join(row['labels']), '']
    for topic, label in TOPICS.items():
        entry = row['readings'][topic]
        lines += ['## ' + label + '｜' + entry['title'], '', entry['text'], '',
                  '依據 ' + '、'.join('\x60' + ref + '\x60' for ref in entry['evidence']), '']
    return '\n'.join(lines)


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('directory', type=Path)
    cli.add_argument('date', type=date.fromisoformat)
    cli.add_argument('time', choices=HOURS)
    cli.add_argument('gender', choices=('female','male'))
    cli.add_argument('--json', action='store_true')
    args = cli.parse_args()
    try:
        row = find_row(args.directory, args.date, args.time, args.gender)
        print(json.dumps(row, ensure_ascii=False, indent=2) if args.json else markdown(row))
    except (ValueError, OSError) as exc:
        cli.exit(1, str(exc) + '\n')
