"""Replay the study excerpts against the published v2.1 release directory."""
import argparse
import gzip
import hashlib
import json
import subprocess
from contextlib import contextmanager
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFESTS = {
    'manifest.json': 'e1bfa79f042778bd319a8c7b2dcf2f0bb2ac74f73a3924d17dcac2dc11efd67e',
    'edition-manifest.json': '6545d05295dca4c0a4bae9f47ea8b9edd87552791fba6308c08d2765882a1a8d',
}
TEACHING = [('1991-10-19', 8), ('1900-01-01', 0), ('1900-01-01', 2)]
UNSEEN = [('1962-01-02', 12), ('1971-02-08', 2), ('1978-10-16', 8)]
POSITIONS = ('year', 'month', 'day', 'hour')


def read(name):
    return json.loads((HERE / name).read_text())


def identity(day, hour):
    return f'{day}T{hour:02d}:30:00+08:00/female'


def verified(path, expected):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    if digest.hexdigest() != expected:
        raise ValueError(f'Unexpected SHA-256 for {path}')
    return path


@contextmanager
def stream(path):
    if path.suffix == '.gz':
        with gzip.open(path) as handle:
            yield handle
    else:
        process = subprocess.Popen(['zstd', '-dcq', '--long=25', path], stdout=subprocess.PIPE)
        try:
            yield process.stdout
        finally:
            process.terminate()
            process.stdout.close()
            process.wait()


def shrink(row):
    return {'fourPillars': row['fourPillars'],
            'pillars': {pos: {k: row['pillars'][pos][k] for k in
                              ('stem', 'branch', 'stemTenGod', 'hiddenStems')} for pos in POSITIONS},
            'interactions': [{k: item[k] for k in ('type', 'branches', 'pillars')}
                             for item in row['interactions']]}


def extract(data):
    cases = read('cases.json')
    fact_index, book_index = [json.loads(verified(data / n, h).read_text())['years'] for n, h in MANIFESTS.items()]
    topics = {identity(c['date'], s['hour']): c['topic'] for c in cases for s in c['sides']}
    wanted = set(topics) | {identity(d, h) for d, h in TEACHING + UNSEEN}
    result = {}
    for year in sorted({int(key[:4]) for key in wanted}):
        facts = next(x for x in fact_index if x['year'] == year)
        book = next(x for x in book_index if x['year'] == year)
        bookpath = f'books/{year}.book.jsonl.zst'
        for is_book, name, digest in [(False, facts['file'], facts['sha256']), (True, bookpath, book['files'][bookpath])]:
            indices = {}
            for key in (topics if is_book else wanted):
                if int(key[:4]) == year:
                    index = (date.fromisoformat(key[:10]) - date(year, 1, 1)).days * 24 + int(key[11:13])
                    indices[index] = key
            if not indices:
                continue
            with stream(verified(data / name, digest)) as lines:
                for idx, line in enumerate(lines):
                    if idx not in indices:
                        continue
                    key = indices.pop(idx)
                    row = json.loads(line)
                    if row['id'] != key:
                        raise ValueError(f'Unexpected chart at {name} line {idx + 1}')
                    if is_book:
                        part = row['chapters'][topics[key]]['parts'][0]
                        result[key]['control'] = {'title': part['name'], 'body': part['text'].split('\n\n')[0],
                                                  'evidence': part['text'].split('\n\n', 1)[1], 'ref': part['ref']}
                    else:
                        result[key] = shrink(row)
                    if not indices:
                        break
            if indices:
                raise ValueError(f'Missing rows in {name}')
    return dict(sorted(result.items()))


def matches(row, check):
    kind, *args = check
    p = row['pillars']
    if kind == 'rel':
        relation, positions, branches = args
        return any(r['type'] == relation and r['pillars'] == positions.split(',') and
                   ''.join(r['branches']) == branches for r in row['interactions'])
    if kind == 'noBranch':
        return all(col['branch'] != args[0] for col in p.values())
    if kind in ('mainRoot', 'innerRoot'):
        pos, branch, stem = args
        return (p['day']['stem'] == stem and p[pos]['branch'] == branch and
                any(h['stem'] == stem and h['isMain'] == (kind == 'mainRoot') for h in p[pos]['hiddenStems']))
    if kind == 'main':
        return any(h['stem'] == args[1] and h['isMain'] for h in p[args[0]]['hiddenStems'])
    if kind == 'monthExposure':
        main = next(h['stem'] for h in p['month']['hiddenStems'] if h['isMain'])
        return any(p[k]['stem'] == main for k in ('year', 'month', 'hour')) == args[0]
    if kind == 'hourGod':
        return [p['hour']['stem'], p['hour']['stemTenGod'].translate(str.maketrans('财伤杀', '財傷殺'))] == args
    raise ValueError(check)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('release_directory', type=Path)
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    rows = extract(args.release_directory)
    if args.write:
        (HERE / 'charts.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    elif read('charts.json') != rows:
        raise SystemExit('Frozen excerpts differ from release')
    print(f'{len(rows)} charts, {sum("control" in v for v in rows.values())} published controls')
