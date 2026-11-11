import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pageNames=['dashboard','alerts','analytics','vehicles','inspectors'];
test('each page has independently editable HTML and JS',async()=>{
 for(const name of pageNames){
  const html=await readFile(path.join(root,'public',name+'.html'),'utf8');
  const js=await readFile(path.join(root,'public/pages',name+'.js'),'utf8');
  assert.match(html,/<html lang="ar" dir="rtl">/);
  assert.match(html,/assets\/core.js/);
  assert.match(html,new RegExp(`pages/${name}\\.js`));
  assert.ok(js.includes(`A.init('${name}'`));
 }
});
test('shared UI contains no removed interface phrases',async()=>{
 let source='';for(const p of ['assets/core.js','assets/styles.css',...pageNames.map(n=>'pages/'+n+'.js')])source+=await readFile(path.join(root,'public',p),'utf8');
 for(const term of ['عرض محلي','مركز العمليات','مركز عمليات A-Plate','ملخص تشغيل اللوحات الرقمية'])assert.ok(!source.includes(term),term);
 assert.match(source,/ap-region/);
 assert.match(source,/new EventSource/);
});
test('digital plate is drawn in code and maps have offline fallback',async()=>{
 const v=await readFile(path.join(root,'public/pages/vehicles.js'),'utf8');const map=await readFile(path.join(root,'public/assets/map.js'),'utf8');
 assert.match(v,/function emblem/);assert.match(v,/function digitalPlate/);assert.match(v,/plate-main/);assert.match(v,/v\.ip/);
 assert.match(map,/map-svg/);assert.match(map,/viewBox/);
});
