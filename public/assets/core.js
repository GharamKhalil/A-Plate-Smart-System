/* A-Plate: shared layout, API session, regional filter, SSE and reusable widgets. */
(function(){'use strict';
const REGIONS=[{id:'all',name:'كل المملكة',lat:24.3,lng:44.5,zoom:5},{id:'الرياض',name:'الرياض',lat:24.7136,lng:46.6753,zoom:11},{id:'جدة',name:'جدة',lat:21.5433,lng:39.1728,zoom:11},{id:'الدمام',name:'الدمام',lat:26.4207,lng:50.0888,zoom:11},{id:'مكة المكرمة',name:'مكة المكرمة',lat:21.4225,lng:39.8262,zoom:11},{id:'المدينة المنورة',name:'المدينة المنورة',lat:24.4709,lng:39.6122,zoom:11}];
const ICON={dashboard:'layout-dashboard',alerts:'bell-ring',analytics:'chart-column-increasing',vehicles:'car-front',inspectors:'users-round',search:'search',menu:'menu',bell:'bell',map:'map-pinned',close:'x',refresh:'refresh-cw',check:'check-circle-2',trash:'trash-2',user:'user-round',eye:'eye',plus:'plus',shield:'shield-check',download:'download',wifi:'wifi',battery:'battery-charging',clock:'clock-3',speed:'gauge',activity:'activity',filter:'list-filter',warning:'triangle-alert',pin:'map-pin',settings:'settings-2',info:'info',route:'route',lock:'lock-keyhole',sound:'volume-2',off:'power',edit:'pencil',send:'send',sparkles:'sparkles',calendar:'calendar-days',signal:'signal',file:'file-chart-column',logout:'log-out',database:'database',phone:'phone',flag:'flag',arrow:'arrow-left',assign:'user-round-plus'};
const state={data:{vehicles:[],alerts:[],inspectors:[],events:[],tasks:[]},region:localStorage.getItem('ap-region')||'all',name:localStorage.getItem('ap-user-name')||'مدير النظام',authorized:false,connection:false,selectedVehicle:null,selectedAlert:null,selectedInspector:null,source:null,latest:null,loading:false};
const escape=(v)=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const icon=(name,size=18)=>`<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><use href="#i-${ICON[name]||name}"></use></svg>`;
// SVG icons injected inline to support local runs without an icon CDN.
const paths={
'layout-dashboard':'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
'bell-ring':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4M2 5l2-2M22 5l-2-2"/>',
'chart-column-increasing':'<path d="M3 3v18h18"/><rect x="6" y="14" width="3" height="5"/><rect x="11" y="10" width="3" height="9"/><rect x="16" y="5" width="3" height="14"/>',
'car-front':'<path d="m5 17-1 3m15-3 1 3M5 8l1.5-4h11L19 8M5 8H4a2 2 0 0 0-2 2v7h20v-7a2 2 0 0 0-2-2H5Z"/><path d="M5 8h14M6 13h2m8 0h2"/>',
'users-round':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
'search':'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
'menu':'<path d="M4 6h16M4 12h16M4 18h16"/>',
'bell':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
'map-pinned':'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/><circle cx="15" cy="10" r="2"/>',
'x':'<path d="M5 5l14 14M19 5 5 19"/>',
'refresh-cw':'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2l2.5 5M18.5 15a7 7 0 0 1-12 2L4 12"/>',
'check-circle-2':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
'trash-2':'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',
'user-round':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
'eye':'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
'plus':'<path d="M12 5v14M5 12h14"/>',
'shield-check':'<path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
'download':'<path d="M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3"/>',
'wifi':'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
'battery-charging':'<rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4m-11-6-3 5h4l-1 4"/>',
'clock-3':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5h4"/>',
'gauge':'<path d="M4 18a9 9 0 1 1 16 0H4Z"/><path d="m12 14 4-5M7 16h1m8 0h1"/>',
'activity':'<path d="M2 12h4l3-8 6 16 3-8h4"/>',
'list-filter':'<path d="M3 5h18M6 12h12M10 19h4"/>',
'triangle-alert':'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 4h.01"/>',
'map-pin':'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
'settings-2':'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
'info':'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
'route':'<circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 19h8a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h8"/>',
'lock-keyhole':'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/>',
'volume-2':'<path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/>',
'power':'<path d="M12 2v10M5 5a9 9 0 1 0 14 0"/>',
'pencil':'<path d="m3 17-1 5 5-1L20 8l-5-5L3 17ZM13 5l5 5"/>',
'send':'<path d="m22 2-7 20-4-9-9-4L22 2Z"/>',
'sparkles':'<path d="m12 2 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7ZM19 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/>',
'calendar-days':'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4m8-4v4M3 10h18M8 14h2m4 0h2"/>',
'signal':'<path d="M3 20v-3m5 3v-7m5 7v-11m5 11V4"/>',
'file-chart-column':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 18v-3m4 3v-6m4 6v-4"/>',
'log-out':'<path d="M8 3H4v18h4M13 7l5 5-5 5m5-5H8"/>',
'database':'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
'phone':'<path d="m4 2 5 3-2 4c2 4 4 6 8 8l4-2 3 5c-4 4-9 2-15-4S0 6 4 2Z"/>',
'flag':'<path d="M5 22V3m0 1c5-2 9 3 15 0v12c-6 3-10-2-15 0"/>',
'arrow-left':'<path d="M20 12H4m7-7-7 7 7 7"/>',
'user-round-plus':'<circle cx="9" cy="8" r="4"/><path d="M1 21a8 8 0 0 1 16 0M19 8v8m-4-4h8"/>'};
const sprite=()=>`<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${Object.entries(paths).map(([id,p])=>`<g id="i-${id}">${p}</g>`).join('')}</defs></svg>`;
const region=()=>REGIONS.find(r=>r.id===state.region)||REGIONS[0];
const vehicles=()=>state.data.vehicles.filter(v=>state.region==='all'||v.city===state.region);
const alerts=()=>state.data.alerts.filter(a=>{const v=state.data.vehicles.find(v=>v.id===a.vehicleId);return state.region==='all'||v?.city===state.region});
const inspectors=()=>state.data.inspectors.filter(i=>state.region==='all'||i.city===state.region);
const vehicle=(id)=>state.data.vehicles.find(v=>v.id===id);
const inspector=(id)=>state.data.inspectors.find(i=>i.id===id);
const severity=(s)=>({critical:'حرج',high:'عالي',medium:'متوسط',low:'منخفض'}[s]||'—');
const status=(s)=>({open:'مفتوح',assigned:'قيد المعالجة',resolved:'مغلق',online:'متصل',offline:'غير متصل',alert:'تنبيه',available:'متاح',busy:'في مهمة'}[s]||s||'—');
const badge=(v,t)=>`<span class="pill ${escape(t||v)}">${escape(v)}</span>`;
const time=(v,full=false)=>v?new Date(v).toLocaleString('ar-SA',{dateStyle:full?'short':undefined,timeStyle:'short'}):'—';
const number=(v)=>Number(v||0).toLocaleString('en-US');
const shell=(key)=>{
const tabs=[['dashboard','لوحة القيادة','dashboard.html'],['alerts','مركز التنبيهات','alerts.html'],['analytics','التحليل والتقارير','analytics.html'],['vehicles','تفاصيل المركبة','vehicles.html'],['inspectors','إدارة المفتشين','inspectors.html']];
const title=tabs.find(x=>x[0]===key)?.[1]||'A-Plate';
document.body.innerHTML=`${sprite()}<div class="layout"><aside class="sidebar" id="sidebar"><div class="brand"><span class="mark">A</span><div><b>A-Plate</b><small>نظام اللوحات الرقمية الذكية</small></div></div><nav aria-label="القائمة الرئيسية">${tabs.map(([k,n,href])=>`<a href="${href}" class="navlink ${key===k?'active':''}">${icon(k,20)}<span>${n}</span>${k==='alerts'?'<b class="nav-counter" id="navCount"></b>':''}</a>`).join('')}</nav><div class="sidebar-end"><span class="online-circle"></span> A-Plate</div></aside><div class="workspace"><header class="topbar"><div class="heading-top"><button id="menuBtn" class="icon-button menu-button" aria-label="القائمة">${icon('menu',22)}</button><span class="brand-mobile">A-Plate</span><h1>${title}</h1></div><div class="top-tools"><label class="region-select">${icon('map',17)}<select aria-label="تحديد المنطقة" id="regionSelect">${REGIONS.map(r=>`<option value="${escape(r.id)}" ${state.region===r.id?'selected':''}>${escape(r.name)}</option>`).join('')}</select></label><div class="notification-area"><button id="bellBtn" class="icon-button" aria-label="الإشعارات">${icon('bell',20)}<b id="bellCount" class="count"></b></button><div id="bellPanel" class="notification-panel" hidden></div></div><span class="operator"><span class="avatar">${escape(state.name.charAt(0))}</span><span class="operator-name" id="operatorName">${escape(state.name)}</span></span></div></header><main id="content" tabindex="-1"></main></div></div><div id="drawerBackdrop" class="drawer-backdrop" hidden></div><div class="toasts" id="toasts" aria-live="polite"></div><div id="modalRoot"></div>`;
document.getElementById('menuBtn').onclick=()=>{document.getElementById('sidebar').classList.toggle('open');document.getElementById('drawerBackdrop').hidden=false};
document.getElementById('drawerBackdrop').onclick=()=>{document.getElementById('sidebar').classList.remove('open');document.getElementById('drawerBackdrop').hidden=true};
document.getElementById('regionSelect').onchange=e=>{state.region=e.target.value;localStorage.setItem('ap-region',state.region);window.dispatchEvent(new Event('ap:region'));};
document.getElementById('bellBtn').onclick=()=>{const p=document.getElementById('bellPanel');p.hidden=!p.hidden;renderBell()};
document.addEventListener('click',e=>{if(!e.target.closest('.notification-area')){const panel=document.getElementById('bellPanel');if(panel)panel.hidden=true}});

};
function renderBell(){const pending=alerts().filter(a=>a.status!=='resolved');const n=pending.length;const c=document.getElementById('bellCount'),c2=document.getElementById('navCount');if(c){c.textContent=n||'';c.hidden=!n}if(c2){c2.textContent=n||'';c2.hidden=!n}const panel=document.getElementById('bellPanel');if(!panel)return;panel.innerHTML=`<div class="panel-head"><b>الإشعارات (${n})</b><a href="alerts.html">عرض الكل</a></div>${pending.slice(0,8).map(a=>`<a class="notice-entry" href="alerts.html?id=${encodeURIComponent(a.id)}"><i class="severity-dot ${escape(a.severity)}"></i><div><strong>${escape(a.message)}</strong><small>${escape(vehicle(a.vehicleId)?.plate||'')} · ${time(a.at,true)}</small></div></a>`).join('')||'<p class="empty">لا توجد تنبيهات نشطة</p>'}`}
const toast=(message,error=false)=>{const el=document.createElement('div');el.className='toast '+(error?'error':'');el.textContent=message;document.getElementById('toasts')?.append(el);setTimeout(()=>el.remove(),4200)};
const modal=(title,body,onConfirm,label='حفظ')=>{const root=document.getElementById('modalRoot');root.innerHTML=`<div class="modal-overlay" role="dialog" aria-modal="true" aria-label="${escape(title)}"><section class="modal"><div class="card-head"><h2>${escape(title)}</h2><button class="icon-button" id="modalClose" aria-label="إغلاق">${icon('close')}</button></div><form id="modalForm"><div class="modal-content">${body}</div><footer class="modal-actions"><button type="button" class="btn secondary" id="modalCancel">إلغاء</button><button class="btn primary" type="submit">${escape(label)}</button></footer></form></section></div>`;root.querySelector('#modalClose').onclick=()=>root.replaceChildren();root.querySelector('#modalCancel').onclick=()=>root.replaceChildren();root.querySelector('#modalForm').onsubmit=async e=>{e.preventDefault();const result=await onConfirm(new FormData(e.currentTarget));if(result!==false)root.replaceChildren()};};
const field=(label,name,type='text',required=true,value='')=>`<label class="form-label">${escape(label)}<input name="${escape(name)}" type="${type}" ${required?'required':''} value="${escape(value)}"></label>`;
const selectField=(label,name,items)=>`<label class="form-label">${escape(label)}<select name="${escape(name)}">${items.map(([v,n])=>`<option value="${escape(v)}">${escape(n)}</option>`).join('')}</select></label>`;
const card=(title,body,extras='')=>`<section class="card ${extras}"><div class="card-head"><h2>${title}</h2></div>${body}</section>`;
const kpi=(label,value,iconName,tone='blue',sub='')=>`<div class="metric"><div class="metric-symbol ${tone}">${icon(iconName,22)}</div><div><small>${escape(label)}</small><strong>${escape(value)}</strong>${sub?`<span>${escape(sub)}</span>`:''}</div></div>`;
async function api(path,data){try{const res=await fetch(path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},credentials:'same-origin',body:data===undefined?undefined:JSON.stringify(data)});const result=await res.json();if(res.status===401)throw Error('لا توجد صلاحية لهذه العملية من هذا الاتصال');if(!res.ok)throw Error(result.error||'تعذر إتمام العملية');return result}catch(e){toast(e.message,true);return null}}
async function refresh(initial=false){if(state.loading)return;state.loading=true;try{const res=await fetch('/api/state',{credentials:'same-origin',cache:'no-store'});if(res.status===401)throw Error('هذا الاتصال غير مصرح به. شغّلي النظام محليًا عبر START-WINDOWS.ps1');if(!res.ok)throw Error('تعذّر تحميل بيانات النظام');state.data=await res.json();state.connection=true;state.latest=new Date().toISOString();renderBell();window.dispatchEvent(new CustomEvent('ap:data',{detail:{initial}}));}catch(e){state.connection=false;if(!initial)toast('تعذر الاتصال بالخادم',true)}finally{state.loading=false}}
function live(){if(state.source)state.source.close();const es=new EventSource('/api/events');state.source=es;es.addEventListener('state',()=>refresh());es.onerror=()=>{state.connection=false};es.addEventListener('connected',()=>{state.connection=true})}
function exportCSV(rows,name){const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function init(pageKey,handler){const session=await fetch('/api/session').then(r=>r.json()).catch(()=>({authenticated:false}));if(!session.authenticated){document.body.innerHTML='<main class="access-message" dir="rtl"><h2>تعذر فتح النظام</h2><p>الخادم يتطلب اتصالًا محليًا مصرحًا. افتحي التطبيق عبر ملف تشغيل Windows.</p></main>';return}state.authorized=true;shell(pageKey);window.addEventListener('ap:data',()=>handler.render());window.addEventListener('ap:region',()=>{renderBell();handler.render()});handler.render();await refresh(true);live();setInterval(()=>{if(!document.hidden)refresh()},30000);}
window.AP={state,icon,escape,region,REGIONS,vehicles,alerts,inspectors,vehicle,inspector,severity,status,badge,time,number,shell,init,toast,modal,field,selectField,card,kpi,api,refresh,exportCSV};
})();
