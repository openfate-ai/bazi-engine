"""Compare the published teaching cases with the files from corpus-v2.0.0."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys


def digest(path):
    hasher = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            hasher.update(block)
    return hasher.hexdigest()


def resolve(record, pointer):
    value = record
    for part in pointer.split('/')[1:]:
        key = part.replace('~1', '/').replace('~0', '~')
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value


def compare(stream, records):
    # The pinned compact JSONL files put the birth ID first.
    prefixes = {('{"id":"' + birth + '",').encode(): birth for birth in records}
    found = set()
    for line in stream:
        prefix, sep, _ = line[:64].partition(b'",')
        birth = prefixes.get(prefix + sep)
        if birth is None:
            continue
        if birth in found:
            raise ValueError('duplicate ID ' + birth)
        record = json.loads(line)
        for pointer, expected in records[birth].items():
            actual = resolve(record, pointer)
            if type(actual) is not type(expected) or actual != expected:
                raise ValueError(f'{birth} {pointer}: {actual!r} differs from {expected!r}')
        found.add(birth)
    missing = records.keys() - found
    if missing:
        raise ValueError('missing IDs: ' + ', '.join(sorted(missing)))


def run(root):
    data = json.loads(Path(__file__).with_name('evidence.json').read_text(encoding='utf-8'))
    for filename, item in data['files'].items():
        path = root / filename
        if not path.is_file():
            path = root / Path(filename).name
        if digest(path) != item['sha256']:
            raise ValueError('SHA-256 mismatch: ' + str(path))
        if path.suffix == '.gz':
            with gzip.open(path, 'rb') as stream:
                compare(stream, item['records'])
        else:
            with subprocess.Popen(['zstd', '-dcq', '--long=25', str(path)], stdout=subprocess.PIPE) as proc:
                try:
                    compare(proc.stdout, item['records'])
                finally:
                    proc.stdout.close()
                if proc.wait() != 0:
                    raise ValueError('zstd could not read ' + str(path))
        print(f'{filename}  {len(item["records"])} records verified')
    ids = {birth for item in data['files'].values() for birth in item['records']}
    count = sum(len(fields) for item in data['files'].values() for fields in item['records'].values())
    print(f'{len(ids)} birth inputs, {count} field comparisons')


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('directory', type=Path, help='unpacked corpus or folder of individual release assets')
    try:
        run(cli.parse_args().directory.resolve())
    except (OSError, ValueError, KeyError, IndexError) as exc:
        sys.exit(str(exc))
