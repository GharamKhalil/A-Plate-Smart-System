/* A-Plate maps: Leaflet when available; dependency-free SVG fallback when tiles are blocked. */
(function(){'use strict';
const AP=window.AP;
const bounds={minLat:16.1,maxLat:32.2,minLng:33,maxLng:57};
const country=[[34.6,29.4],[35.1,28.7],[36.3,28.4],[37.2,29.5],[38.7,30.1],[39.6,31.2],[41.4,31.9],[42.2,31.2],[43.7,29.2],[46.5,29.2],[48.3,29.1],[48.6,28.3],[50,27.1],[50.2,25.6],[50.3,24.7],[51.1,24.0],[52.4,22.5],[54.8,20.8],[55.6,18.9],[52.8,16.7],[49.5,18.3],[47.5,17.1],[45.3,17.5],[43.1,16.5],[41.5,17.9],[41.1,19.4],[40.2,20.7],[39.4,22.5],[38.8,24.1],[37.1,26],[36.1,27.2],[34.6,29.4]];
const project=(lat,lng,w=960,h=600)=>({x:(lng-bounds.minLng)/(bounds.maxLng-bounds.minLng)*w,y:(bounds.maxLat-lat)/(bounds.maxLat-bounds.minLat)*h});
const regionCenters=AP.REGIONS;
const pCountry=country.map(([lng,lat],i)=>{const a=project(lat,lng);return `${i?'L':'M'}${a.x.toFixed(1)} ${a.y.toFixed(1)}`}).join(' ')+' Z';
function svg(el,items,focus,clicked){const national=focus.id==='all'; const points=items.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
const cityX=national?null:480,cityY=national?null:295;
const cityGrid=Array.from({length:10},(_,i)=>`<path d="M0 ${i*63+12} L960 ${i*63+45}" stroke="#d5e3df" stroke-width="${i%3===0?4:2}"/>`).join('')+Array.from({length:16},(_,i)=>`<path d="M${i*63-10} 0 L${i*63+38} 600" stroke="#dae3e6" stroke-width="${i%4===0?4:2}"/>`).join('');
const toPoint=v=>national?project(v.lat,v.lng):{x:480+(v.lng-focus.lng)*3300,y:300-(v.lat-focus.lat)*3100};
const markers=points.map((v,i)=>{const q=toPoint(v);if(q.x<5||q.y<5||q.x>955||q.y>595)return '';const tone=v.tone||'blue';const color={blue:'#1d8fd0',red:'#d34855',green:'#13a17b',orange:'#da922d',gray:'#879cac'}[tone]||'#1d8fd0';return `<g class="map-pin" tabindex="0" role="button" aria-label="${AP.escape(v.label||'الموقع')}" data-map-index="${i}" transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)})"><circle r="18" fill="${color}" stroke="#fff" stroke-width="4"/><circle r="5" fill="#fff"/><title>${AP.escape(v.label||'الموقع')}</title></g>`}).join('');
const cities=regionCenters.filter(r=>r.id!=='all').map(r=>{const q=national?project(r.lat,r.lng):toPoint(r);return q.x>0&&q.x<960&&q.y>0&&q.y<600?`<g><circle cx="${q.x}" cy="${q.y}" r="3" fill="#176eaf"/><text x="${q.x+8}" y="${q.y-8}" class="map-marker-label">${AP.escape(r.name)}</text></g>`:''}).join('');
const isRiyadh=focus.id==='الرياض';
const streetsBackdrop=isRiyadh?`<image href="/assets/riyadh-reference-streets.jpg" x="0" y="0" width="960" height="600" preserveAspectRatio="xMidYMid slice"/>`:'';
const roads= national?`<g stroke="#e5cda4" stroke-width="2" fill="none" opacity=".8"><path d="M312 330 Q480 210 670 266 M415 405 Q520 312 770 320 M340 335 Q415 390 460 465 M355 345 Q375 270 430 185 M500 230 Q510 345 600 420"/></g>`:`<g>${cityGrid}<path d="M-50 280 Q350 115 1000 440 M280 -50 Q530 260 620 650 M50 420 Q400 320 1010 200" fill="none" stroke="#e8ad55" stroke-width="7" opacity=".7"/></g>`;
el.innerHTML=`<svg class="map-svg" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="خريطة ${national?'المملكة العربية السعودية':focus.name}"><rect width="960" height="600" fill="#e0eef5"/>${streetsBackdrop}${national?`<path d="${pCountry}" fill="#f6f2e7" stroke="#5ba8a9" stroke-width="4"/>`:''}${isRiyadh?'':roads}${national?cities:`<text x="480" y="305" text-anchor="middle" fill="#91a5ac" font-size="47" font-weight="800">${AP.escape(focus.name)}</text>`}${markers}${isRiyadh?`<rect x="0" y="559" width="960" height="41" fill="#0c2647" opacity=".90"/><text x="940" y="584" text-anchor="end" fill="white" font-size="16">خريطة مرجعية محفوظة للرياض — مواضع العلامات تقريبية • © OpenStreetMap contributors</text>`:''}</svg><div class="map-zoom"><button type="button" class="zoom-in" title="تكبير">+</button><button type="button" class="zoom-out" title="تصغير">−</button><button type="button" class="zoom-reset" title="العودة إلى المنطقة">⌖</button></div><div class="map-legend"><strong>حالة العلامات</strong><span><i class="green"></i> متصل / متاح</span><span><i class="red"></i> تنبيه / غير متصل</span><span><i class="blue"></i> مركبة / مفتش</span></div>`;
el.querySelectorAll('.map-pin').forEach(node=>{const trigger=()=>clicked?.(points[Number(node.dataset.mapIndex)]);node.addEventListener('click',trigger);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();trigger()}})});
let level=1;const view=el.querySelector('svg');el.querySelector('.zoom-in').onclick=()=>{level=Math.min(2.5,level+.25);view.style.transform=`scale(${level})`};el.querySelector('.zoom-out').onclick=()=>{level=Math.max(1,level-.25);view.style.transform=`scale(${level})`};el.querySelector('.zoom-reset').onclick=()=>{level=1;view.style.transform='scale(1)'};
}
function render(id,items,onClick,opts={}){const el=document.getElementById(id);if(!el)return;const focus=opts.region||AP.region();svg(el,items,focus,onClick)}
window.APMap={renderFallback:render};
// Street basemaps are provided by independent tile servers; no fake "live" traffic layer.
const activeMaps=new Map();
const tiles=[
 {url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',options:{maxZoom:19,attribution:'© OpenStreetMap contributors'}}
];
function actualMap(id,items,onClick,opts={}){
 const target=document.getElementById(id);if(!target)return;
 const old=activeMaps.get(id);if(old){try{old.remove()}catch{ }activeMaps.delete(id)}
 if(!window.L){render(id,items,onClick,opts);return}
 target.innerHTML='';const focus=opts.region||AP.region();
 const map=L.map(target,{zoomControl:true,scrollWheelZoom:false,attributionControl:true,preferCanvas:true});activeMaps.set(id,map);
 let failedOver=false;const switchOffline=()=>{if(failedOver||readyTiles>0)return;failedOver=true;try{map.remove()}catch{}activeMaps.delete(id);svg(target,items,focus,onClick);};
 const valid=items.filter(p=>Number.isFinite(+p.lat)&&Number.isFinite(+p.lng));
 const coverage=valid.map(p=>[+p.lat,+p.lng]);
 let layerIndex=0,errorCount=0,readyTiles=0,layer;
 function useLayer(){if(layer){map.removeLayer(layer)};const t=tiles[layerIndex];layer=L.tileLayer(t.url,t.options).addTo(map);errorCount=0;readyTiles=0;
 layer.on('tileload',()=>{readyTiles++;document.getElementById(id+'-tile-warning')?.remove()});
 layer.on('tileerror',()=>{errorCount++;if(errorCount>=5 && readyTiles===0){if(layerIndex<tiles.length-1){layerIndex++;useLayer()}else{switchOffline()}}});}
 useLayer();
 setTimeout(()=>{if(!failedOver && readyTiles===0)switchOffline()},7500);
 if(focus.id!=='all'){map.setView([focus.lat,focus.lng],focus.zoom||12)}
 else if(coverage.length>1){map.fitBounds(L.latLngBounds(coverage).pad(.38),{maxZoom:6})}
 else map.setView([24.3,44.5],5);
 for(const p of valid){const tone=['red','green','orange','gray','blue'].includes(p.tone)?p.tone:'blue';const mark=L.marker([+p.lat,+p.lng],{icon:L.divIcon({className:'ap-map-marker '+tone,html:`<span>${id.toLowerCase().includes('inspector')?'👤':'🚗'}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
 mark.bindTooltip(String(p.label||'الموقع'),{direction:'top'});
 if(onClick)mark.on('click',()=>onClick(p));
 }
 setTimeout(()=>{if(document.getElementById(id)===target)map.invalidateSize()},90);
}
window.APMap.render=actualMap;

})();
