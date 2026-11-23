"""Compare published Chinese body text for four predetermined birth inputs per shared year and one example."""
import argparse
import concurrent.futures
from datetime import date, timedelta
import json
from pathlib import Path
import re
import statistics
import subprocess
import tarfile
import tempfile

HAN = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff]')
def count(text):
    return len(HAN.findall(text))

def grid(year):
    start = date(year,1,1)
    cases = set()
    for quarter in range(4):
        civil = start + timedelta(days=quarter*90+((year-1950)*7+17)%80)
        branch = ((year-1950)+quarter*3)%12
        sex = ('female','male')[(year+quarter)%2]
        if civil<=date(2026,11,22):cases.add((civil.isoformat(),branch,sex))
    if year==1991:
        cases.add(('1991-10-18',4,'female'))
    return sorted(cases)

def ziwei(args):
    archive, year = args
    grid_lookup = {f'{d}-{h}-{s}':(d,h,s) for d,h,s in grid(year)}
    # Match just the key bytes on unselected rows; never copy third-party prose into the report.
    found = {}
    with tarfile.open(archive) as tar, tempfile.TemporaryFile() as tmp:
        tmp.write(tar.extractfile(f'year-{year}.jsonl.zst').read()); tmp.seek(0)
        with subprocess.Popen(['zstd','-dcq','--long=27'],stdin=tmp,stdout=subprocess.PIPE) as proc:
            for line in proc.stdout:
                prefix = line[:80].split(b'"k":"',1)
                if len(prefix)!=2: raise ValueError('unrecognized competitor format')
                key=prefix[1].split(b'"',1)[0].decode()
                if key in grid_lookup:
                    row=json.loads(line)
                    if len(row['c'])!=13: raise ValueError(key)
                    found[key]=sum(count(s) for s in row['c'].values())
            if proc.wait(): raise ValueError(year)
    if set(found)!=set(grid_lookup): raise ValueError(f'missing comparison keys for {year}')
    return found

def compare(edition, external):
    pairs=[]
    for item in edition['matchedSampleLengths']:
        birth,sex=item['id'].split('/')
        short=f"{birth[:10]}-{int(birth[11:13])//2}-{sex}"
        pairs.append({**item,'ziweiHan':external[short]})
    known={f'{d}-{h}-{s}' for y in range(1950,2027) for d,h,s in grid(y)}
    if len(pairs)!=len(known) or len(set(p['id'] for p in pairs))!=len(known):raise ValueError('sample coverage')
    return {'scope':'13 life chapters of each corpus; headings, receipts, OpenFate technical readings and annual yearbooks excluded',
            'sampling':'Four deterministic calendar dates and alternating sex per shared year, plus one named example. Exclude dates after 2026-11-22.',
            'metric':'Count Han characters U+3400–4DBF and U+4E00–9FFF. Repeated wording is counted everywhere it occurs.',
            'openfate':'corpus-v'+edition['version'],'competitor':'Renhuai123/ziwei-doushu interpretation dataset v4.0',
            'samples':len(pairs),'medianOpenFate':statistics.median(p['bodyHan'] for p in pairs),
            'medianZiwei':statistics.median(p['ziweiHan'] for p in pairs),
            'openfateLonger':sum(p['bodyHan']>p['ziweiHan'] for p in pairs),'pairs':pairs}

def run():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('competitor_archive',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('--edition',type=Path,help='edition-manifest.json to produce a matched report')
    args=parser.parse_args()
    all_counts={}
    with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
        for selected in pool.map(ziwei,((args.competitor_archive,y) for y in range(1950,2027))):
            all_counts.update(selected)
    report=compare(json.loads(args.edition.read_text()),all_counts) if args.edition else all_counts
    args.output.write_text(json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    print(len(all_counts),'comparison charts; median Han body length',statistics.median(all_counts.values()))
if __name__=='__main__':
    run()
