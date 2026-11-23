"""Package verified annual files, an offline reader and a complete reproduction kit."""
import argparse
import hashlib
import json
import os
from datetime import date
from pathlib import Path
import shutil
import tarfile
import tempfile

from lookup import TOPICS, find_row, markdown
from verify import sha_file
from reader_bundle import RUNTIME,bundle
from volume_lookup import stored, book_text, year_text

HERE = Path(__file__).resolve().parent
NAME = 'OpenFate-Bazi-Corpus-1900-2026-11-22-v2.1.0'
CODE = ('facts.mjs','generate.mjs','io.mjs','language.mjs','readings.mjs','rule_check.py','verify.py',
        'calendar_reference.py','lookup.py','reader.template.html','package.json','package-lock.json',
        'package_release.py','reproduce.py','README.md','DATASET-LICENSE.md','pmo1900.py',
        'compare_openings.py','export-volume.mjs','audit-volume.mjs','verify-edition.py','compare_editions.py','reader-panels.js',
        'reader_bundle.py','volume_lookup.py') + tuple(m+'.mjs' for m in RUNTIME if m!='language')
EXAMPLES = (
    ('1991 · 看同一柱的合與沖','1991-10-18','08:30','female'),
    ('1991 · 卯時，與辰時對讀','1991-10-18','06:30','female'),
    ('1991 · 同時出生，改用男性排運','1991-10-18','08:30','male'),
    ('1900 · 資料起點','1900-01-01','00:30','female'),
    ('1932 · 立春交節，起運待定','1932-02-05','08:30','female'),
    ('2000 · 公曆閏日','2000-02-29','12:30','female'),
    ('2026 · 資料終點','2026-11-22','22:30','male'),
)


def write_readers(root):
    samples = [{'name': name, 'row':find_row(root, date.fromisoformat(day), hour, gender)}
               for name, day, hour, gender in EXAMPLES]
    if not any(label.startswith('共用柱位:') for label in samples[0]['row']['labels']):
        samples[0]['name'] = '1991 · 工作、關係與大運'
    example = root/'examples'
    example.mkdir(exist_ok=True)
    buf = ''.join(json.dumps(s, ensure_ascii=False, separators=(',',':'))+'\n' for s in samples)
    (example/'examples.jsonl').write_text(buf,encoding='utf8')
    for s in samples:
        row = s['row']
        name = row['id'][:16].replace(':','-')+'-'+row['id'].split('/')[1]+'.md'
        (example/name).write_text(book_text(row,stored(root,row,'book')),encoding='utf8')
        if name == '1991-10-18T08-30-female.md':
            timed=stored(root,row,'yearbook')
            (example/'1991-midyear-2026.md').write_text(year_text(row,timed,2026),encoding='utf8')
    embedded = json.dumps(samples, ensure_ascii=False, separators=(',',':')).replace('<','\\u003c')
    template = (HERE/'reader.template.html').read_text(encoding='utf8')
    (root/'reader.html').write_text(template.replace('__RULES__',bundle()).replace('__PANELS__',(HERE/'reader-panels.js').read_text()).replace('__SAMPLE_JSON__',embedded).replace(
        '__TOPICS_JSON__',json.dumps(TOPICS,ensure_ascii=False)),encoding='utf8')


def copy_code(root):
    tools = root/'corpus'
    tools.mkdir(exist_ok=True)
    for name in CODE:
        shutil.copyfile(HERE/name,tools/name)
    (tools/'examples').mkdir(exist_ok=True)
    for name in ('1991-10-18T06-30-female.md','1932-02-05T08-30-female.md','1991-10-18T08-30-female.md','1900-01-01T00-30-female.md','1991-midyear-2026.md'):
        shutil.copyfile(root/'examples'/name,tools/'examples'/name)
    license_path = HERE.parent/'LICENSE'
    shutil.copyfile(license_path,root/'LICENSE')
    for name in ('lookup.py','volume_lookup.py','README.md','DATASET-LICENSE.md'):
        shutil.copyfile(HERE/name,root/name)


