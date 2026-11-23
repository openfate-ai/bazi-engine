"""Verify all released rows and calculate a reproducible manifest. Python 3.9+."""
import argparse
import calendar
import collections
import concurrent.futures
import functools
import gzip
import hashlib
import heapq
import itertools
import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path
import tempfile

from rule_check import verify_rules

FIRST, LAST = 1900, 2026
START, END = date(FIRST,1,1), date(LAST,11,22)
ROLES = ('year', 'month', 'day', 'hour')
TOPICS = ('overview', 'season', 'roots', 'learning', 'expression', 'work', 'wealth',
          'peers', 'relationship', 'interactions', 'onset', 'firstCycle', 'nextCycle')
STEMS = '甲乙丙丁戊己庚辛壬癸'
BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
KINDS = {
    'CLASH': '子午 丑未 寅申 卯酉 辰戌 巳亥',
    'COMBINATION_2': '子丑 寅亥 卯戌 辰酉 巳申 午未',
    'COMBINATION_HALF': '申子 子辰 亥卯 卯未 寅午 午戌 巳酉 酉丑',
    'TRINE': '申子辰 亥卯未 寅午戌 巳酉丑',
    'DIRECTIONAL': '寅卯辰 巳午未 申酉戌 亥子丑',
    'PUNISHMENT': '寅巳申 丑戌未 子卯 辰辰 午午 酉酉 亥亥',
    'DESTRUCTION': '子酉 丑辰 寅亥 卯午 巳申 未戌',
    'HARM': '子未 丑午 寅巳 卯辰 申亥 酉戌',
}
GROUPS = collections.defaultdict(list)
for kind, groups in KINDS.items():
    for group in groups.split():
        GROUPS[tuple(sorted(group))].append(kind)
METRICS = ('fourPillars', 'wholeReading', 'natalReading', 'work', 'wealth', 'relationship')


def require(ok, detail):
    if not ok:
        raise ValueError(detail)


def sha_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


@functools.lru_cache(maxsize=32768)
def relation_ids(branches):
    roles = ROLES + ('dayun',)
    output = set()
    for size in (2, 3):
        for ix in itertools.combinations(range(len(branches)), size):
            if len(branches) == 5 and 4 not in ix:
                continue
            for kind in GROUPS.get(tuple(sorted(branches[i] for i in ix)), ()):
                output.add(kind + ':' + '|'.join(roles[i] + ':' + branches[i] for i in ix))
    return output


def check_relations(rows, branches):
    ids = set()
    for rel in rows:
        roles = rel['pillars']
        actual = [branches[(ROLES + ('dayun',)).index(k)] for k in roles]
        require(actual == rel['branches'], 'wrong branch at role')
        identity = rel['type'] + ':' + '|'.join(a + ':' + b for a, b in zip(roles, actual))
        require(rel['id'] == identity and identity not in ids, 'invalid or duplicate relation')
        expected_status = 'NOT_EVALUATED' if rel['type'] in ('COMBINATION_2','COMBINATION_HALF','TRINE','DIRECTIONAL') else 'NOT_APPLICABLE'
        require(rel['transformationStatus'] == expected_status, 'unearned transformation status')
        ids.add(identity)
    require(ids == relation_ids(branches), 'missing or extra branch relationship')


@functools.lru_cache(maxsize=2048)
def tokens(pointer):
    require(pointer.startswith('/'), 'invalid evidence pointer')
    return tuple(s.replace('~1','/').replace('~0','~') for s in pointer[1:].split('/'))


def resolve(row, pointer):
    value = row
    path = tokens(pointer)
    require(path[0] in ('pillars','interactions','dayMaster','daYun','cycleRelations'), 'not a chart fact')
    for part in path:
        value = value[int(part)] if isinstance(value,list) else value[part]
    return value


def fingerprint(parts):
    return hashlib.sha256('\x1f'.join(parts).encode()).hexdigest()


