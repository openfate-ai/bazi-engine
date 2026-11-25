"""Build the browser's one-byte-per-birth-slot index from the released core files."""
import argparse
import gzip
import hashlib
import json
import os
import tempfile
from concurrent.futures import ProcessPoolExecutor
from datetime import date, timedelta
from pathlib import Path

EDITION = '2.1.0'
CORE_MANIFEST_SHA256 = 'e1bfa79f042778bd319a8c7b2dcf2f0bb2ac74f73a3924d17dcac2dc11efd67e'
ROLES = ('year', 'month', 'day', 'hour')
GAP = 16
FEMALE_BOUNDARY = 32
MALE_BOUNDARY = 64
MIN_GAP_DAYS = 1096


def mixed_roles(row):
    clashes, combinations = set(), set()
    for event in row['interactions']:
        if event['type'] == 'CLASH':
            clashes.update(event['pillars'])
        elif event['type'] == 'COMBINATION_2':
            combinations.update(event['pillars'])
    return clashes & combinations


def onset(row):
    luck = row['daYun']
    if luck['timing']['status'] == 'CALCULATED':
        return date.fromisoformat(luck['startDate'][:10])
    if (luck['timing']['status'] == 'UNAVAILABLE'
            and luck['timing']['reason'] == 'PILLAR_TERM_BOUNDARY_MISMATCH'
            and luck['startDate'] is None):
        return None
    raise ValueError('Unexpected timing receipt: ' + row['id'])


def flags(female, male):
    mixed = mixed_roles(female)
    if female['fourPillars'] != male['fourPillars'] or mixed != mixed_roles(male):
        raise ValueError('Inconsistent natal pair: ' + female['id'])
    code = sum(1 << i for i, role in enumerate(ROLES) if role in mixed)
    first, second = onset(female), onset(male)
    if first and second and abs((first - second).days) >= MIN_GAP_DAYS:
        code |= GAP
    if first is None:
        code |= FEMALE_BOUNDARY
    if second is None:
        code |= MALE_BOUNDARY
    return code


def read_year(task):
    root, entry, last_day = task
    path = root / entry['file']
    if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
        raise ValueError('Source checksum mismatch: ' + str(path))
    start = date(entry['year'], 1, 1)
    end = min(date(entry['year'], 12, 31), last_day)
    slots = bytearray()
    with gzip.open(path, 'rb') as lines:
        for day in range((end - start).days + 1):
            prefix = (start + timedelta(days=day)).isoformat() + 'T'
            for hour in range(0, 24, 2):
                slot = prefix + f'{hour:02d}:30:00+08:00/'
                female, male = json.loads(next(lines)), json.loads(next(lines))
                if female['id'] != slot + 'female' or male['id'] != slot + 'male':
                    raise ValueError('Missing or out-of-order record: ' + slot)
                slots.append(flags(female, male))
        if next(lines, None) is not None or len(slots) * 2 != entry['records']:
            raise ValueError('Source length mismatch: ' + str(path))
    boundary_records = sum(bool(v & FEMALE_BOUNDARY) + bool(v & MALE_BOUNDARY) for v in slots)
    if boundary_records != entry['timing'].get('PILLAR_TERM_BOUNDARY_MISMATCH', 0):
        raise ValueError('Boundary total differs from source: ' + str(path))
    return slots, {
        'year': entry['year'], 'slots': len(slots),
        'mixedSlots': sum(bool(v & 15) for v in slots),
        'gapPairs': sum(bool(v & GAP) for v in slots),
        'boundarySlots': sum(bool(v & 96) for v in slots),
        'boundaryRecords': boundary_records,
    }


def atomic_write(path, data):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as tmp:
        tmp.write(data)
    os.chmod(tmp.name, 0o644)
    os.replace(tmp.name, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Extracted v2.1.0 core directory containing manifest.json and years/')
    parser.add_argument('output', type=Path)
    parser.add_argument('--workers', type=int, choices=range(1, 17), default=2)
    args = parser.parse_args()
    raw = (args.source / 'manifest.json').read_bytes()
    if hashlib.sha256(raw).hexdigest() != CORE_MANIFEST_SHA256:
        raise ValueError('Expected the core manifest from corpus-v' + EDITION)
    source = json.loads(raw)
    last = date.fromisoformat(source['lastDate'])
    data, years = bytearray(), []
    tasks = [(args.source, y, last) for y in source['years']]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        for block, year in pool.map(read_year, tasks):
            years.append(dict(year, offset=len(data)))
            data.extend(block)
    if len(data) * 2 != source['records']:
        raise ValueError('Incomplete corpus')
    digest = hashlib.sha256(data).hexdigest()
    name = 'patterns-' + digest[:16] + '.bin'
    totals = {key: sum(y[key] for y in years)
              for key in ('slots', 'mixedSlots', 'gapPairs', 'boundarySlots', 'boundaryRecords')}
    manifest = {
        'format': 1, 'edition': EDITION, 'coreManifestSha256': CORE_MANIFEST_SHA256,
        'firstDate': source['firstDate'], 'lastDate': source['lastDate'], 'records': source['records'],
        'minimumGapDays': MIN_GAP_DAYS, 'file': name, 'sha256': digest, 'totals': totals, 'years': years,
    }
    args.output.mkdir(parents=True, exist_ok=True)
    atomic_write(args.output / name, data)
    atomic_write(args.output / 'index.json', (json.dumps(manifest, indent=2) + '\n').encode())
    print(json.dumps(totals), digest)


if __name__ == '__main__':
    main()
