"""Verify the reader's edition and write its reproducible distribution manifest."""
import argparse
import concurrent.futures
import json
import tempfile
import subprocess
from pathlib import Path

HERE=Path(__file__).resolve().parent

def merge(root, scratch, record):
    rows=[json.loads((scratch/f'{year}.json').read_text()) for year in range(1900,2027)]
    sums={k:sum(r[k] for r in rows) for k in ('charts','chapters','cases','annualEntries','withheld')}
    if sums['charts']!=1112328 or sums['chapters']!=sums['charts']*13 or sums['cases']!=sums['charts']*65 or sums['annualEntries']!=(sums['charts']-sums['withheld'])*90:
        raise ValueError(f'Incomplete coverage: {sums}')
    base=json.loads((root/'manifest.json').read_text())
    if base['records']!=sums['charts'] or base['timing']['CALCULATED']*90!=sums['annualEntries']:
        raise ValueError('Base and edition manifest disagree')
    output={'version':'2.1.0','factsVersion':'2.0.0','firstDate':'1900-01-01','lastDate':'2026-11-22','language':'zh-Hant',
            'dates':46347,**sums,'matchedSampleLengths':[s for r in rows for s in r['samples']],'years':[{k:v for k,v in r.items() if k!='samples'} for r in rows]}
    data=(json.dumps(output,ensure_ascii=False,indent=2)+'\n').encode()
    path=root/'edition-manifest.json'
    if record:path.write_bytes(data)
    elif path.read_bytes()!=data:raise ValueError('Edition manifest mismatch')
    return rows

def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('directory',type=Path)
    cli.add_argument('--workers',default=3,type=int,choices=range(1,13))
    cli.add_argument('--record',action='store_true')
    args=cli.parse_args()
    root=args.directory.resolve()
    with tempfile.TemporaryDirectory() as temp:
        scratch=Path(temp)
        def run(year):
            subprocess.run(['node',str(HERE/'audit-volume.mjs'),str(root),str(year),str(scratch/f'{year}.json')],check=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            list(pool.map(run,range(1900,2027)))
        merge(root,scratch,args.record)

if __name__=='__main__':main()
