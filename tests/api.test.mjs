import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const src=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('health, registration, device ingest, tamper deduplication, permissions',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'aplate-test-'));await cp(path.join(src,'server.mjs'),path.join(dir,'server.mjs'));await cp(path.join(src,'public'),path.join(dir,'public'),{recursive:true});
  const port=31000+Math.floor(Math.random()*5000);const child=spawn(process.execPath,['server.mjs'],{cwd:dir,env:{...process.env,PORT:String(port),DEVICE_KEY:'test-device-token',ADMIN_KEY:'test-admin-token',APLATE_SEED:'0',APLATE_SKIP_LOGIN:'0'},stdio:'ignore'});
  const url=`http://127.0.0.1:${port}`;try{
    let ready=false;for(let n=0;n<65;n++){try{let r=await fetch(url+'/api/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}assert.ok(ready,'server ready');
    const post=(route,data,keyName='x-admin-key',key='test-admin-token')=>fetch(url+route,{method:'POST',headers:{'content-type':'application/json',[keyName]:key},body:JSON.stringify(data)});
    let r=await post('/api/vehicles',{id:'V1',plate:'أ ب ج',model:'Test',city:'Riyadh',owner:'Fleet',deviceId:'D1'});assert.equal(r.status,200);
    r=await post('/api/vehicles',{id:'V1',plate:'أ ب ج',model:'Test',city:'Riyadh',owner:'Fleet',deviceId:'D1'});assert.equal(r.status,409);
    r=await post('/api/ingest',{deviceId:'D1',battery:90,tamper:true},'x-device-key','test-device-token');assert.equal(r.status,200);
    r=await post('/api/ingest',{deviceId:'D1',battery:88,tamper:true},'x-device-key','test-device-token');assert.equal(r.status,200);
    r=await fetch(url+'/api/state');assert.equal(r.status,401);
    r=await fetch(url+'/api/state',{headers:{'x-admin-key':'test-admin-token'}});let s=await r.json();assert.equal(s.vehicles[0].battery,88);assert.equal(s.alerts.length,1);
    r=await post('/api/inspectors',{name:'Test inspector',city:'Riyadh',phone:'0500000000'});assert.equal(r.status,200);r=await fetch(url+'/api/state',{headers:{'x-admin-key':'test-admin-token'}});s=await r.json();const inspectorId=s.inspectors[0].id;const alertId=s.alerts[0].id;r=await post('/api/alert-status',{id:alertId,status:'assigned',inspectorId,note:'تمت مراجعة البلاغ'});assert.equal(r.status,200);r=await fetch(url+'/api/state',{headers:{'x-admin-key':'test-admin-token'}});s=await r.json();assert.equal(s.alerts[0].notes[0].text,'تمت مراجعة البلاغ');assert.equal(s.inspectors[0].status,'busy');r=await post('/api/alert-status',{id:alertId,status:'resolved',inspectorId});assert.equal(r.status,200);r=await post('/api/alert-note',{id:alertId,note:'ملاحظة متابعة جديدة'});assert.equal(r.status,200);
    r=await fetch(url+'/api/state',{headers:{'x-admin-key':'test-admin-token'}});s=await r.json();assert.ok(s.alerts[0].notes.some(n=>n.text==='ملاحظة متابعة جديدة'));
    r=await post('/api/alert-delete',{id:alertId});assert.equal(r.status,200);
    r=await fetch(url+'/api/state',{headers:{'x-admin-key':'test-admin-token'}});s=await r.json();assert.equal(s.alerts.length,0);
    r=await post('/api/alerts',{vehicleId:'V1',type:'other',severity:'high',message:'test'},'x-admin-key','incorrect');assert.equal(r.status,401);
    r=await fetch(url+'/api/session');assert.equal((await r.json()).authenticated,false);
    r=await fetch(url+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'tester',password:'wrong'})});assert.equal(r.status,401);
    r=await fetch(url+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'tester',password:'test-admin-token'})});assert.equal(r.status,200);
    const cookie=r.headers.get('set-cookie').split(';')[0];
    assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
    r=await fetch(url+'/api/session',{headers:{cookie}});assert.equal((await r.json()).authenticated,true);
    r=await fetch(url+'/api/state',{headers:{cookie}});assert.equal(r.status,200);
    const stream=await fetch(url+'/api/events',{headers:{cookie}});assert.equal(stream.status,200);
    const reader=stream.body.getReader();let first=await reader.read();assert.match(new TextDecoder().decode(first.value),/connected/);
    r=await post('/api/alerts',{vehicleId:'V1',type:'other',severity:'high',message:'trigger event'});assert.equal(r.status,200);
    const second=await Promise.race([reader.read(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('No SSE event')),1500))]);assert.match(new TextDecoder().decode(second.value),/event: state/);await reader.cancel();
    r=await fetch(url+'/api/logout',{method:'POST',headers:{cookie}});assert.equal(r.status,200);
    assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
    r=await fetch(url+'/api/session',{headers:{cookie}});assert.equal((await r.json()).authenticated,false);
    for(const route of ['/api/state','/api/events']){r=await fetch(url+route,{headers:{cookie}});assert.equal(r.status,401)}
    r=await fetch(url+'/api/vehicles',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({id:'blocked'})});assert.equal(r.status,401);
    r=await fetch(url+'/../server.mjs');assert.notEqual(r.status,200);
  }finally{
    if(child.exitCode===null&&child.signalCode===null){
      const stopped=once(child,'exit').catch(()=>{});
      child.kill('SIGTERM');await Promise.race([stopped,new Promise(r=>setTimeout(r,3000))]);
    }
    // On Windows file locks may remain briefly after the child exits.
    for(let attempt=0;attempt<12;attempt++){
      try{await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});break}
      catch(e){if(!['EBUSY','EPERM','ENOTEMPTY'].includes(e.code)||attempt===11)throw e;await new Promise(r=>setTimeout(r,200))}
    }
  }
});
