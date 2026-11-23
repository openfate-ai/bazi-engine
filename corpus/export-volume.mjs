import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { readGzipLines } from './io.mjs';
import { lifeBook } from './book.mjs';
import { annualReadings } from './yearbook.mjs';
import { inputs, rowId } from './facts.mjs';

const [stage,yearText,inputDir,outputDir,...extra]=process.argv.slice(2), year=Number(yearText);
if(!['book','yearbook'].includes(stage)||!Number.isInteger(year)||year<1900||year>2026||!inputDir||!outputDir||extra.length)throw Error('Usage: node export-volume.mjs book|yearbook YEAR FACTS_OR_YEARS OUTPUT');
await mkdir(outputDir,{recursive:true});
const tmp=await mkdtemp(join(outputDir,'.writing-')), out=join(tmp,'annual.zst');
const zstd=spawn('zstd',['-q','-6','--long=25','-T1','-c'],{stdio:['pipe','pipe','inherit']});
const closed=new Promise((resolve,reject)=>{
  zstd.on('error',reject);
  zstd.on('close',code=>code===0?resolve():reject(Error('zstd exit '+code)));
});
async function* entries() {
  const keys=inputs(year);
  for await(const row of readGzipLines(join(inputDir,year+'.jsonl.gz'))) {
    const next=keys.next();
    if(next.done||rowId(next.value)!==row.id)throw Error('Yearbook input order: '+row.id);
    yield JSON.stringify(stage==='book'?{id:row.id,chapters:lifeBook(row)}:{id:row.id,years:[...annualReadings(row)]})+'\n';
  }
  if(!keys.next().done)throw Error('Incomplete source year '+year);
}
try{
  await Promise.all([closed,pipeline(entries(),zstd.stdin),pipeline(zstd.stdout,createWriteStream(out,{flags:'wx'}))]);
  await rename(out,join(outputDir,year+'.'+stage+'.jsonl.zst'));
}finally{
  zstd.kill();
  await rm(tmp,{recursive:true,force:true});
}
console.log(stage,year);
