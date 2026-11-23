export const $=id=>document.getElementById(id);
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
export const labels={muro:'Muro',airtrail:'Airtrail',tirolesa:'Tirolesa'};
export const typeLabel=t=>t==='muro'?'Muro de escalada':'Airtrail + Tirolesa';
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const prettyDate=d=>new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
export const localTimestamp=s=>new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(s));
export async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo completar la operación.');return d}
export function notice(text,error=false,id='notice'){const el=$(id);if(el){el.textContent=text;el.className='notice'+(error?' error':'')}}
export const capacityChips=m=>Object.keys(m.capacity).map(a=>`<span class="chip ${m.used[a]>=m.capacity[a]?'warn':''}">${labels[a]} · ${m.used[a]}/${m.capacity[a]}</span>`).join('');
export function publicSelection(modules,minute,type){const list=modules.filter(m=>m.type===type).sort((a,b)=>a.start-b.start);return [...list.filter(m=>m.start<=minute&&minute<m.start+10),...list.filter(m=>m.start>minute).slice(0,2)]}
