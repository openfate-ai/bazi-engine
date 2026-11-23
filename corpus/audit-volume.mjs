import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { readGzipLines } from './io.mjs';
import { inputs, rowId } from './facts.mjs';

const [root,yearText,output]=process.argv.slice(2), year=Number(yearText);
const file=(folder,suffix)=>join(root,folder,year+suffix);
const ensure=(ok,msg)=>{if(!ok)throw Error(msg);};
const mainTopics='temperament work money love family friends learning voice home change rest care direction'.split(' ');
const positional=['year','month','day','hour'], stem='甲乙丙丁戊己庚辛壬癸', branches='子丑寅卯辰巳午未申酉戌亥';
const family=[['比肩','劫財'],['食神','傷官'],['偏財','正財'],['七殺','正官'],['偏印','正印']];
const options=['peer','output','wealth','duty','support'];
const trad=s=>s.replaceAll('财','財').replaceAll('伤','傷').replaceAll('杀','殺');
const paths=new Map();
function resolve(row,path){
  if(!paths.has(path))paths.set(path,path.slice(1).split('/'));
  let data=row;
  for(const key of paths.get(path))data=data?.[key];
  ensure(data!==undefined && data!==null,'Unresolved receipt '+path);
}
async function* zlines(path) {
  const proc=spawn('zstd',['-dcq','--long=25',path],{stdio:['ignore','pipe','inherit']});
  const finished=new Promise((ok,no)=>{proc.on('error',no);proc.on('close',code=>code===0?ok():no(Error('zstd exit '+code)));});
  finished.catch(()=>{});
  try {
    for await (const line of createInterface({input:proc.stdout,crlfDelay:Infinity}))yield JSON.parse(line);
    await finished;
  }finally{proc.kill();await finished.catch(()=>{});}
}
async function fileHash(path){
  const hash=createHash('sha256');for await(const b of createReadStream(path))hash.update(b);return hash.digest('hex');
}
const marker=/[\u3400-\u4dbf\u4e00-\u9fff]/gu;
const han=s=>(s.match(marker)||[]).length;
const stats={year,charts:0,chapters:0,cases:0,annualEntries:0,withheld:0,samples:[]};
const wanted=new Set();
if(year>=1950){
  for(let q=0;q<4;q++){
    const d=new Date(Date.UTC(year,0,1+q*90+((year-1950)*7+17)%80)).toISOString().slice(0,10);
    wanted.add(d+'T'+String(2*((year-1950+q*3)%12)).padStart(2,'0')+':30:00+08:00/'+((year+q)%2?'male':'female'));
  }
  if(year===1991)wanted.add('1991-10-18T08:30:00+08:00/female');
}
const books=zlines(file('books','.book.jsonl.zst')), years=zlines(file('yearbooks','.yearbook.jsonl.zst'));
const grid=inputs(year);
const cachedGod=Object.fromEntries([...stem].map((m,ix)=>[m,[...stem].map((s,j)=>family[((j>>1)-(ix>>1)+5)%5][(ix+j)%2])]));
let active='start';
try {
 for await(const row of readGzipLines(file('years','.jsonl.gz'))){
  active=row.id;
  const [bv,av]=await Promise.all([books.next(),years.next()]);const book=bv.value, al=av.value;
  const expected=grid.next();
  ensure(!expected.done&&rowId(expected.value)===active&&book.id===active&&al.id===active,'grid/edition join');
  const hits={};const mapped=positional.map(k=>row.pillars[k]);
  for(const [i,k] of options.entries())hits[k]=mapped.some((p,j)=>j!==2&&family[i].includes(trad(p.stemTenGod)));
  for(const [i,k] of positional.entries())hits[k+'Link']=row.interactions.some(r=>r.pillars.includes(k));
  hits.clash=row.interactions.some(r=>r.type==='CLASH');
  hits.roots=mapped.some(p=>p.hiddenStems.some(h=>h.stem===row.dayMaster));
  hits.monthRoot=mapped.some((p,j)=>j!==2&&p.stem===mapped[1].hiddenStems.find(h=>h.isMain).stem);
  ensure(Object.keys(book.chapters).join(' ')==mainTopics.join(' '),'topic order');
  const referenced=new Set();const sample=wanted.has(active);let bodyHan=0,commonCaseHan=0,conditionalCaseHan=0;
  for(const item of Object.values(book.chapters)){
    let cases=0;ensure(item.title && item.parts.length>=10,'missing chapter');
    for(const bit of item.parts){
      ensure(bit.name && bit.text && bit.ref.length,'empty chapter part');for(const ref of bit.ref)referenced.add(ref);
      if(bit.caseSignal){
        ensure(Object.hasOwn(hits,bit.caseSignal)&&hits[bit.caseSignal]===bit.side,'wrong natal case branch');
        cases++;
        if(sample){const para=bit.text.split('\n\n');ensure(para.length===3,'case paragraphs');commonCaseHan+=han(para[0])+han(para[2]);conditionalCaseHan+=han(para[1]);}
      }
      if(sample)bodyHan+=han(bit.text);
    }
    ensure(cases===5,'five decision cases');stats.cases+=cases;stats.chapters++;
  }
  for(const ref of referenced)resolve(row,ref);
  if(sample)stats.samples.push({id:active,bodyHan,commonCaseHan,conditionalCaseHan});
  const dated=row.daYun.timing.status==='CALCULATED', entries=al.years;
  ensure(entries.length===(dated?90:0),'annual coverage');
  if(!dated)stats.withheld++;
  if(dated){
    const d=row.daYun.startDate, first=Number(d.slice(0,4))+Number(d.slice(5)>'07-01 12:00:00');
    const src=active.slice(0,10), birth=Number(src.slice(0,4)), adjust=Number(src.slice(5)>'07-01');
    const natal=mapped.map(p=>branches.indexOf(p.branch));const gd=cachedGod[row.dayMaster];
    const labels=['年支','月支','日支','時支','運支'];
    for(let ci=0;ci<9;ci++){
      const cycle=row.daYun.cycles[ci];const targets=[...natal,branches.indexOf(cycle.branch)];
      for(let k=0;k<10;k++){
        const j=ci*10+k, e=entries[j], yr=first+j, si=(yr+56)%10, bi=(yr+56)%12;
        ensure(e.year===yr&&e.cycleIndex===ci&&e.age===yr-birth-adjust&&e.ganzhi===stem[si]+branches[bi]&&e.tenGod===gd[si],'annual year/age/god');
        let count=0;
        for(const [i,target] of targets.entries()){
          const rel=bi===target?'同支':Math.abs(bi-target)===6?'相沖':(bi+target===1||bi+target===13)?'六合':'';
          if(rel){ensure(e.contacts[count++]===labels[i]+branches[target]+rel,'annual contact');}
        }
        ensure(count===e.contacts.length && e.text.length>120 && e.text.includes(e.ganzhi) && e.evidence.includes('/daYun/cycles/'+ci),'annual body or receipt');
        if(sample || j===0 || j===89)for(const ref of e.evidence)resolve(row,ref);
      }
    }
  }
  stats.charts++;stats.annualEntries+=entries.length;
 }
 ensure(grid.next().done&&(await books.next()).done&&(await years.next()).done,'extra or missing record');
} catch(error){throw Error(active+': '+error.message,{cause:error});}
stats.files={};
for(const [folder,suffix] of [['books','.book.jsonl.zst'],['yearbooks','.yearbook.jsonl.zst']]){
 const path=file(folder,suffix);stats.files[folder+'/'+year+suffix]=await fileHash(path);
}
await writeFile(output+'.part',JSON.stringify(stats));await rename(output+'.part',output);
console.log('Verified edition',year, stats.charts);
