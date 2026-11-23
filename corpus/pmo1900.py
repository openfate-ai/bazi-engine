"""Extract daily lunar fields and sexagenary day from Purple Mountain Observatory pages 3–5."""
import calendar
import re
import subprocess
from datetime import date

SOURCE='https://pmo.cas.cn/xwdt2019/kpdt2019/202203/P020250414456381274062.pdf'
NUM='一二三四五六七八九十'
DAYS=(['初'+x for x in NUM]+['十'+x for x in NUM[:9]]+['二十']+
      ['廿'+x for x in NUM[:9]]+['三十'])
MONTHS=['正','二','三','四','五','六','七','八','九','十','十一','十二']
ENTRY=re.compile(r'(?:(闰?)(正|十一|十二|[二三四五六七八九十])月\s*)?('+'|'.join(DAYS)+r')\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])')

def read_pmo(path):
    text=subprocess.check_output(['pdftotext','-f','3','-l','5','-layout',str(path),'-']).decode()
    cells={}
    for q,page in enumerate(text.split('\f')[:3]):
        for line in page.splitlines():
            match=re.match(r'^\s*(\d{1,2})\s+',line)
            if not match:continue
            d=int(match[1])
            cols=[m for m in range(1+q*4,5+q*4) if 1<=d<=calendar.monthrange(1900,m)[1]]
            values=ENTRY.findall(line)
            if not values:continue
            if len(values)!=len(cols):raise ValueError('PMO row: '+line)
            for m,v in zip(cols,values):cells[date(1900,m,d).isoformat()]=v
    if len(cells)!=365:raise ValueError('Incomplete 1900 reference')
    result={}; gan={}; year=1899; month=None; leap=False
    for day,(marker,m,d,stem) in sorted(cells.items()):
        if m:
            new=MONTHS.index(m)+1
            if new==1 and month!=1 and not marker:year+=1
            month=new;leap=bool(marker)
        if month is None:raise ValueError(day)
        result[day]=[year,month,DAYS.index(d)+1,leap]
        gan[day]=stem
    return result,gan
