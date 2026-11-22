"""Select a single prewritten chart by its verified position in a compressed annual edition."""
import json
from datetime import date
import subprocess

def stored(root, row, kind):
    birth, sex=row['id'].split('/')
    civil=date.fromisoformat(birth[:10]); hour=int(birth[11:13])
    position=(civil-date(civil.year,1,1)).days*24+hour+(sex=='male')
    folder='books' if kind=='book' else 'yearbooks'
    path=root/folder/f'{civil.year}.{kind}.jsonl.zst'
    proc=subprocess.Popen(['zstd','-dcq','--long=25',str(path)],stdout=subprocess.PIPE)
    try:
        for i,line in enumerate(proc.stdout):
            if i==position:
                doc=json.loads(line)
                if doc['id']!=row['id']:raise ValueError('Edition join mismatch')
                return doc
        raise ValueError('Missing record in '+str(path))
    finally:
        if proc.poll() is None:proc.terminate()
        proc.wait()
        proc.stdout.close()

def book_text(row, doc):
    lines=['# '+row['fourPillars'],'',row['id'],'','真太陽時 '+row['trueSolarDateTime'],'']
    for chapter in doc['chapters'].values():
        lines+=['## '+chapter['title'],'']
        for part in chapter['parts']:
            lines+=['### '+part['name'],'',part['text'],'','依據 '+ '、'.join('\x60'+r+'\x60' for r in part['ref']),'']
    return '\n'.join(lines)

def year_text(row, doc, selected=None):
    lines=['# '+row['fourPillars']+' · 逐年對讀','',row['id'],'']
    if not doc['years']:return '\n'.join(lines+['交節待定，本筆沒有精確起運日期。',''])
    chosen=[v for v in doc['years'] if selected is None or v['year']==selected]
    if not chosen:raise ValueError('Selected year is outside the nine published luck cycles.')
    for entry in chosen:
        lines+=['## '+str(entry['year'])+' · '+entry['ganzhi'],'',
                '7 月 1 日中午，週歲 '+str(entry['age'])+' 歲。','',entry['text'],'',
                '依據 '+'、'.join('\x60'+r+'\x60' for r in entry['evidence']),'']
    return '\n'.join(lines)
