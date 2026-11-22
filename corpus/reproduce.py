"""Recompute, independently verify and package the complete OpenFate Bazi Corpus."""
import argparse
import concurrent.futures
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from package_release import pack

HERE = Path(__file__).resolve().parent


def run(cmd):
    subprocess.run(cmd, cwd=HERE, check=True)


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('destination',type=Path,help='new directory for data/ and archive/')
    cli.add_argument('--calendar-cache',type=Path,help='reuse previously downloaded HKO source tables')
    cli.add_argument('--workers',type=int,default=3,choices=range(1,13))
    options = cli.parse_args()
    dest = options.destination.resolve()
    if dest.exists():
        cli.error('Choose a new destination directory.')
    if not (HERE/'node_modules'/'@openfate'/'bazi-engine').is_dir():
        cli.error('First run npm ci --ignore-scripts in corpus/.')
    dest.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(dir=dest.parent) as tmp:
        scratch = Path(tmp)
        output = scratch/'output'
        data, archive = output/'data',output/'archive'
        archive.mkdir(parents=True)
        facts = scratch/'facts'
        def year(y):
            run(['node','generate.mjs','facts',str(y),str(facts)])
            run(['node','generate.mjs','readings',str(y),str(facts),str(data/'years')])
        with concurrent.futures.ThreadPoolExecutor(max_workers=options.workers) as pool:
            list(pool.map(year,range(1930,2027)))
        run([sys.executable,'verify.py',str(data),'--record','--workers',str(options.workers)])
        cache = options.calendar_cache.resolve() if options.calendar_cache else scratch/'calendar'
        run([sys.executable,'calendar_reference.py',str(data),str(cache),'--fetch'])
        pack(data,archive)
        if dest.exists():
            raise FileExistsError(dest)
        os.rename(output,dest)


if __name__ == '__main__':
    main()
