import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer as createProbeServer} from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

async function freePort(){
  const server=createProbeServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  return port;
}

test('local static server serves the app and bundled schedule with no API backend',async t=>{
  const port=await freePort();
  const child=spawn(process.execPath,['scripts/serve-static.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',data=>output+=data.toString());child.stderr.on('data',data=>output+=data.toString());
  t.after(()=>{if(!child.killed)child.kill();});
  let ready=false;
  for(let i=0;i<30;i++){
    try{const response=await fetch(`http://127.0.0.1:${port}/`);if(response.ok){ready=true;break;}}catch{}
    if(child.exitCode!==null)break;
    await delay(100);
  }
  assert.equal(ready,true,`static server did not start: ${output}`);
  const html=await (await fetch(`http://127.0.0.1:${port}/`)).text();
  assert.match(html,/data-runtime-mode="static"/);
  const schedule=await fetch(`http://127.0.0.1:${port}/data/schedules/31.05.01/4.json`);
  assert.equal(schedule.status,200);
  const payload=await schedule.json();
  assert.ok(payload.events.length>0);
  assert.ok(payload.weeklyBlocks.length>0);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status,404);
  assert.equal((await fetch(`http://127.0.0.1:${port}/`,{method:'POST'})).status,405);
});
