import random
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from freeze import TEACHING, UNSEEN, matches
from kit import build, layout, reader_files, table
from materials import CASES, CHARTS, EXAMS, HERE, LESSONS, chart, diagram, exam_pages, identity, lesson_pages
from score import CODES, FIELDS, KEY_FIELDS, REVIEW_ITEMS, evaluate, rows


class Materials(unittest.TestCase):
    def test_all_twelve_evidence_sets_and_swaps(self):
        self.assertEqual(Counter(c['topic'] for c in CASES), {'love':3,'temperament':2,'work':1})
        for case in CASES:
            for i,s in enumerate(case['sides']):
                with self.subTest(case=case['id'],hour=s['hour']):
                    own = chart(case,s)
                    other = chart(case,case['sides'][1-i])
                    self.assertEqual(own['fourPillars'].split()[:3],other['fourPillars'].split()[:3])
                    self.assertTrue(all(matches(own,cond) for cond in s['checks']))
                    self.assertFalse(all(matches(other,cond) for cond in s['checks']))
                    for k in ('title','body','evidence','ref'):
                        self.assertTrue(own['control'][k])

    def test_teaching_and_holdout_facts(self):
        def prop(d,h):
            return CHARTS[identity(d,h)]
        def hidden(row,pos):
            return ''.join(x['stem'] for x in row['pillars'][pos]['hiddenStems'])
        for pair,cond in [(('1991-10-19',8),['rel','CLASH','month,hour','戌辰']),
                          (('1991-10-19',8),['rel','CLASH','day,hour','戌辰']),
                          (UNSEEN[0],['rel','CLASH','month,hour','子午']),
                          (UNSEEN[0],['rel','CLASH','day,hour','子午'])]:
            self.assertTrue(matches(prop(*pair),cond))
        for h,expected in ((0,'己亥 丙子 甲戌 甲子'),(2,'己亥 丙子 甲戌 乙丑')):
            row = prop('1900-01-01',h)
            self.assertEqual(row['fourPillars'],expected)
            self.assertEqual(hidden(row,'day'),'戊辛丁')
            self.assertEqual(hidden(row,'hour'),'癸' if h==0 else '己癸辛')
        two = prop(*UNSEEN[1])
        self.assertEqual(two['fourPillars'],'辛亥 庚寅 甲子 乙丑')
        self.assertEqual(two['pillars']['year']['stemTenGod'],'正官')
        self.assertEqual([pos for pos in two['pillars'] if '辛' in hidden(two,pos)],['hour'])
        self.assertEqual(prop(*UNSEEN[2])['fourPillars'],'戊午 壬戌 辛亥 壬辰')
        self.assertEqual([(x['date'],x['hour']) for x in EXAMS],UNSEEN)
        training = {(c['date'],s['hour']) for c in CASES for s in c['sides']} | set(TEACHING)
        self.assertTrue(training.isdisjoint(UNSEEN))
        self.assertEqual(len(CHARTS), len(training)+3)

    def test_published_diagrams_and_test_secrecy(self):
        pdf_lessons = ''.join(lesson_pages())
        exams = ''.join(exam_pages())
        for l in LESSONS:
            self.assertEqual((HERE/(l['id']+'.svg')).read_text().strip(),diagram(l))
            self.assertIn(l['answer'],pdf_lessons)
            self.assertIn(l['answer'],(HERE/'lessons.md').read_text())
        for x in EXAMS:
            self.assertNotIn(x['date'],pdf_lessons)
            self.assertNotIn(x['rubric'],exams)
        self.assertEqual(LESSONS[2]['rows'][0][1:],['丙戌','戊戌','辛未','壬辰'])
        self.assertEqual(LESSONS[2]['rows'][1][1:],['丙戌','戊戌','辛未','丁酉'])

    def test_allocation_and_blinding(self):
        for seed in (1,2,3):
            run = layout(random.Random(seed))
            self.assertEqual(len(run),30)
            self.assertEqual(Counter(r[2] for r in run),{0:15,1:15})
            self.assertEqual(Counter(r[1] for r in run),{0:15,1:15})
            self.assertEqual(Counter(r[3]['id'] for r in run),{c['id']:5 for c in CASES})
            for c in CASES:
                group = [r for r in run if r[0]['id']==c['id']]
                self.assertEqual(len(group),5)
                self.assertEqual(len({(r[1],r[2]) for r in group}),4)
            for r in run:
                c,side,order,m,first,option = r
                self.assertNotEqual(c['date'],m['date'])
                docs,key = reader_files(r,'R01')
                vote,memory,recall,match = [''.join(s) for s in docs.values()]
                s = c['sides'][side]
                control = chart(c,s)['control']
                self.assertEqual(vote.index(s['body']) < vote.index(control['body']),key['preferred']=='A')
                self.assertIn(control['evidence'],vote)
                self.assertEqual(memory.index(m['sides'][0]['body']) < memory.index(m['sides'][1]['body']),first==0)
                self.assertEqual(match.index(m['sides'][0]['cue']) < match.index(m['sides'][1]['cue']),key['earlier']=='甲')
                for t in m['sides']:
                    self.assertNotIn(t['cue'],recall)
                for page_text in (vote,memory,recall,match):
                    for leak in ('v2.1','正式版','試讀稿','key.csv','正確答案','github.com'):
                        self.assertNotIn(leak,page_text)


