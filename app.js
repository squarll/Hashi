const DB_NAME='hashi-db'; const DB_VERSION=1; let db; let lastCreatedId=null;
const PRIMARY=['Nausea','Stomach Ache','Brain Fog','Low Energy','Mood Swing','Bloating'];
const MORE=['Headache','Diarrhea','Constipation','Reflux','Energy Crash'];
const TRIGGERS=['Possible Gluten','Lactose','Sugar','Alcohol','Other'];
const VITAMINS=['Selenium','Vitamin D','Vitamin B'];
const CHECKIN={Overall:['Good','Okay','Rough'],Energy:['Good','Low'],Brain:['Clear','Foggy'],Stomach:['Good','Off']};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const todayKey=()=>localDate(new Date());
const fmtTime=iso=>new Date(iso).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const fmtDate=iso=>new Date(iso+'T12:00:00').toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('events')){const s=d.createObjectStore('events',{keyPath:'id'});s.createIndex('day','day');} if(!d.objectStoreNames.contains('daily'))d.createObjectStore('daily',{keyPath:'day'});};r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error);});}
function tx(store,mode='readonly'){return db.transaction(store,mode).objectStore(store)}
function reqPromise(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function addEvent(type,value){const ev={id:crypto.randomUUID(),type,value,createdAt:new Date().toISOString(),day:todayKey()};await reqPromise(tx('events','readwrite').add(ev));lastCreatedId=ev.id;showToast(`${value} logged`,true);await refreshToday();}
async function deleteEvent(id){await reqPromise(tx('events','readwrite').delete(id));await refreshToday();}
async function getAllEvents(){return await reqPromise(tx('events').getAll())}
async function getDayEvents(day){return await reqPromise(tx('events').index('day').getAll(day))}
async function getDaily(day=todayKey()){return (await reqPromise(tx('daily').get(day)))||{day,vitamins:{},period:false,checkin:{}}}
async function saveDaily(d){await reqPromise(tx('daily','readwrite').put(d))}
function chip(label,type){const b=document.createElement('button');b.className='chip action';b.textContent=label;b.dataset.eventType=type;b.dataset.eventValue=label;b.onclick=()=>addEvent(type,label);return b}
function renderButtons(){PRIMARY.forEach(x=>$('#primarySymptoms').append(chip(x,'symptom')));MORE.forEach(x=>$('#moreSymptoms').append(chip(x,'symptom')));TRIGGERS.forEach(x=>$('#triggers').append(chip(x,'trigger')));VITAMINS.forEach(x=>{const b=document.createElement('button');b.className='chip toggle';b.dataset.vitamin=x;b.textContent=x;b.onclick=()=>toggleVitamin(x);$('#vitamins').append(b)});}
async function toggleVitamin(v){const d=await getDaily();d.vitamins[v]=!d.vitamins[v];await saveDaily(d);showToast(d.vitamins[v]?`${v} marked taken`:`${v} unmarked`,false);await refreshToday();}
async function takeAll(){const d=await getDaily();VITAMINS.forEach(v=>d.vitamins[v]=true);await saveDaily(d);showToast('All vitamins marked taken',false);await refreshToday();}
async function togglePeriod(){const d=await getDaily();d.period=!d.period;await saveDaily(d);showToast(d.period?'Period marked for today':'Period unmarked',false);await refreshToday();}
function renderCheckin(){const root=$('#checkinForm');Object.entries(CHECKIN).forEach(([k,vals])=>{const row=document.createElement('div');row.className='checkin-row';row.innerHTML=`<label>${k}</label>`;const seg=document.createElement('div');seg.className='segmented '+(vals.length===2?'two':'');vals.forEach(v=>{const b=document.createElement('button');b.textContent=v;b.dataset.checkinKey=k;b.dataset.checkinValue=v;b.onclick=()=>setCheckin(k,v);seg.append(b)});row.append(seg);root.append(row)});}
async function setCheckin(k,v){const d=await getDaily();d.checkin[k]=v;await saveDaily(d);$('#checkinSaved').textContent='Saved';setTimeout(()=>$('#checkinSaved').textContent='',1200);await refreshToday();}
async function refreshInsights(){const events=await getAllEvents();const triggers=events.filter(e=>e.type==='trigger');const symptoms=events.filter(e=>e.type==='symptom');$('#insightsSummary').innerHTML=`<p class="eyebrow">YOUR DATA</p><h2>So far</h2><div class="insight-stat"><div class="stat-box"><div class="stat-number">${triggers.length}</div><div class="stat-label">trigger logs</div></div><div class="stat-box"><div class="stat-number">${symptoms.length}</div><div class="stat-label">symptom logs</div></div></div>`;const root=$('#patternCards');root.innerHTML='<p class="eyebrow">PATTERNS</p><h2>Possible associations</h2>';if(triggers.length<3||symptoms.length<3){root.innerHTML+='<p class="muted">Keep logging. Hashi will start showing simple trigger/symptom associations after there is enough data.</p>';return;}const windows=[3,12,24];const groups=[...new Set(triggers.map(t=>t.value))];let cards=[];for(const g of groups){const gs=triggers.filter(t=>t.value===g);for(const w of windows){const counts={};for(const t of gs){const t0=new Date(t.createdAt).getTime();const seen=new Set();for(const s of symptoms){const dt=(new Date(s.createdAt)-t0)/36e5;if(dt>=0&&dt<=w)seen.add(s.value);}for(const value of seen)counts[value]=(counts[value]||0)+1;}const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];if(top&&gs.length>=2){cards.push({score:top[1]/gs.length,g,sym:top[0],hits:top[1],n:gs.length,w});break;}}}cards.sort((a,b)=>b.score-a.score).slice(0,5).forEach(c=>{const div=document.createElement('div');div.className='pattern';div.innerHTML=`<h3>${escapeHtml(c.g)} + ${escapeHtml(c.sym)}</h3><p>${escapeHtml(c.sym)} was logged within ${c.w} hours after ${c.hits} of ${c.n} ${escapeHtml(c.g)} entries. This is an association in your journal, not proof that ${escapeHtml(c.g)} caused the symptom.</p>`;root.append(div)});if(!cards.length)root.innerHTML+='<p class="muted">No clear repeated associations yet.</p>';}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function showToast(msg,undo){$('#toastText').textContent=msg;$('#undoBtn').style.display=undo?'block':'none';$('#toast').classList.remove('hidden');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3000)}
async function undo(){if(lastCreatedId){await deleteEvent(lastCreatedId);lastCreatedId=null;$('#toast').classList.add('hidden')}}
async function clearToday(){if(!confirm('Clear all event logs for today? Vitamins, period, and check-in will stay.'))return;const events=await getDayEvents(todayKey());const s=tx('events','readwrite');for(const e of events)s.delete(e.id);await new Promise((res,rej)=>{s.transaction.oncomplete=res;s.transaction.onerror=()=>rej(s.transaction.error)});await refreshToday();}
function setTab(tab){$('#app').classList.toggle('hidden',tab!=='today');$('#historyView').classList.toggle('hidden',tab!=='history');$('#insightsView').classList.toggle('hidden',tab!=='insights');if(tab==='history')refreshHistory();if(tab==='insights')refreshInsights();window.scrollTo(0,0)}
async function exportData(){const payload={schemaVersion:2,exportedAt:new Date().toISOString(),events:await getAllEvents(),daily:await reqPromise(tx('daily').getAll())};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`hashi-backup-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function exportForAI(){
  const [events,dailies]=await Promise.all([getAllEvents(),reqPromise(tx('daily').getAll())]);
  const dailyMap=new Map(dailies.map(d=>[d.day,d]));
  const dayKeys=[...new Set([...events.map(e=>e.day),...dailies.map(d=>d.day)])].sort();
  const eventCounts={};
  for(const e of events){
    const key=`${e.type}:${e.value}`;
    eventCounts[key]=(eventCounts[key]||0)+1;
  }
  const journal=dayKeys.map(day=>{
    const dayEvents=events.filter(e=>e.day===day).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    const d=dailyMap.get(day)||{vitamins:{},period:false,checkin:{}};
    return {
      date:day,
      dateLabel:fmtDate(day),
      events:dayEvents.map(e=>({
        time:fmtTime(e.createdAt),
        timestamp:e.createdAt,
        category:e.type,
        item:e.value,
        details:e.details||{},
        updatedAt:e.updatedAt||null
      })),
      vitaminsTaken:Object.entries(d.vitamins||{}).filter(([,taken])=>taken).map(([name])=>name),
      period:!!d.period,
      checkIn:d.checkin||{}
    };
  });
  const payload={
    exportType:'Hashi AI Journal',
    schemaVersion:2,
    appVersion:'0.3.1',
    generatedAt:new Date().toISOString(),
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'unknown',
    purpose:'Review a trigger and symptom journal for possible patterns and associations.',
    interpretationNotes:[
      'Entries reflect only what the user chose to log; absence of an entry does not prove absence of an exposure or symptom.',
      'Possible Gluten means suspected gluten exposure or contamination, not confirmed exposure.',
      'Timestamps can be used to examine whether symptoms followed triggers within different time windows.',
      'Associations in this journal do not establish medical causation or diagnosis.'
    ],
    trackedItems:{
      triggers:TRIGGERS,
      symptoms:[...PRIMARY,...MORE],
      vitamins:VITAMINS,
      relief:['Tums'],
      sleep:['Poor sleep','Okay sleep','Good sleep'],
      caffeine:['Coffee','Tea','Energy drink','Soda','Other'],
      food:['Breakfast','Lunch','Dinner','Snacks'],
      water:{unit:'fl oz'},
      cycle:['Period'],
      checkIn:CHECKIN
    },
    summary:{
      firstDate:dayKeys[0]||null,
      lastDate:dayKeys[dayKeys.length-1]||null,
      daysWithData:dayKeys.length,
      totalEvents:events.length,
      eventCounts
    },
    journal
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`hashi-ai-journal-${todayKey()}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast('AI journal exported',false);
}
async function importData(file){const data=JSON.parse(await file.text());if(!Array.isArray(data.events)||!Array.isArray(data.daily))throw new Error('Invalid backup');const etx=db.transaction(['events','daily'],'readwrite');for(const e of data.events)etx.objectStore('events').put(e);for(const d of data.daily)etx.objectStore('daily').put(d);await new Promise((res,rej)=>{etx.oncomplete=res;etx.onerror=()=>rej(etx.error)});showToast('Backup imported',false);await refreshToday();}
async function deleteAll(){if(!confirm('Delete every Hashi entry stored on this device? This cannot be undone unless you exported a backup.'))return;const t=db.transaction(['events','daily'],'readwrite');t.objectStore('events').clear();t.objectStore('daily').clear();await new Promise((res,rej)=>{t.oncomplete=res;t.onerror=()=>rej(t.error)});$('#settingsView').classList.add('hidden');await refreshToday();}
async function init(){await openDB();renderButtons();renderCheckin();const now=new Date();$('#dateLabel').textContent=now.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true; if(!standalone && localStorage.getItem('hideInstall')!=='1')$('#installBanner').classList.remove('hidden');$('#moreSymptomsBtn').onclick=()=>{$('#moreSymptoms').classList.toggle('hidden');$('#moreSymptomsBtn').textContent=$('#moreSymptoms').classList.contains('hidden')?'More symptoms':'Hide extra symptoms'};$('#takeAllBtn').onclick=takeAll;$('#tumsBtn').onclick=()=>addEvent('relief','Tums');$('#periodBtn').onclick=togglePeriod;$('#undoBtn').onclick=undo;$('#clearTodayBtn').onclick=clearToday;$$('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('#settingsBtn').onclick=()=>$('#settingsView').classList.remove('hidden');$('#closeSettings').onclick=()=>$('#settingsView').classList.add('hidden');$('#exportBtn').onclick=exportData;$('#aiExportBtn').onclick=exportForAI;$('#importInput').onchange=async e=>{try{await importData(e.target.files[0])}catch(err){alert('That backup could not be imported.')}};$('#deleteAllBtn').onclick=deleteAll;$('#dismissInstall').onclick=()=>{localStorage.setItem('hideInstall','1');$('#installBanner').classList.add('hidden')};await refreshToday();if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}


function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function localInput(iso){const d=new Date(iso);return `${localDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function field(label,name,value='',type='text',extra=''){return `<label class="form-field">${escapeHtml(label)}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`}
function selectField(label,name,values,value){return `<label class="form-field">${escapeHtml(label)}<select name="${name}">${values.map(v=>`<option ${v===value?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></label>`}
function detailText(e){const d=e.details||{};return [d.hours!=null?`${d.hours} hours`:null,d.servings!=null?`${d.servings} serving(s)`:null,d.caffeineMg!=null?`${d.caffeineMg} mg caffeine`:null,d.amountOz!=null?`${d.amountOz} fl oz`:null,d.notes].filter(Boolean).join(' · ')}
let editingEvent=null,selectedDay=null;
function openEntry(type,value,ev=null){
 editingEvent=ev;const d=ev?.details||{};$('#entryHeading').textContent=ev?'Edit entry':`Log ${value.toLowerCase()}`;
 let html=field('Date & time','time',localInput(ev?.createdAt||new Date().toISOString()),'datetime-local','required');
 if(type==='sleep')html+=selectField('Sleep quality','value',['Poor sleep','Okay sleep','Good sleep'],value)+field('Hours slept (optional)','hours',d.hours??'','number','min="0" max="24" step="0.25"');
 else if(type==='caffeine')html+=selectField('Drink','value',['Coffee','Tea','Energy drink','Soda','Other'],value)+field('Servings','servings',d.servings??1,'number','min="0.1" step="0.1" required')+field('Caffeine in mg (optional, total)','caffeineMg',d.caffeineMg??'','number','min="0" step="1"');
 else if(type==='food')html+=selectField('Meal','value',['Breakfast','Lunch','Dinner','Snacks'],value);
 else if(type==='water')html+=field('Water (US fl oz)','amountOz',d.amountOz??8,'number','min="0.1" step="0.1" required');
 else html+=field('Entry','value',value,'text','required');
 html+=`<label class="form-field">${type==='food'?'What did you eat?':'Notes (optional)'}<textarea name="notes" rows="3" placeholder="${type==='food'?'Foods, ingredients, or anything you want to remember':'Anything you want to remember'}" ${type==='food'?'required':''}>${escapeHtml(d.notes||'')}</textarea></label>`;
 $('#entryFields').innerHTML=html;$('#entryError').textContent='';$('#deleteEntry').classList.toggle('hidden',!ev);
 $('#entryForm').onsubmit=async event=>{event.preventDefault();const btn=event.submitter;btn.disabled=true;try{
 const f=new FormData(event.target);const at=new Date(f.get('time'));if(!Number.isFinite(+at))throw new Error('Please choose a valid date and time.');
 const details={...d,notes:String(f.get('notes')||'').trim()};for(const key of ['hours','servings','caffeineMg','amountOz'])if(f.has(key)){if(f.get(key)==='')delete details[key];else details[key]=Number(f.get(key));}
 if(type==='food'&&!details.notes)throw new Error('Please add what you ate.');
 const entry={...(ev||{}),id:ev?.id||crypto.randomUUID(),type,value:String(f.get('value')||value).trim(),createdAt:at.toISOString(),day:localDate(at),details,updatedAt:new Date().toISOString()};
 await writeRecord('events',entry);$('#entryDialog').close();await refreshToday();await refreshHistory();if(selectedDay)await openDay(selectedDay);showToast(ev?'Entry updated':'Entry saved',false);
 }catch(err){$('#entryError').textContent=err.message||'Could not save. Please try again.'}finally{btn.disabled=false}};
 $('#deleteEntry').onclick=async()=>{if(!confirm('Delete this entry?'))return;await deleteEvent(ev.id);$('#entryDialog').close();await refreshHistory();if(selectedDay)await openDay(selectedDay)};
 $('#entryDialog').showModal();
}
function writeRecord(store,record){return new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(record);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Save cancelled'))})}
function eventRow(ev){const b=document.createElement('button');b.type='button';b.className='event-row';b.innerHTML=`<span class="timeline-time">${fmtTime(ev.createdAt)}</span><span><strong>${escapeHtml(ev.value)}</strong><small>${escapeHtml(detailText(ev)||ev.type)}</small></span><span aria-hidden="true">›</span>`;b.setAttribute('aria-label',`Edit ${ev.value} at ${fmtTime(ev.createdAt)}`);b.onclick=()=>openEntry(ev.type,ev.value,ev);return b}
async function refreshToday(){const [events,d]=await Promise.all([getDayEvents(todayKey()),getDaily()]);$$('[data-vitamin]').forEach(b=>b.classList.toggle('checked',!!d.vitamins?.[b.dataset.vitamin]));$('#periodBtn').classList.toggle('checked',!!d.period);$$('[data-checkin-key]').forEach(b=>b.classList.toggle('selected',d.checkin?.[b.dataset.checkinKey]===b.dataset.checkinValue));const root=$('#todayTimeline');root.replaceChildren();root.className='timeline';events.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).forEach(e=>root.append(eventRow(e)));if(!events.length)root.innerHTML='<p class="empty-state">Nothing logged yet. Take it at your own pace.</p>';$('#waterTotal').textContent=`Water today: ${waterAmount(events)} fl oz`;$('#dateLabel').textContent=fmtDate(todayKey())}
function waterAmount(events){return Math.round(events.filter(e=>e.type==='water').reduce((n,e)=>n+(Number(e.details?.amountOz)||0),0)*10)/10}
async function refreshHistory(){const [events,daily]=await Promise.all([getAllEvents(),reqPromise(tx('daily').getAll())]);const days=[...new Set([...events.map(e=>e.day),...daily.map(d=>d.day)])].sort().reverse();const root=$('#historyList');root.replaceChildren();for(const day of days){const es=events.filter(e=>e.day===day),d=daily.find(d=>d.day===day);const b=document.createElement('button');b.className='history-day history-button';b.innerHTML=`<h3>${fmtDate(day)}</h3><p class="muted">${es.length} entries${d?.checkin?.Overall?' · '+escapeHtml(d.checkin.Overall):''} · ${waterAmount(es)} fl oz water</p><div class="history-tags spaced">${[...new Set(es.map(e=>e.value))].map(v=>`<span class="mini-tag">${escapeHtml(v)}</span>`).join('')}</div><span class="history-hint">View summary & edit →</span>`;b.onclick=()=>openDay(day);root.append(b)}if(!days.length)root.innerHTML='<div class="card empty-state">No history yet.</div>'}
async function openDay(day){selectedDay=day;const [es,d]=await Promise.all([getDayEvents(day),getDaily(day)]);$('#dayHeading').textContent=fmtDate(day);const symptoms=es.filter(e=>e.type==='symptom').length;$('#daySummary').innerHTML=`<div class="day-summary"><strong>${es.length} entries · ${symptoms} symptom logs</strong><p>${waterAmount(es)} fl oz water · ${es.filter(e=>e.type==='food').length} meal / snack entries</p></div>`;const root=$('#dayEntries');root.replaceChildren();es.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).forEach(e=>root.append(eventRow(e)));if(!es.length)root.innerHTML='<p class="muted">No event entries for this day.</p>';
 $('#dayFields').innerHTML=Object.entries(CHECKIN).map(([k,vals])=>selectField(k,k,['Not logged',...vals],d.checkin?.[k]||'Not logged')).join('')+VITAMINS.map(v=>`<label class="check-label"><input type="checkbox" name="${v}" ${d.vitamins?.[v]?'checked':''}> ${v}</label>`).join('')+`<label class="check-label"><input name="period" type="checkbox" ${d.period?'checked':''}> Period</label>`;
 $('#dayStatus').textContent='';$('#dayForm').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target),updated={...d,checkin:{...d.checkin},vitamins:{...d.vitamins},period:f.has('period'),updatedAt:new Date().toISOString()};for(const k of Object.keys(CHECKIN)){if(f.get(k)==='Not logged')delete updated.checkin[k];else updated.checkin[k]=f.get(k)}for(const v of VITAMINS)updated.vitamins[v]=f.has(v);try{await writeRecord('daily',updated);await refreshToday();await refreshHistory();$('#dayStatus').textContent='Daily changes saved.'}catch{$('#dayStatus').textContent='Could not save. Please try again.'}};
 if(!$('#dayDialog').open)$('#dayDialog').showModal();
}
function initJournal(){
 $('#sleepBtn').onclick=()=>openEntry('sleep','Poor sleep');$('#caffeineBtn').onclick=()=>openEntry('caffeine','Coffee');for(const value of ['Breakfast','Lunch','Dinner','Snacks','Water']){const b=document.createElement('button');b.className='chip';b.textContent=value;b.onclick=()=>openEntry(value==='Water'?'water':'food',value);$('#foodButtons').append(b)}
 $('#closeEntry').onclick=()=>$('#entryDialog').close();$('#closeDay').onclick=()=>$('#dayDialog').close();$('#dayDialog').addEventListener('close',()=>selectedDay=null);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshToday()});
}

init().then(initJournal).catch(()=>alert("Hashi could not open local storage. Please reopen the app."));
