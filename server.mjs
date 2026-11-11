/** A-Plate reference API. Node >=20, no external dependencies.
 * Run behind HTTPS reverse proxy for production. Use a managed database for scale.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.join(root,'public'),dataDir=path.join(root,'data'),store=path.join(dataDir,'state.json');
const PORT=Number(process.env.PORT||3000),DEVICE_KEY=process.env.DEVICE_KEY||'',ADMIN_KEY=process.env.ADMIN_KEY||'';
const AUTO_LOCAL=process.env.APLATE_SKIP_LOGIN==='1';
const SESSION_AGE=8*60*60*1000;const sessions=new Map();
if(!DEVICE_KEY||!ADMIN_KEY||DEVICE_KEY===ADMIN_KEY){console.error('Set DEVICE_KEY and ADMIN_KEY environment variables before starting.');process.exit(1)}
const allowedMime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
let state={vehicles:[],alerts:[],inspectors:[],events:[],tasks:[]};if(existsSync(store)){try{const s=JSON.parse(await fs.readFile(store,'utf8'));if(Array.isArray(s.vehicles)&&Array.isArray(s.alerts))state=s}catch(e){console.error('State file corrupt:',e.message);process.exit(1)}}
await fs.mkdir(dataDir,{recursive:true});
if(!existsSync(store) && process.env.APLATE_SEED!=='0'){
const time=new Date().toISOString();
const cities=['الرياض','جدة','الدمام','مكة المكرمة','المدينة المنورة'];
state.vehicles=[
{id:'V18',plate:'8-50.44194',model:'تويوتا لاندكروزر 2023',city:'الرياض',owner:'شرطة الرياض',deviceId:'AP-745310',ip:'8.50.44.194',status:'online',battery:91,speed:42,lat:24.7136,lng:46.6753,lastSeen:time,version:'8.0.0',counter:1120,sensor:'0.0'},
{id:'V19',plate:'8-50.44195',model:'تويوتا كامري 2022',city:'الرياض',owner:'وزارة الداخلية',deviceId:'AP-745311',ip:'8.50.44.195',status:'alert',battery:72,speed:108,lat:24.7625,lng:46.6305,lastSeen:time,version:'8.0.0',counter:1030,sensor:'1.0'},
{id:'V20',plate:'8-50.44196',model:'هيونداي سوناتا 2023',city:'الرياض',owner:'شرطة الرياض',deviceId:'AP-745312',ip:'8.50.44.196',status:'online',battery:86,speed:48,lat:24.6635,lng:46.7135,lastSeen:time,version:'8.0.0',counter:1085,sensor:'0.0'},
{id:'V21',plate:'8-50.44197',model:'شاحنة نقل 2024',city:'جدة',owner:'النقل والخدمات اللوجستية',deviceId:'AP-745313',ip:'8.50.44.197',status:'online',battery:64,speed:62,lat:21.5433,lng:39.1728,lastSeen:time,version:'8.0.0',counter:925,sensor:'0.0'},
{id:'V22',plate:'8-50.44198',model:'مركبة ميدانية 2024',city:'الدمام',owner:'إدارة المرور',deviceId:'AP-745314',ip:'8.50.44.198',status:'offline',battery:18,speed:0,lat:26.4207,lng:50.0888,lastSeen:null,version:'8.0.0',counter:600,sensor:'0.0'},
{id:'V23',plate:'8-50.44199',model:'مركبة خدمات 2023',city:'مكة المكرمة',owner:'إدارة المرور',deviceId:'AP-745315',ip:'8.50.44.199',status:'online',battery:78,speed:32,lat:21.4225,lng:39.8262,lastSeen:time,version:'8.0.0',counter:707,sensor:'0.0'},
{id:'V24',plate:'8-50.44200',model:'مركبة ميدانية 2022',city:'المدينة المنورة',owner:'إدارة المرور',deviceId:'AP-745316',ip:'8.50.44.200',status:'online',battery:80,speed:26,lat:24.4709,lng:39.6122,lastSeen:time,version:'8.0.0',counter:890,sensor:'0.0'}];
state.inspectors=[
{id:'INS-101',name:'المفتش حسن',city:'الرياض',phone:'0500000101',status:'busy',lat:24.731,lng:46.691},
{id:'INS-102',name:'المفتش خالد',city:'الرياض',phone:'0500000102',status:'available',lat:24.68,lng:46.72},
{id:'INS-103',name:'المفتش سعود',city:'الرياض',phone:'0500000103',status:'available',lat:24.75,lng:46.61},
{id:'INS-104',name:'المفتش فيصل',city:'جدة',phone:'0500000104',status:'busy',lat:21.55,lng:39.18},
{id:'INS-105',name:'المفتش عبدالله',city:'الدمام',phone:'0500000105',status:'available',lat:26.42,lng:50.09},
{id:'INS-106',name:'المفتشة نورة',city:'مكة المكرمة',phone:'0500000106',status:'available',lat:21.44,lng:39.82}];
state.alerts=[
{id:'ALT-1001',vehicleId:'V19',type:'tamper',severity:'critical',message:'محاولة عبث في اللوحة الإلكترونية',status:'assigned',inspectorId:'INS-101',at:time,history:[{text:'تم إنشاء التنبيه',at:time}]},
{id:'ALT-1002',vehicleId:'V18',type:'speed',severity:'high',message:'مخالفة سرعة (+120 كم/س)',status:'open',at:time},
{id:'ALT-1003',vehicleId:'V20',type:'other',severity:'medium',message:'انحراف عن المسار المخطط',status:'open',at:time},
{id:'ALT-1004',vehicleId:'V22',type:'offline',severity:'high',message:'انقطاع اتصال اللوحة',status:'open',at:time},
{id:'ALT-1005',vehicleId:'V21',type:'battery',severity:'medium',message:'انخفاض مستوى البطارية',status:'open',at:time}];
state.events=[{id:'EVT-START',type:'system',at:time,message:'بدء تشغيل المنصة'}];
await fs.writeFile(store,JSON.stringify(state,null,2),{mode:0o600});
}
// Populate additional geographically distributed showcase records once. Incoming telemetry is never synthesized.
if(process.env.APLATE_SHOWCASE!=='0' && !state.showcaseExpanded){
 const districts={
 'الرياض':[[24.750,46.680],[24.727,46.642],[24.683,46.699],[24.804,46.710],[24.642,46.724],[24.776,46.599],[24.703,46.763],[24.665,46.602],[24.791,46.752]],
 'جدة':[[21.579,39.167],[21.610,39.202],[21.524,39.183],[21.492,39.231],[21.551,39.124]],
 'الدمام':[[26.451,50.115],[26.390,50.077],[26.477,50.019]],
 'مكة المكرمة':[[21.439,39.833],[21.405,39.864]],
 'المدينة المنورة':[[24.512,39.600],[24.439,39.640]]};
 let n=0;for(const [city,pts] of Object.entries(districts))for(const [lat,lng] of pts){n++;
 const vid='SHOW-V'+String(n).padStart(3,'0'),iid='SHOW-I'+String(n).padStart(3,'0');
 if(!state.vehicles.some(v=>v.id===vid))state.vehicles.push({id:vid,plate:`A-${5000+n}`,model:n%3===0?'مركبة نقل':'مركبة دورية',city,owner:'وحدة العمليات',deviceId:`AP-SHOW-${n}`,ip:`10.22.${Math.floor(n/250)}.${n+10}`,status:n%9===0?'offline':n%7===0?'alert':'online',battery:55+n%42,speed:n%9===0?0:25+n%48,lat,lng,lastSeen:n%9===0?null:new Date().toISOString(),version:'8.0.0',counter:1020+n,sensor:'0.0'});
 if(!state.inspectors.some(i=>i.id===iid))state.inspectors.push({id:iid,name:`المفتش الميداني ${n}`,city,phone:'',status:n%9===0?'offline':n%4===0?'busy':'available',lat:lat+0.005,lng:lng+0.004});
 }
 state.showcaseExpanded=true;await fs.writeFile(store,JSON.stringify(state,null,2),{mode:0o600});
}
let write=Promise.resolve();const subscribers=new Set();let stateVersion=0;
function publishUpdate(){stateVersion++;const data=`event: state\ndata: ${JSON.stringify({version:stateVersion,at:new Date().toISOString()})}\n\n`;for(const res of subscribers){try{res.write(data)}catch{subscribers.delete(res)}}}
function save(){let snapshot=JSON.stringify(state,null,2);write=write.then(async()=>{const tmp=store+'.tmp';await fs.writeFile(tmp,snapshot,{mode:0o600});await fs.rename(tmp,store);publishUpdate()});return write}
const id=(p)=>p+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();const now=()=>new Date().toISOString();
function same(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function respond(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(data))}
function err(res,code,message){respond(res,code,{error:message})}
function text(s,max=160){return typeof s==='string'?s.trim().slice(0,max):''}
const bounded=(n,lo,hi)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
function sessionFrom(req){const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ap_session='));if(!cookie)return false;const token=cookie.slice(11);const expires=sessions.get(token);if(!expires||expires<Date.now()){sessions.delete(token);return false}return true}
function localClient(req){return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)}
function admin(req){return (AUTO_LOCAL&&localClient(req))||sessionFrom(req)||same(req.headers['x-admin-key'],ADMIN_KEY)}function device(req){return same(req.headers['x-device-key'],DEVICE_KEY)}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>16000)throw new Error('الطلب كبير جدًا')}try{return JSON.parse(s)}catch{throw new Error('تنسيق JSON غير صالح')}}
function statusAllowed(x){return ['open','assigned','resolved'].includes(x)}
async function route(req,res){let u;try{u=new URL(req.url,'http://localhost')}catch{return err(res,400,'رابط غير صالح')}
if(u.pathname==='/api/login'&&req.method==='POST'){
 let d;try{d=await body(req)}catch{return err(res,400,'تنسيق غير صالح')}
 if(!same(text(d.password,256),ADMIN_KEY))return err(res,401,'رمز الدخول غير صحيح');
 const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+SESSION_AGE);
 res.setHeader('Set-Cookie',`ap_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_AGE/1000}${req.socket.encrypted?'; Secure':''}`);
 return respond(res,200,{ok:true,name:text(d.name,80)||'مشغل النظام'});
}
if(u.pathname==='/api/logout'&&req.method==='POST'){const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ap_session='));if(cookie)sessions.delete(cookie.slice(11));res.setHeader('Set-Cookie','ap_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return respond(res,200,{ok:true})}
if(u.pathname==='/api/session'&&req.method==='GET')return respond(res,200,{authenticated:admin(req)});
if(u.pathname==='/api/health'&&req.method==='GET')return respond(res,200,{ok:true,mode:'server',time:now()});
if(u.pathname==='/api/events'&&req.method==='GET'){
  if(!admin(req))return err(res,401,'مطلوب مفتاح إدارة صالح');
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});
  res.write(`event: connected\ndata: ${JSON.stringify({version:stateVersion,at:now()})}\n\n`);
  subscribers.add(res);const pulse=setInterval(()=>{try{res.write(': heartbeat\n\n')}catch{clearInterval(pulse);subscribers.delete(res)}},20000);
  req.on('close',()=>{clearInterval(pulse);subscribers.delete(res)});return;
}
if(u.pathname==='/api/state'&&req.method==='GET'){if(!admin(req))return err(res,401,'مطلوب مفتاح إدارة صالح');return respond(res,200,state)}
if(u.pathname.startsWith('/api/')){if(req.method!=='POST')return err(res,405,'طريقة الطلب غير مدعومة');
const ingest=u.pathname==='/api/ingest';if(!((ingest&&device(req))||(!ingest&&admin(req))))return err(res,401,'مفتاح الوصول غير صحيح');
let d;try{d=await body(req)}catch(e){return err(res,400,e.message)}if(!d||typeof d!=='object'||Array.isArray(d))return err(res,400,'بيانات غير صالحة');
if(ingest){const deviceId=text(d.deviceId,60),v=state.vehicles.find(v=>v.deviceId===deviceId);if(!v)return err(res,404,'جهاز غير مسجل');if(d.speed!==undefined&&!bounded(d.speed,0,350))return err(res,400,'السرعة غير صالحة');if(d.battery!==undefined&&!bounded(d.battery,0,100))return err(res,400,'نسبة البطارية غير صالحة');if(d.lat!==undefined&&!bounded(d.lat,-90,90))return err(res,400,'خط العرض غير صالح');if(d.lng!==undefined&&!bounded(d.lng,-180,180))return err(res,400,'خط الطول غير صالح');if(d.sensor!==undefined&&typeof d.sensor!=='string'&&typeof d.sensor!=='number')return err(res,400,'قراءة الحساس غير صالحة');if(d.counter!==undefined&&!bounded(d.counter,0,999999))return err(res,400,'العداد غير صالح');if(d.tamper!==undefined&&typeof d.tamper!=='boolean')return err(res,400,'قيمة tamper يجب أن تكون boolean');
const t=now(),previous=v.status;v.lastSeen=t;v.status=d.tamper?'alert':'online';if(d.battery!==undefined)v.battery=d.battery;if(d.speed!==undefined)v.speed=d.speed;if(d.sensor!==undefined)v.sensor=String(d.sensor).slice(0,20);if(d.counter!==undefined)v.counter=d.counter;if(d.lat!==undefined)v.lat=d.lat;if(d.lng!==undefined)v.lng=d.lng;state.events.unshift({id:id('EVT'),deviceId,at:t,type:'telemetry'});state.events=state.events.slice(0,1000);if(d.tamper&&!state.alerts.some(a=>a.vehicleId===v.id&&a.type==='tamper'&&a.status!=='resolved'))state.alerts.unshift({id:id('ALT'),vehicleId:v.id,type:'tamper',severity:'critical',message:'إشارة عبث واردة من اللوحة الإلكترونية',status:'open',at:t});await save();return respond(res,200,{ok:true,vehicleId:v.id,previousState:previous,at:t})}
if(u.pathname==='/api/vehicles'){const x={id:text(d.id,36),plate:text(d.plate,30),model:text(d.model,100),city:text(d.city,60),owner:text(d.owner,100),deviceId:text(d.deviceId,60),ip:text(d.ip,60),status:'offline',battery:null,lastSeen:null};if([x.id,x.plate,x.model,x.city,x.owner,x.deviceId].some(v=>v===''))return err(res,400,'الحقول الأساسية مطلوبة');if(state.vehicles.some(v=>v.id===x.id||v.deviceId===x.deviceId||(x.ip&&v.ip===x.ip)))return err(res,409,'معرف المركبة أو الجهاز موجود');state.vehicles.unshift(x)}
else if(u.pathname==='/api/vehicle-action'){
 const v=state.vehicles.find(v=>v.id===d.id);if(!v)return err(res,404,'المركبة غير موجودة');
 const action=text(d.action,40);if(!['lock','buzzer','disable','restart'].includes(action))return err(res,400,'إجراء غير صالح');
 state.events.unshift({id:id('EVT'),vehicleId:v.id,type:'control-request',action,at:now(),message:'تسجيل طلب تحكم - بانتظار ربط الجهاز'});
 state.events=state.events.slice(0,1000);
}
else if(u.pathname==='/api/inspector-task'){
 const i=state.inspectors.find(i=>i.id===d.id);if(!i)return err(res,404,'المفتش غير موجود');const task=text(d.task,240);if(!task)return err(res,400,'وصف المهمة مطلوب');
 const taskId=id('TASK');state.tasks=state.tasks||[];state.tasks.unshift({id:taskId,inspectorId:i.id,description:task,at:now(),status:'assigned'});i.status='busy';
 state.events.unshift({id:id('EVT'),inspectorId:i.id,type:'assignment',message:task,at:now()});
}
else if(u.pathname==='/api/inspectors'){const x={id:id('INS'),name:text(d.name,100),city:text(d.city,50),phone:text(d.phone,20),status:'available',lat:bounded(d.lat,-90,90)?d.lat:null,lng:bounded(d.lng,-180,180)?d.lng:null};if(!x.name||!x.city||!x.phone)return err(res,400,'حقول المفتش مطلوبة');state.inspectors.unshift(x)}
else if(u.pathname==='/api/alerts'){const x={id:id('ALT'),vehicleId:text(d.vehicleId,36),type:text(d.type,30),severity:text(d.severity,20),message:text(d.message,300),status:'open',at:now()};if(!state.vehicles.some(v=>v.id===x.vehicleId)||!['tamper','offline','battery','speed','other'].includes(x.type)||!['critical','high','medium','low'].includes(x.severity)||!x.message)return err(res,400,'بيانات تنبيه غير صالحة');state.alerts.unshift(x)}
else if(u.pathname==='/api/alert-note'){const a=state.alerts.find(a=>a.id===d.id);if(!a)return err(res,404,'البلاغ غير موجود');const note=text(d.note,500);if(!note)return err(res,400,'الملاحظة مطلوبة');a.notes=a.notes||[];a.notes.push({text:note,at:now()});a.history=a.history||[];a.history.push({text:'إضافة ملاحظة متابعة',at:now()})}
else if(u.pathname==='/api/alert-delete'){const n=state.alerts.length;state.alerts=state.alerts.filter(a=>a.id!==d.id);if(n===state.alerts.length)return err(res,404,'البلاغ غير موجود');const active=new Set([...state.alerts.filter(a=>a.status==='assigned').map(a=>a.inspectorId),...(state.tasks||[]).filter(t=>t.status==='assigned').map(t=>t.inspectorId)]);for(const i of state.inspectors)i.status=i.status==='offline'?'offline':active.has(i.id)?'busy':'available'}
else if(u.pathname==='/api/alert-status'){const a=state.alerts.find(a=>a.id===d.id);if(!a)return err(res,404,'البلاغ غير موجود');if(!statusAllowed(d.status))return err(res,400,'حالة غير صالحة');if(d.status==='assigned'&&!state.inspectors.some(i=>i.id===d.inspectorId))return err(res,400,'مطلوب مفتش مسجل');a.status=d.status;a.history=a.history||[];a.history.push({text:d.status==='resolved'?'إغلاق التنبيه':d.status==='assigned'?'تولية المعالجة':'إعادة فتح التنبيه',at:now()});if(d.inspectorId)a.inspectorId=d.inspectorId;else if(d.status==='open')delete a.inspectorId;if(d.note){const note=text(d.note,500);if(note){a.notes=a.notes||[];a.notes.push({text:note,at:now()})}}if(d.status==='resolved')a.resolvedAt=now();const active=new Set([...state.alerts.filter(a=>a.status==='assigned').map(a=>a.inspectorId),...(state.tasks||[]).filter(t=>t.status==='assigned').map(t=>t.inspectorId)]);for(const i of state.inspectors)i.status=i.status==='offline'?'offline':active.has(i.id)?'busy':'available'}else return err(res,404,'المسار غير موجود');await save();return respond(res,200,{ok:true})}
if(!['GET','HEAD'].includes(req.method))return err(res,405,'طريقة غير مدعومة');let target=decodeURIComponent(u.pathname);if(target==='/'||target==='')target='/index.html';target=path.resolve(publicDir,'.'+target);if(!target.startsWith(publicDir+path.sep))return err(res,403,'غير مسموح');const ext=path.extname(target);if(!allowedMime[ext])return err(res,404,'ملف غير موجود');try{const content=await fs.readFile(target);res.writeHead(200,{'Content-Type':allowedMime[ext],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src https://fonts.gstatic.com; script-src 'self' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com; connect-src 'self' https://*.tile.openstreetmap.org; object-src 'none'; frame-ancestors 'none'",'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?'':content)}catch{return err(res,404,'ملف غير موجود')}}
const server=http.createServer((req,res)=>{route(req,res).catch(e=>{console.error(e);if(!res.headersSent)err(res,500,'حدث خطأ في الخادم')})});server.listen(PORT,AUTO_LOCAL?'127.0.0.1':'0.0.0.0',()=>console.log(`A-Plate API on http://localhost:${PORT}`));