class Scoring(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.packet = Path(t.name)/'packet'
        build(self.packet)
        self.host = self.packet/'主持人專用'
        self.responses = rows(self.host,'responses.csv',FIELDS)
        self.keys = {r['code']:r for r in rows(self.host,'key.csv',KEY_FIELDS)}

    def test_empty_packet(self):
        self.assertEqual(len(list(self.packet.rglob('*.html'))),123)
        self.assertEqual(set(r['code'] for r in self.responses),CODES)
        result = evaluate(self.host)
        self.assertFalse(result['passed'])
        self.assertEqual(sum(result[k] for k in ('preference','recall','transfer','experts')),0)

    def at_threshold(self):
        for row in self.responses:
            c = row['code']
            n = int(c[1:])
            row.update(person='test-'+c,eligible='1',d0='2026-12-01T09:00:00+08:00')
            if c[0]=='R':
                key = self.keys[c]
                early = key['earlier']
                row.update(preference=key['preferred'] if n<=21 else '無差',pref_at='2026-12-01T08:50:00+08:00',
                           recall_at='2026-12-02T09:00:00+08:00',options_at='2026-12-02T09:01:00+08:00',
                           match_at='2026-12-03T09:00:00+08:00',recall_ok='1' if n<=24 else '0',
                           earlier=early,later='乙' if early=='甲' else '甲')
            else:
                row.update(week_at='2026-12-08T09:00:00+08:00',q1='1',q2='1' if n<=24 else '0',q3='0')
        table(self.host/'responses.csv',FIELDS,self.responses)
        table(self.host/'panel.csv',('expert','person','qualified','independent'),
              [dict(expert=e,person=e,qualified='1',independent='1') for e in ('E1','E2')])
        fields = ('expert','item','verdict','note')
        data = [dict(expert=e,item=k,verdict='可用',note='測試用依據') for e in ('E1','E2') for k in REVIEW_ITEMS]
        table(self.host/'experts.csv',fields,data)
        return fields,data

    def test_exact_gates_and_expert_veto(self):
        fields,reviews = self.at_threshold()
        result = evaluate(self.host)
        self.assertEqual([result[k] for k in ('preference','recall','transfer','experts','passed')],[21,24,24,2,True])
        reviews[0]['verdict'] = '重大'
        table(self.host/'experts.csv',fields,reviews)
        self.assertFalse(evaluate(self.host)['passed'])

    def test_timing_missing_and_duplicates(self):
        self.at_threshold()
        self.responses[0]['options_at'] = '2026-12-02T08:59:00+08:00'
        self.responses[1]['later'] = self.responses[1]['earlier']
        self.responses[2]['preference'] = ''
        self.responses[30]['week_at'] = '2026-12-08T08:59:59+08:00'
        table(self.host/'responses.csv',FIELDS,self.responses)
        result = evaluate(self.host)
        self.assertEqual([result[k] for k in ('preference','recall','transfer','passed')],[20,22,23,False])
        for key,value in [('person',self.responses[1]['person']),('recall_at','2026-12-02T09:00:00'),
                          ('week_at','2026-12-08T09:00:00+08:00'),('code',self.responses[1]['code'])]:
            with self.subTest(key=key):
                row = dict(self.responses[0])
                row[key] = value
                table(self.host/'responses.csv',FIELDS,[row]+self.responses[1:])
                with self.assertRaises(ValueError):
                    evaluate(self.host)
