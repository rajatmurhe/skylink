import {Worker} from 'node:worker_threads';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const dir=resolve('dist/assets');
async function run(prefix,data){
 const file=readdirSync(dir).find(f=>f.startsWith(prefix)&&f.endsWith('.js'));
 assert(file,`Build ${prefix} first with npm run build`);
 return new Promise((resolveResult,reject)=>{
  const worker=new Worker(`const {parentPort}=require('node:worker_threads');global.self={postMessage:d=>parentPort.postMessage(d)};import(${JSON.stringify(pathToFileURL(resolve(dir,file)).href)}).then(()=>self.onmessage({data:${JSON.stringify(data)}}));`,{eval:true});
  const timer=setTimeout(()=>{worker.terminate();reject(new Error(`${prefix} timed out`))},60000);
  worker.on('error',e=>{clearTimeout(timer);worker.terminate();reject(e)});
  worker.on('message',d=>{if(d.type==='COMPLETE'){clearTimeout(timer);worker.terminate();resolveResult(d)}});
 });
}
const batch=await run('batch.worker',{numRuns:10,startSeed:5000,strategies:['baseline','skylink_utility']});
assert.equal(batch.rawResults.length,20);assert.equal(batch.stats.length,2);
for(const r of batch.rawResults){assert(r.capturedValue>=0&&r.capturedValue<=r.totalValue);assert(Number.isFinite(r.batteryUsedWh)&&r.batteryUsedWh>=0);assert(Number.isFinite(r.outageSeconds)&&r.outageSeconds>=0);}
for(const s of batch.stats){assert(s.completionRatePct>=0&&s.completionRatePct<=100);assert(s.safeReturnSuccessPct>=0&&s.safeReturnSuccessPct<=100);}
// Independently reconcile every displayed aggregate with exported raw rows.
for (const stat of batch.stats) {
 const rows=batch.rawResults.filter(r=>r.strategy===stat.strategy),n=rows.length;
 const avg=key=>rows.reduce((sum,r)=>sum+r[key],0)/n;
 const ci=key=>{const mean=avg(key);return 1.96*Math.sqrt(rows.reduce((sum,r)=>sum+(r[key]-mean)**2,0)/Math.max(1,n-1))/Math.sqrt(n)};
 assert.equal(stat.meanValueCaptured,Number(avg('capturedValue').toFixed(2)));
 assert.equal(stat.meanOutageSeconds,Number(avg('outageSeconds').toFixed(1)));
 assert.equal(stat.meanEnergyWh,Number(avg('batteryUsedWh').toFixed(1)));
 assert.equal(stat.ciValueCaptured,Number(ci('capturedValue').toFixed(2)));
 assert.equal(stat.ciOutageSeconds,Number(ci('outageSeconds').toFixed(1)));
 assert.equal(stat.completionRatePct,Number((100*rows.filter(r=>r.isCompleted).length/n).toFixed(1)));
 assert.equal(stat.safeReturnSuccessPct,Number((100*rows.filter(r=>r.isSafeReturn).length/n).toFixed(1)));
}
const zero=await run('batch.worker',{numRuns:1,startSeed:0,strategies:['baseline']});
assert.equal(zero.rawResults[0].seed,0);
const repeated=await run('batch.worker',{numRuns:10,startSeed:5000,strategies:['baseline','skylink_utility']});assert.deepEqual(batch,repeated);
const trained=await run('train.worker',{episodes:100});assert.equal(trained.qTable.numStates,1440);assert.equal(trained.qTable.qMatrix.length,1440);assert(trained.qTable.qMatrix.every(row=>row.length===6&&row.every(Number.isFinite)));assert(trained.qTable.qMatrix.flat().some(v=>v!==0));
console.log('PASS: 20-run benchmark, deterministic replay, bounded metrics, and 100-episode training with finite 1440 × 6 policy.');
console.log(JSON.stringify(batch.stats,null,2));
