"""Compare one noon-grid lunar date per civil day with Hong Kong Observatory tables."""
import argparse
import calendar
import concurrent.futures
import gzip
import hashlib
import json
import re
import time
import urllib.request
from datetime import date
from pathlib import Path

URL = 'https://www.hko.gov.hk/en/gts/time/calendar/text/files/T{}e.txt'
INDEX = 'https://www.hko.gov.hk/en/gts/time/conversion1_text.htm'
LINE = re.compile(r'^(\d{4})/(\d{1,2})/(\d{1,2})\s+(\d+)(st|nd|rd|th)?\b', re.I)


def fetch(args):
    year, cache = args
    path = cache / f'T{year}e.txt'
    if path.exists():
        return
    for attempt in range(3):
        try:
            with urllib.request.urlopen(URL.format(year), timeout=30) as response:
                body = response.read()
            if not any(LINE.match(line) for line in body.decode('latin1').splitlines()):
                raise ValueError(f'Unexpected HKO response for {year}')
            temp = path.with_suffix('.part')
            temp.write_bytes(body)
            temp.replace(path)
            return
        except OSError:
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def expected(cache):
    values, hashes = {}, {}
    month = lunar_year = None
    leap = False
    for year in range(1929, 2027):
        body = (cache / f'T{year}e.txt').read_bytes()
        hashes[str(year)] = hashlib.sha256(body).hexdigest()
        found = set()
        for line in body.decode('latin1').splitlines():
            match = LINE.match(line.lstrip('\ufeff'))
            if not match:
                continue
            y, m, d, number = map(int, match.groups()[:4])
            day = date(y, m, d)
            if y != year or day in found:
                raise ValueError(f'Unexpected reference date {day}')
            found.add(day)
            if match[5]:
                leap = month == number
                month = number
                if month == 1 and not leap:
                    lunar_year = y
                number = 1
            if year >= 1930:
                if not lunar_year or not month:
                    raise ValueError(f'Missing month or year at {day}')
                values[day.isoformat()] = [lunar_year, month, number, leap]
        if len(found) != 365 + calendar.isleap(year):
            raise ValueError(f'Incomplete HKO table for {year}: {len(found)} dates')
    return values, hashes


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('directory', type=Path, help='dataset containing years/')
    cli.add_argument('cache', type=Path, help='directory of official TYYYYe.txt files')
    cli.add_argument('--fetch', action='store_true', help='download missing public reference tables')
    args = cli.parse_args()
    if args.fetch:
        args.cache.mkdir(parents=True, exist_ok=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(fetch, ((y, args.cache) for y in range(1929, 2027))))
    reference, hashes = expected(args.cache)
    differences = []
    for year in range(1930, 2027):
        with gzip.open(args.directory/'years'/f'{year}.jsonl.gz', 'rb') as source:
            for offset, line in enumerate(source):
                if offset % 24 != 12:  # 12:30 female is the 13th record of each day
                    continue
                row = json.loads(line)
                key = row['id'][:10]
                if not row['id'].endswith('T12:30:00+08:00/female'):
                    raise ValueError(f'Unexpected noon-grid order at {key}')
                lunar = row['lunar']
                actual = [lunar[k] for k in ('year', 'month', 'day', 'isLeapMonth')]
                official = reference.pop(key)
                if actual != official:
                    differences.append({'date': key, 'engine': actual, 'hko': official})
    if reference:
        raise ValueError('Missing engine dates')
    report = {'source': INDEX, 'referenceFiles': URL, 'checks': ['year','month','day','isLeapMonth'],
              'sampleTime': '12:30:00+08:00/female', 'dates': 35429, 'matched': 35429-len(differences),
              'differences': differences, 'referenceFileSha256': hashes}
    (args.directory/'calendar-reference.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf8')
    print('HKO noon calendar:', report['matched'], 'of', report['dates'], 'matched')


if __name__ == '__main__':
    main()
