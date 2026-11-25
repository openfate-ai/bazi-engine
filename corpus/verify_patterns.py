"""Audit every indexed bit against published pillar labels and onset dates.

This verifier uses the human-readable labels independently of the interaction
objects used by index_patterns.py. Run against the extracted v2.1.0 core.
"""
import argparse
import gzip
import hashlib
import json
from concurrent.futures import ProcessPoolExecutor
from datetime import date
from pathlib import Path

from index_patterns import CORE_MANIFEST_SHA256


def verify_year(task):
    path, index_path = task
    data = index_path.read_bytes()
    count = 0
    with gzip.open(path, 'rb') as rows:
        for first in rows:
            pair = (json.loads(first), json.loads(next(rows)))
            civil = pair[0]['id']
            offset = (date.fromisoformat(civil[:10]) - date(1900, 1, 1)).days * 12 + int(civil[11:13]) // 2
            code = data[offset]
            for row in pair:
                labels = [s for s in row['labels'] if s.startswith('柱位關係:')]
                for bit, position in enumerate(('年支', '月支', '日支', '時支')):
                    at_position = [s for s in labels if position in s]
                    mixed = any(s.endswith('相沖') for s in at_position) and any(s.endswith('六合') for s in at_position)
                    if mixed != bool(code & (1 << bit)):
                        raise ValueError(f'{row["id"]}: pillar {position}')
            left, right = (row['daYun']['startDate'] for row in pair)
            gap = 0
            if left and right:
                gap = abs((date.fromisoformat(left[:10]) - date.fromisoformat(right[:10])).days)
            expected = int(gap >= 1096) * 16 + int(left is None) * 32 + int(right is None) * 64
            if code & 240 != expected:
                raise ValueError(civil + ': onset or reserved bit')
            count += len(pair)
    return count


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('core', type=Path)
    p.add_argument('index', type=Path)
    p.add_argument('--workers', type=int, choices=range(1, 17), default=2)
    args = p.parse_args()
    raw = (args.core / 'manifest.json').read_bytes()
    if hashlib.sha256(raw).hexdigest() != CORE_MANIFEST_SHA256:
        raise ValueError('Unexpected corpus core manifest')
    source = json.loads(raw)
    manifest = json.loads((args.index / 'index.json').read_bytes())
    index_path = args.index / manifest['file']
    index = index_path.read_bytes()
    if len(index) * 2 != source['records'] or hashlib.sha256(index).hexdigest() != manifest['sha256']:
        raise ValueError('Index integrity check failed')
    tasks = []
    for year in source['years']:
        file = args.core / year['file']
        if hashlib.sha256(file.read_bytes()).hexdigest() != year['sha256']:
            raise ValueError('Source checksum mismatch: ' + str(file))
        tasks.append((file, index_path))
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        count = sum(pool.map(verify_year, tasks))
    if count != source['records']:
        raise ValueError('Incomplete verification')
    print(f'All indexed predicates agree with original labels and civil dates on {count:,} records.')


if __name__ == '__main__':
    main()
