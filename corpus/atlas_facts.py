"""Extract the public natal inputs and audit the frozen female/male grid for the atlas."""
import argparse
import gzip
import hashlib
import json
import tempfile
from concurrent.futures import ProcessPoolExecutor
from datetime import date, timedelta
from pathlib import Path

from index_patterns import CORE_MANIFEST_SHA256, ROLES, atomic_write, flags

KINDS = ('CLASH', 'COMBINATION_2', 'COMBINATION_HALF', 'TRINE', 'DIRECTIONAL',
         'PUNISHMENT', 'DESTRUCTION', 'HARM')


def extract(task):
    source, entry, last, directory = task
    path = source / entry['file']
    if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
        raise ValueError(f'Changed source file: {path}')
    start = date(entry['year'], 1, 1)
    days = (min(date(start.year, 12, 31), last) - start).days + 1
    references = {}
    with gzip.open(path, 'rb') as records, (directory / str(start.year)).open('w') as out:
        for d in range(days):
            day = (start + timedelta(days=d)).isoformat()
            for h in range(0, 24, 2):
                slot = f'{day}T{h:02d}:30:00+08:00/'
                female, male = json.loads(next(records)), json.loads(next(records))
                if female['id'] != slot + 'female' or male['id'] != slot + 'male':
                    raise ValueError(f'Unexpected grid ID at {slot}')
                for field in ('fourPillars', 'pillars', 'dayMaster', 'interactions'):
                    if female[field] != male[field]:
                        raise ValueError(f'Natal pair differs at {slot} {field}')
                pillars = female['pillars']
                if (female['dayMaster'] != pillars['day']['stem'] or
                        female['fourPillars'] != ' '.join(pillars[k]['ganZhi'] for k in ROLES)):
                    raise ValueError(f'Inconsistent four pillars at {slot}')
                for role in ROLES:
                    pillar = pillars[role]
                    hidden = pillar['hiddenStems']
                    if ([i for i, s in enumerate(hidden) if s['isMain']] != [0]
                            or pillar['ganZhi'] != pillar['stem'] + pillar['branch']):
                        raise ValueError(f'Invalid pillar at {slot}')
                    entries = [('hidden', pillar['branch'], ''.join(s['stem'] for s in hidden))]
                    for s in hidden:
                        entries.extend([('god', female['dayMaster'] + s['stem'], s['tenGod']),
                                        ('element', s['stem'], s['element'])])
                    if role != 'day':
                        entries.append(('god', female['dayMaster'] + pillar['stem'], pillar['stemTenGod']))
                    for table, key, value in entries:
                        if references.setdefault((table, key), value) != value:
                            raise ValueError(f'Inconsistent reference at {slot} {key}')
                mask = sum(1 << KINDS.index(kind) for kind in {e['type'] for e in female['interactions']})
                print(female['fourPillars'], mask, flags(female, male), sep='\t', file=out)
        if next(records, None) is not None or days * 24 != entry['records']:
            raise ValueError(f'Incorrect annual total at {path}')
    return references


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path, help='Intermediate directory')
    parser.add_argument('--workers', type=int, choices=range(1, 17), default=4)
    args = parser.parse_args()
    raw = (args.source / 'manifest.json').read_bytes()
    if hashlib.sha256(raw).hexdigest() != CORE_MANIFEST_SHA256:
        raise ValueError('Unexpected corpus manifest')
    source = json.loads(raw)
    args.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=args.output) as tmp:
        directory = Path(tmp)
        tasks = [(args.source, year, date.fromisoformat(source['lastDate']), directory) for year in source['years']]
        tables = {'hidden': {}, 'god': {}, 'element': {}}
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            for refs in pool.map(extract, tasks):
                for (table, key), value in refs.items():
                    if tables[table].setdefault(key, value) != value:
                        raise ValueError(f'Inconsistent lookup: {table} {key}')
        if [len(tables[k]) for k in ('hidden', 'god', 'element')] != [12, 100, 10]:
            raise ValueError('Incomplete reference tables')
        for year in source['years']:
            name = str(year['year'])
            (directory / name).replace(args.output / name)
        atomic_write(args.output / 'tables.json', (json.dumps(tables, ensure_ascii=False, sort_keys=True) + '\n').encode())
    print(source['records'], 'verified source records')


if __name__ == '__main__':
    main()
