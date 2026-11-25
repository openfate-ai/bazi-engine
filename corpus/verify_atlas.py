"""Independently audit every atlas status against the released chart fields."""
import argparse
import gzip
import hashlib
import json
from concurrent.futures import ProcessPoolExecutor
from datetime import date, timedelta
from pathlib import Path

from index_patterns import CORE_MANIFEST_SHA256, ROLES
from atlas_facts import KINDS

STEMS = '甲乙丙丁戊己庚辛壬癸'
MONTH_IDS = ('正官', '七杀', '正财', '偏财', '正印', '偏印', '食神', '伤官', '比肩', '劫财')
GROUPS = dict(zip(MONTH_IDS, ('官杀', '官杀', '财', '财', '印', '印', '食伤', '食伤', '比劫', '比劫')))
MONTH_PAIRS = (
    (('财', '印'), ('伤官', '七杀')), (('食神', '印'), ('正官',)),
    (('食伤', '官杀'), ('比劫',)), (('食伤', '官杀'), ('比劫',)),
    (('官杀',), ('财',)), (('官杀',), ('财', '食神')),
    (('财', '七杀'), ('偏印',)), (('印', '财'), ('正官',)),
    *((('官杀', '食伤', '财'), ()) for _ in range(3)), (('官杀',), ()),
)
CONTROLLER = {'wood':'metal', 'fire':'water', 'earth':'wood', 'metal':'fire', 'water':'earth'}
ELEMENTS = tuple(CONTROLLER)
FOLLOW = ('财', '官杀', '食伤', '杂', '印', '比劫')
RETINUES = (('亥卯未','寅卯辰'), ('寅午戌','巳午未'), ('辰戌丑未',), ('巳酉丑','申酉戌'), ('申子辰','亥子丑'))


def expected(chart):
    pillars = [chart['pillars'][role] for role in ROLES]
    outer = [pillars[i] for i in (0, 1, 3)]
    visible = [p['stem'] for p in outer]
    hidden = [h for p in pillars for h in p['hiddenStems']]
    month, day = pillars[1], pillars[2]
    first = month['hiddenStems'][0]
    exposed = [h for h in month['hiddenStems'] if h['stem'] in visible]
    chosen = exposed[0] if len(exposed) == 1 else first
    dm = day['stem']
    if month['branch'] == dict(zip(STEMS, '寅卯巳午巳午申酉亥子'))[dm]:
        frame = 10
    elif month['branch'] == dict(zip('甲丙戊庚壬', '卯午午酉子')).get(dm):
        frame = 11
    else:
        frame = MONTH_IDS.index(chosen['tenGod'])
    gods = {p['stemTenGod'] for p in outer}
    signals = gods | {GROUPS[g] for g in gods}
    support, conflict = MONTH_PAIRS[frame]
    result = bytearray(7)
    result[0] = frame | (16 if signals.intersection(support) and not signals.intersection(conflict) else 0)
    seven = [GROUPS[p['stemTenGod']] for p in outer] + [GROUPS[p['hiddenStems'][0]['tenGod']] for p in pillars]
    latent = {GROUPS[h['tenGod']] for h in hidden}
    all_groups = latent | set(seven)
    flags = []
    for target, pair in zip(ELEMENTS, ('丁壬','戊癸','甲己','乙庚','丙辛')):
        partner = pair.replace(dm, '') if dm in pair else ''
        adjacent = partner in (month['stem'], pillars[3]['stem'])
        checks = [dm in pair, adjacent and visible.count(partner) == 1 and dm not in visible,
                  first['element'] == target, all(h['element'] != day['element'] for h in hidden),
                  all(p['element'] != CONTROLLER[target] for p in outer if p['stem'] != partner)]
        flags.append(checks)
    for target in FOLLOW:
        if target == '杂':
            counts = [seven.count(g) for g in ('财','官杀','食伤')]
            checks = [not set(seven).intersection(('比劫','印')), min(counts) >= 1 and max(counts) <= 3,
                      not latent.intersection(('比劫','印'))]
        else:
            checks = [GROUPS[first['tenGod']] == target, seven.count(target) >= 4]
            if target in ('印','比劫'):
                checks.extend([set(seven) <= {'印','比劫'}, '官杀' not in latent])
            else:
                checks.append(not all_groups.intersection(('比劫','印')))
                if target == '官杀':
                    checks.append('食伤' not in seven)
                if target == '食伤':
                    checks.append('财' in seven)
        flags.append(checks)
    branches = {p['branch'] for p in pillars}
    for target, sets in zip(ELEMENTS, RETINUES):
        flags.append([day['element'] == target, any(set(s) <= branches for s in sets),
                      first['element'] == target, all(p['element'] != CONTROLLER[target] for p in outer)])
    for i, checks in enumerate(flags):
        if checks[0] and checks.count(False) <= 1:
            byte = (1 if all(checks) else 3) + i // 8
            result[byte] |= 1 << (i % 8)
    result[5] = sum(1 << KINDS.index(t) for t in {e['type'] for e in chart['interactions']})
    return result