def expected_ids(year):
    for offset in range(365 + calendar.isleap(year)):
        day = date(year,1,1) + timedelta(days=offset)
        if not START <= day <= END:
            continue
        for hour in range(0,24,2):
            for gender in ('female','male'):
                yield f'{day}T{hour:02}:30:00+08:00/{gender}', hour, gender


def inspect(row, hour, gender):
    verify_rules(row)
    pillars = [row['pillars'][k] for k in ROLES]
    branches = tuple(p['branch'] for p in pillars)
    require(row['fourPillars'] == ' '.join(p['stem']+p['branch'] for p in pillars), 'four pillar key')
    require(row['dayMaster'] == pillars[2]['stem'] and branches[3] == BRANCHES[hour//2], 'day or hour mismatch')
    for p in pillars:
        require(p['ganZhi'] == p['stem'] + p['branch'] and
                STEMS.index(p['stem']) % 2 == BRANCHES.index(p['branch']) % 2, 'invalid stem/branch')
        require(sum(h['isMain'] for h in p['hiddenStems']) == 1, 'hidden main qi')
    check_relations(row['interactions'], branches)
    yun = row['daYun']
    timing = yun['timing']
    require(timing['version'] == 'DAYUN_SECOND_V2' and timing['timezoneBasis'] == 8, 'timing basis')
    if timing['status'] == 'CALCULATED':
        require(len(yun['cycles']) == 9 and len(row['cycleRelations']) == 2, 'cycle coverage')
        yang_year = STEMS.index(pillars[0]['stem']) % 2 == 0
        require(yun['isForward'] == (yang_year == (gender == 'male')), 'direction')
        birth = datetime.fromisoformat(row['id'].split('/')[0])
        birth_utc = datetime.fromisoformat(timing['birthUtc'].replace('Z','+00:00'))
        jie = datetime.fromisoformat(timing['jieUtc'].replace('Z','+00:00'))
        require(birth == birth_utc and int(abs((jie-birth).total_seconds())) == timing['intervalSeconds'], 'jie interval')
        require((jie > birth) if yun['isForward'] else (jie <= birth), 'wrong side of jie')
        start = datetime.fromisoformat(yun['startDate'])
        require(start.year == yun['cycles'][0]['startYear'] and start >= birth.replace(tzinfo=None), 'onset')
        for i, cycle in enumerate(yun['cycles']):
            require(cycle['index'] == i+1 and cycle['startYear'] == start.year + i*10 and
                    cycle['endYear'] == cycle['startYear']+9 and cycle['ganZhi'] == cycle['stem']+cycle['branch'], 'cycle range')
        for cycle, rels in zip(yun['cycles'], row['cycleRelations']):
            check_relations(rels, branches + (cycle['branch'],))
    else:
        require(timing['status'] == 'UNAVAILABLE' and timing['reason'] == 'PILLAR_TERM_BOUNDARY_MISMATCH'
                and yun['isForward'] is None and yun['startDate'] is None and not yun['cycles']
                and not row['cycleRelations'], 'unavailable onset must be withheld')
    docs = row['readings']
    require(set(docs) == set(TOPICS) and len(set(row['labels'])) == len(row['labels']), 'topics or label uniqueness')
    resolved = set()
    for entry in docs.values():
        require(entry['title'] and entry['text'] and 'undefined' not in entry['text'] and entry['evidence'], 'empty reading')
        resolved.update(entry['evidence'])
    for ref in resolved:
        require(resolve(row,ref) is not None, 'unresolved evidence ' + ref)
    return len(resolved)


def inspect_year(args):
    directory, year, scratch = args
    source = directory/'years'/f'{year}.jsonl.gz'
    distinct = {key:set() for key in METRICS}
    inputs = expected_ids(year)
    reasons = collections.Counter()
    labels = collections.Counter()
    n = refs = raw = 0
    previous = None
    with gzip.open(source,'rb') as f:
        for key, line in itertools.zip_longest(inputs,f):
            require(key is not None and line is not None, f'{year}: input coverage')
            identifier, hour, gender = key
            try:
                row = json.loads(line)
                require(row['id'] == identifier, 'grid order')
                refs += inspect(row,hour,gender)
                paired = (row['pillars'],row['interactions'],row['trueSolarDateTime'],row['lunar'])
                if gender == 'male':
                    require(previous == paired, 'sex changed natal chart facts')
                else:
                    previous = paired
                status = row['daYun']['timing']
                reasons[status.get('reason',status['status'])] += 1
                labels.update(row['labels'])
                docs = row['readings']
                texts = [docs[k]['text'] for k in TOPICS]
                distinct['fourPillars'].add(row['fourPillars'])
                distinct['wholeReading'].add(fingerprint(texts))
                distinct['natalReading'].add(fingerprint(texts[:10]))
                for topic in METRICS[3:]:
                    distinct[topic].add(fingerprint([docs[topic]['text']]))
            except Exception as exc:
                raise ValueError(identifier + ': ' + str(exc)) from exc
            n += 1
            raw += len(line)
    for key, values in distinct.items():
        (scratch/f'{key}-{year}').write_text('\n'.join(sorted(values))+'\n',encoding='utf8')
    return {'year':year,'file':'years/'+source.name,'records':n,'sections':n*len(TOPICS),
            'bytes':source.stat().st_size,'uncompressedBytes':raw,'sha256':sha_file(source),
            'timing':dict(reasons),'resolvedEvidencePointersPerRowSummed':refs}, labels


def unique_count(scratch, metric):
    from contextlib import ExitStack
    with ExitStack() as files:
        streams = [files.enter_context(p.open(encoding='utf8')) for p in sorted(scratch.glob(metric+'-*'))]
        return sum(1 for _key,_group in itertools.groupby(heapq.merge(*streams)))


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('directory', type=Path)
    cli.add_argument('--workers',type=int,default=3)
    cli.add_argument('--record',action='store_true',help='create the verified manifest; otherwise check the existing one')
    opt=cli.parse_args()
    require(1 <= opt.workers <= 12,'workers must be 1 to 12')
    years=range(FIRST,LAST+1)
    expected={f'{y}.jsonl.gz' for y in years}
    require({p.name for p in (opt.directory/'years').iterdir()} == expected,'missing or unexpected annual files')
    result=[]; tags=collections.Counter()
    with tempfile.TemporaryDirectory() as tmp:
        scratch=Path(tmp)
        jobs=[(opt.directory,y,scratch) for y in years]
        with concurrent.futures.ProcessPoolExecutor(max_workers=opt.workers) as pool:
            for info,labels in pool.map(inspect_year,jobs):
                result.append(info); tags.update(labels)
                if info['year'] % 10 == 0: print('Verified through',info['year'],flush=True)
        unique={k:unique_count(scratch,k) for k in METRICS}
    n=sum(r['records'] for r in result)
    require(n == 1112328,'total coverage')
    timing=collections.Counter()
    for r in result: timing.update(r['timing'])
    manifest={'dataset':'OpenFate Bazi Corpus','version':'2.0.0','sectionsDefinition':'technical readings','readerEditionManifest':'edition-manifest.json','engine':'@openfate/bazi-engine@2.0.0',
              'range':[FIRST,LAST],'firstDate':START.isoformat(),'lastDate':END.isoformat(),'language':'zh-Hant','records':n,'sections':n*len(TOPICS),
              'topics':TOPICS,'distinct':unique,'timing':dict(timing),'labelCounts':dict(sorted(tags.items())),
              'sourceLockSha256':sha_file(Path(__file__).with_name('package-lock.json')),
              'years':result}
    encoded=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
    path=opt.directory/'manifest.json'
    if opt.record:
        with tempfile.NamedTemporaryFile(dir=path.parent,delete=False) as f:
            f.write(encoded); name=f.name
        os.replace(name,path)
    else:
        require(path.read_bytes() == encoded,'manifest mismatch')
    print(n,'rows;',manifest['sections'],'sections;',unique,dict(timing),flush=True)


if __name__ == '__main__':
    main()
