"""Independent tables and assertions for the corpus's stem, branch and label rules."""
from functools import lru_cache

STEMS = '甲乙丙丁戊己庚辛壬癸'
BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
HIDDEN = dict(zip(BRANCHES, '癸 己癸辛 甲丙戊 乙 戊乙癸 丙戊庚 丁己 己丁乙 庚壬戊 辛 戊辛丁 壬甲'.split()))
FAMILIES = {'印星': ('正印','偏印'), '食傷': ('食神','傷官'), '官殺': ('正官','七殺'),
            '財星': ('正財','偏財'), '比劫': ('比肩','劫財')}
TRAD = str.maketrans('财杀伤','財殺傷')
TITLES = {'CLASH':'相沖','COMBINATION_2':'六合','COMBINATION_HALF':'半合','TRINE':'三合',
          'DIRECTIONAL':'三會','PUNISHMENT':'相刑','DESTRUCTION':'相破','HARM':'相害'}
ROLE = {'year':'年','month':'月','day':'日','hour':'時'}


@lru_cache(maxsize=100)
def god(master, other):
    a, b = STEMS.index(master), STEMS.index(other)
    return (('比肩','劫財'),('食神','傷官'),('偏財','正財'),('七殺','正官'),('偏印','正印'))[
        (b//2-a//2) % 5][(a-b) % 2]


def verify_rules(row):
    pillars = row['pillars']
    master = row['dayMaster']
    year, month, day, hour = [pillars[k] for k in ROLE]
    if STEMS[(2*STEMS.index(master)+BRANCHES.index(hour['branch']))%10] != hour['stem']:
        raise ValueError('hour stem')
    if STEMS[(2*STEMS.index(year['stem'])+2+(BRANCHES.index(month['branch'])-2)%12)%10] != month['stem']:
        raise ValueError('month stem')
    labels = {'日主:'+master+'木火土金水'[STEMS.index(master)//2], '月令:'+month['branch'],
              '月令本氣:'+god(master,HIDDEN[month['branch']][0])}
    seen, hidden = set(), set()
    same = 0
    for role, value in zip(ROLE.values(), (year,month,day,hour)):
        stem = value['stem']
        expected = '日主' if role == '日' else god(master,stem)
        if expected != value['stemTenGod'].translate(TRAD):
            raise ValueError('visible ten god')
        if role != '日':
            seen.add(expected)
            labels.add(role+'干十神:'+expected)
        stems = value['hiddenStems']
        prescribed = HIDDEN[value['branch']]
        if {h['stem'] for h in stems} != set(prescribed) or len(stems) != len(prescribed):
            raise ValueError('hidden stem inventory')
        for h in stems:
            name = god(master,h['stem'])
            if name != h['tenGod'].translate(TRAD) or h['isMain'] != (h['stem'] == prescribed[0]):
                raise ValueError('hidden ten god or main qi')
            hidden.add(name)
            same += h['stem'] == master
    labels.add('日干同字藏支:'+str(same))
    for family, group in FAMILIES.items():
        visible = not seen.isdisjoint(group)
        stored = not hidden.isdisjoint(group)
        label = (('未見','僅藏支'),('僅透干','藏透俱見'))[visible][stored]
        labels.add(family+':'+label)
    pairs = []
    for r in row['interactions']:
        kind = TITLES[r['type']]
        labels.add('地支:'+kind)
        labels.add('柱位關係:'+'與'.join(ROLE[k]+'支'+b for k,b in zip(r['pillars'],r['branches']))+kind)
        pairs.append((r['type'],r['pillars']))
    overlaps = ['共用柱位:'+ROLE[p]+'支合沖並見' for kind, roles in pairs if kind=='CLASH'
                for link, linked in pairs if link in ('COMBINATION_2','COMBINATION_HALF','TRINE','DIRECTIONAL')
                for p in roles if p in linked]
    if overlaps:
        labels.add(overlaps[0])
    yun = row['daYun']
    if yun['cycles']:
        step = 1 if yun['isForward'] else -1
        labels.update(('大運:'+('順行' if step==1 else '逆行'), '首運:'+yun['cycles'][0]['ganZhi']))
        for i, cycle in enumerate(yun['cycles'],1):
            stem = STEMS[(STEMS.index(month['stem'])+step*i)%10]
            branch = BRANCHES[(BRANCHES.index(month['branch'])+step*i)%12]
            if cycle['ganZhi'] != stem+branch or cycle['stemTenGod'].translate(TRAD) != god(master,stem) or cycle['branchTenGod'].translate(TRAD) != god(master,HIDDEN[branch][0]):
                raise ValueError('decade stem, branch or ten god')
    else:
        labels.add('起運:交節待定')
    if labels != set(row['labels']):
        raise ValueError('label value or coverage')
