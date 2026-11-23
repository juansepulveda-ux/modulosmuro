import {$,api,escape as esc,time,typeLabel,labels,prettyDate,notice,publicSelection} from './common.js';
const screen=document.body.dataset.screen==='yes';let type=new URLSearchParams(location.search).get('tipo')||(screen?'muro':'all');if(!['muro','airtrail','all'].includes(type)||(screen&&type==='all'))type='muro';
let data=null,lastSuccess=0,offset=0,receivedAt=0,loading=false;
function now(){return new Date(Date.now()+offset)}
function clock(){const d=now(),parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,minute:Number(parts.hour)*60+Number(parts.minute)+Number(parts.second)/60,text:`${parts.hour}:${parts.minute}`}}
function syncTabs(){for(const b of $('tabs').children)b.classList.toggle('active',b.dataset.type===type);if(screen)$('title').textContent=typeLabel(type)}
function render(){const c=clock();$('clock').textContent=c.text;if(!data)return;
 if(c.date!==data.date){$('modules').innerHTML='<div class="empty">Comenzó una nueva jornada. Actualizando…</div>';load();return}
 if(Date.now()-lastSuccess>90000){$('modules').innerHTML='<div class="empty">La información necesita actualizarse. Estamos intentando reconectar.</div>';return}
 $('dateLabel').textContent=prettyDate(data.date);
 const mods=screen?publicSelection(data.modules,c.minute,type):data.modules.filter(m=>type==='all'||m.type===type);
 // Rotate whole cards too if overlapping starts ever exceed three visible modules.
 const cardPages=Math.max(1,Math.ceil(mods.length/3)),cardPage=Math.floor(Date.now()/12000)%cardPages;
 const visible=screen?mods.slice(cardPage*3,cardPage*3+3):mods;
 const rowsPerPage=Math.max(3,Math.min(10,Math.floor((window.innerHeight-360)/52)));
 $('modules').innerHTML=visible.length?visible.map(m=>{
  const pages=Math.max(1,Math.ceil(m.participants.length/rowsPerPage)),page=Math.floor(Date.now()/9000)%pages;
  const participants=screen?m.participants.slice(page*rowsPerPage,(page+1)*rowsPerPage):m.participants;
  const status=c.minute<m.start?'Próximo inicio':c.minute<m.start+10?'Ya comenzó':c.minute<m.end?'En curso':'Finalizado';
  return `<article class="module-card ${!screen&&c.minute>=m.end?'is-past':''}"><div class="row between"><span class="module-type">${typeLabel(m.type)}</span><span class="chip ${status==='Ya comenzó'?'good':''}">${status}</span></div><div class="module-time">${time(m.start)}</div><p class="hint">Módulo ${m.number} · Hasta ${time(m.end)}</p>${!m.operational?'<span class="chip warn">Consultar disponibilidad en recepción</span>':''}<div class="public-count">${m.participants.length} participantes inscritos</div><div class="names">${participants.length?participants.map(p=>`<div class="name-row"><span>${esc(p.name)}</span>${m.type==='airtrail'?`<small>${p.activities.map(a=>labels[a]).join(' + ')}</small>`:''}</div>`).join(''):'<p class="muted">Aún no hay participantes inscritos.</p>'}</div>${screen&&pages>1?`<div class="page-counter">Nombres ${page*rowsPerPage+1}–${Math.min((page+1)*rowsPerPage,m.participants.length)} de ${m.participants.length} · La lista avanza sola</div>`:''}</article>`;
 }).join(''):`<div class="empty"><h2>${data.modules.length&&screen?'No quedan próximos módulos':'No hay módulos publicados para hoy'}</h2><p>Consulta con nuestro equipo en recepción.</p></div>`;
 $('updated').textContent=`Actualizado a las ${new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(receivedAt+offset))}${screen&&cardPages>1?' · Grupos '+(cardPage+1)+'/'+cardPages:''}`;
}
async function load(){if(loading)return;loading=true;try{const started=Date.now();const d=await api('/api/publico');receivedAt=Date.now();offset=Date.parse(d.now)-(started+receivedAt)/2;data=d;lastSuccess=Date.now();notice('');render()}catch(e){notice('Sin actualización: '+e.message,true);if(!data)$('modules').innerHTML='<div class="empty">No se pudo cargar la jornada. Se reintentará automáticamente.</div>'}finally{loading=false}}
$('tabs').onclick=e=>{const b=e.target.closest('[data-type]');if(!b)return;type=b.dataset.type;history.replaceState(null,'',`${location.pathname}?tipo=${type}`);syncTabs();render()};
if(screen)$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>notice('Activa pantalla completa desde el menú del navegador.',true))};
syncTabs();load();setInterval(load,20000);setInterval(render,1000);window.addEventListener('online',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