def pack(root, destination):
    if not destination.is_dir():
        raise ValueError('Create the archive output directory first.')
    manifest = json.loads((root/'manifest.json').read_text(encoding='utf8'))
    if manifest['records'] != 1112328 or len(manifest['years']) != 127:
        raise ValueError('Incomplete corpus manifest')
    audit = json.loads((root/'calendar-reference.json').read_text())
    if audit['dates'] != 46347 or audit['matched']+len(audit['differences']) != audit['dates']:
        raise ValueError('Incomplete calendar comparison')
    write_readers(root)
    copy_code(root)
    files = [root/y['file'] for y in manifest['years']]
    hashes = {}
    for file, info in zip(files,manifest['years']):
        digest = sha_file(file)
        if info['sha256'] != digest:
            raise ValueError('Annual digest differs from manifest: '+str(file))
        hashes[file] = digest
    edition=json.loads((root/'edition-manifest.json').read_text())
    if edition['charts']!=manifest['records']:raise ValueError('Incomplete reader edition')
    for metadata in edition['years']:
        for name,expected in metadata['files'].items():
            path=root/name
            digest=sha_file(path)
            if expected!=digest:raise ValueError('Edition digest differs: '+name)
            hashes[path]=digest
            files.append(path)
    files += [root/n for n in ('README.md','lookup.py','volume_lookup.py','DATASET-LICENSE.md','LICENSE','manifest.json',
                               'calendar-reference.json','edition-manifest.json','reader.html')]
    files+=sorted((root/'examples').iterdir()) + [root/'corpus'/name for name in CODE]
    files+=sorted((root/'corpus'/'examples').iterdir())
    sums = root/'SHA256SUMS'
    with sums.open('w',encoding='utf8',newline='\n') as out:
        for path in sorted(files):
            if path not in hashes:
                hashes[path] = sha_file(path)
            out.write(hashes[path]+'  '+path.relative_to(root).as_posix()+'\n')
    files.append(sums)
    hashes[sums] = sha_file(sums)
    for folder in ('core','books','yearbooks'):
        if folder=='core':
            chosen=[p for p in files if p.parent.name not in ('books','yearbooks')]
        else:
            chosen=[p for p in files if p.parent==root/folder]
        write_archive(root,destination,folder,chosen,hashes)


def write_archive(root,destination,folder,files,hashes):
    archive = destination/(NAME+'-'+folder+'.tar')
    with tempfile.TemporaryDirectory(dir=destination) as scratch:
        staging = Path(scratch)/archive.name
        with tarfile.open(staging,'w',format=tarfile.USTAR_FORMAT) as tar:
            for path in sorted(files):
                info = tarfile.TarInfo(NAME+'/'+path.relative_to(root).as_posix())
                info.size = path.stat().st_size
                info.mode = 0o644
                with path.open('rb') as source:
                    tar.addfile(info,source)
        seen = set()
        with tarfile.open(staging,'r|') as tar:
            for member in tar:
                relative = member.name.partition('/')[2]
                part = root/relative
                if member.name != NAME+'/'+relative or not member.isfile() or part not in hashes or part in seen:
                    raise ValueError('Unexpected archive entry: '+member.name)
                digest = hashlib.sha256()
                with tar.extractfile(member) as stream:
                    for block in iter(lambda: stream.read(1024*1024),b''):
                        digest.update(block)
                if digest.hexdigest() != hashes[part]:
                    raise ValueError('Changed archive content: '+member.name)
                seen.add(part)
        if seen != set(files):
            raise ValueError('Missing archive entries')
        os.replace(staging, archive)
    checksum = archive.with_suffix('.tar.sha256')
    checksum.write_text(sha_file(archive)+'  '+archive.name+'\n',encoding='utf8')
    print(archive, archive.stat().st_size, checksum.read_text().split()[0])


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('directory', type=Path)
    cli.add_argument('archives', type=Path)
    args = cli.parse_args()
    pack(args.directory, args.archives)