def audit_year(task):
    root, entry, last, binary, offset = task
    file = root / entry['file']
    if hashlib.sha256(file.read_bytes()).hexdigest() != entry['sha256']:
        raise ValueError(f'Source checksum mismatch at {file}')
    slots = entry['records'] // 2
    with binary.open('rb') as data:
        data.seek(offset * 7)
        block = data.read(slots * 7)
    if len(block) != slots * 7:
        raise ValueError('Truncated atlas')
    start = date(entry['year'], 1, 1)
    if (min(last, date(start.year, 12, 31)) - start).days + 1 != slots // 12:
        raise ValueError('Invalid calendar grid')
    natal_codes = {}
    buckets = [[0, 0] for _ in range(28)]
    with gzip.open(file, 'rb') as lines:
        for i in range(slots):
            f, m = json.loads(next(lines)), json.loads(next(lines))
            time = (start + timedelta(days=i // 12)).isoformat() + f'T{i % 12 * 2:02d}:30:00+08:00/'
            if f['id'] != time+'female' or m['id'] != time+'male':
                raise ValueError(f'Grid ID differs at {time}')
            if any(f[k] != m[k] for k in ('fourPillars','pillars','interactions','dayMaster')):
                raise ValueError(f'Natal pair differs at {time}')
            row = expected(f)
            events = f['interactions']
            for j, role in enumerate(ROLES):
                types = {e['type'] for e in events if role in e['pillars']}
                if {'COMBINATION_2','CLASH'} <= types:
                    row[6] |= 1 << j
            starts = [c['daYun']['startDate'] for c in (f,m)]
            if all(starts):
                if abs((date.fromisoformat(starts[0][:10])-date.fromisoformat(starts[1][:10])).days) >= 1096:
                    row[6] |= 16
            for j, c in enumerate((f,m)):
                if starts[j] is None:
                    if c['daYun']['timing']['reason'] != 'PILLAR_TERM_BOUNDARY_MISMATCH':
                        raise ValueError(f'Unknown unavailable onset at {time}')
                    row[6] |= 32 << j
            # Memoize the chart key for independent per-rule cardinalities. Branch and onset flags
            # are orthogonal to the natal match set.
            natal = bytes(row[:5])
            if natal_codes.setdefault(f['fourPillars'], natal) != natal:
                raise ValueError('Same four pillars have different judgments')
            tally(buckets, natal)
            if row != block[i*7:(i+1)*7]:
                raise ValueError(f'Index differs at {time}: {list(row)} vs {list(block[i*7:(i+1)*7])}')
        if next(lines, None) is not None:
            raise ValueError('Surplus source records')
    return slots * 2, buckets, natal_codes


def tally(buckets, natal):
    buckets[natal[0] & 15][0 if natal[0] & 16 else 1] += 1
    for status, start in enumerate((1, 3)):
        mask = int.from_bytes(natal[start:start+2], 'little')
        while mask:
            bit = mask & -mask
            buckets[12 + bit.bit_length() - 1][status] += 1
            mask ^= bit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('index', type=Path)
    parser.add_argument('--workers', type=int, choices=range(1,17), default=4)
    args = parser.parse_args()
    raw = (args.source / 'manifest.json').read_bytes()
    if hashlib.sha256(raw).hexdigest() != CORE_MANIFEST_SHA256:
        raise ValueError('Unexpected source corpus')
    source = json.loads(raw)
    meta = json.loads((args.index / 'index.json').read_text())
    binary = args.index / meta['file']
    if (hashlib.sha256(binary.read_bytes()).hexdigest() != meta['sha256'] or
            binary.stat().st_size != source['records'] // 2 * 7):
        raise ValueError('Invalid atlas bytes')
    tasks, offset = [], 0
    for entry in source['years']:
        tasks.append((args.source, entry, date.fromisoformat(source['lastDate']), binary, offset))
        offset += entry['records'] // 2
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        records, unique = 0, {}
        totals = [[0, 0] for _ in range(28)]
        for num, buckets, codes in pool.map(audit_year, tasks):
            records += num
            for key, code in codes.items():
                if unique.setdefault(key, code) != code:
                    raise ValueError('Different judgments for repeated four pillars')
            for i, bucket in enumerate(buckets):
                for j, count in enumerate(bucket):
                    totals[i][j] += count
    distinct = [[0, 0] for _ in range(28)]
    for natal in unique.values():
        tally(distinct, natal)
    if len(unique) != meta['distinct'] or len(meta['rules']) != len(distinct):
        raise ValueError('Invalid distinct count or catalog length')
    for i, item in enumerate(meta['rules']):
        for j, status in enumerate(('match', 'review')):
            if item[status] != {'slots': totals[i][j], 'distinct': distinct[i][j]}:
                raise ValueError(f'Wrong published total: {item["id"]} {status}')
    if records != source['records']:
        raise ValueError('Incomplete audit')
    print(f'{records:,} rows, {offset:,} slots, all seven index bytes and all 112 category counts independently matched.')


if __name__ == '__main__':
    main()
