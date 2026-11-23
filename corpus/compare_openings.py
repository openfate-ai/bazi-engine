"""Compare published career advice across adjacent birth hours in two corpus editions."""
import argparse
import json
import subprocess
from datetime import date
from pathlib import Path


def readings(root, day):
    year = day.year
    first = (day - date(year, 1, 1)).days * 24
    filename = root / 'books' / f'{year}.book.jsonl.zst'
    result = {}
    with subprocess.Popen(['zstd', '-dcq', '--long=25', str(filename)],
                          stdout=subprocess.PIPE) as proc:
        try:
            for index, line in enumerate(proc.stdout):
                offset = index - first
                if offset < 0 or offset % 2:
                    continue
                if offset >= 24:
                    break
                record = json.loads(line)
                expected = f'{day}T{offset:02}:30:00+08:00/female'
                if record['id'] != expected:
                    raise ValueError(f'Wrong chart at {filename} line {index + 1}')
                chapter = record['chapters']['work']
                parts = chapter['parts']
                # Compare the actual guidance, omitting headings, JSON pointers and technical
                # receipts appended after a blank line to the new edition's opening.
                advice = parts[0]['text'].split('\n\n')[0]
                paragraphs = {p for part in parts for p in part['text'].split('\n\n') if p}
                result[offset] = advice, paragraphs
        finally:
            if proc.poll() is None:
                proc.terminate()
    if len(result) != 12:
        raise ValueError(f'Missing birth hours for {day}')
    return result


def compare(old, new):
    # Distribute 12 dates across the common years and across the 12 calendar months.
    days = [date(1950 + (75 * i // 11), i + 1, 15) for i in range(12)]
    report = {'metric': 'Exact first advice paragraph, excluding headings and the separately '
              'identified natal evidence. Different text is not a reader preference score.',
              'sample': 'Day 15 of each month in turn; years spaced across 1950–2025; all '
              'twelve representative hours, female input. Compare consecutive hours within each day.',
              'dates': [], 'pairs': 0, 'oldAdviceChanged': 0, 'newAdviceChanged': 0}
    for day in days:
        row = {'date': str(day), 'pairs': 11}
        for name, root in (('old', old), ('new', new)):
            values = readings(root, day)
            label = name + 'AdviceChanged'
            row[label] = sum(values[h][0] != values[h + 2][0] for h in range(0, 22, 2))
            report[label] += row[label]
        report['pairs'] += row['pairs']
        report['dates'].append(row)
    named = {}
    for name, root in (('old', old), ('new', new)):
        rows = readings(root, date(1991, 10, 18))
        early, late = rows[6], rows[8]
        named[name] = {'earlyAdvice': early[0], 'lateAdvice': late[0],
                       'equalNonemptyParagraphs': len(early[1] & late[1]),
                       'earlyUniqueParagraphs': len(early[1]), 'lateUniqueParagraphs': len(late[1])}
    report['namedPair1991'] = named
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('old', type=Path, help='Extracted v2.0 edition with books/')
    parser.add_argument('new', type=Path, help='Extracted v2.1 edition with books/')
    args = parser.parse_args()
    print(json.dumps(compare(args.old, args.new), ensure_ascii=False, indent=2))
