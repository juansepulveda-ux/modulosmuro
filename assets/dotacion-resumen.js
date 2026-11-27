// Vista de solo lectura del formulario. No hace solicitudes ni guarda datos.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const minutes=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
export const clock=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
export function buildTimeline(entries){
 const valid=[],invalid=[];
 for(const entry of entries){const start=minutes(entry.start),end=minutes(entry.end);if(start===null||end===null||end<=start){invalid.push(entry);continue;}valid.push({...entry,startMinute:start,endMinute:end});}
 if(!valid.length)return {people:[],rows:[],invalid};
 const first=Math.floor(Math.min(...valid.map(p=>p.startMinute))/30)*30;
 const last=Math.ceil(Math.max(...valid.map(p=>p.endMinute))/30)*30;
 const boundaries=new Set(valid.flatMap(p=>[p.startMinute,p.endMinute]));
 for(let t=first;t<=last;t+=30)boundaries.add(t);
 const times=[...boundaries].sort((a,b)=>a-b);
 const rows=times.slice(0,-1).map((start,i)=>{const end=times[i+1],active=valid.filter(p=>p.startMinute<=start&&p.endMinute>=end);return {start,end,total:active.length,muro:active.filter(p=>p.areas.muro).length,airtrail:active.filter(p=>p.areas.airtrail).length};});
 return {people:valid.map(p=>({...p,firstRow:times.indexOf(p.startMinute),rowSpan:times.indexOf(p.endMinute)-times.indexOf(p.startMinute)})),rows,invalid};
}
function activity(p){return p.areas.muro&&p.areas.airtrail?'Ambas actividades':p.areas.muro?'Muro':p.areas.airtrail?'Airtrail / Tirolesa':'Actividad pendiente';}
function activityClass(p){return p.areas.muro&&p.areas.airtrail?'both':p.areas.muro?'muro':p.areas.airtrail?'airtrail':'pending';}
export function timelineMarkup(entries,date){
 const model=buildTimeline(entries),{people,rows,invalid}=model;
 const warning=invalid.length?`<p class="timeline-warning" role="status">Completa o corrige el ingreso y la salida de: ${invalid.map(p=>escapeHtml(p.name)).join(', ')}. Todavía no aparecen en la tabla.</p>`:'';
 if(!people.length)return warning+'<p class="timeline-empty">Marca los monitores que trabajan e ingresa sus horarios para ver aquí el resumen del día.</p>';
 const head=people.map(p=>`<th scope="col"><span class="timeline-name">${escapeHtml(p.name)}</span><span class="timeline-shift">${escapeHtml(p.start)}–${escapeHtml(p.end)}</span></th>`).join('');
 const body=rows.map((row,i)=>`<tr><th scope="row" class="timeline-hour">${clock(row.start)}<span> a ${clock(row.end)}</span></th>${people.map(p=>{if(i===p.firstRow)return `<td rowspan="${p.rowSpan}" class="timeline-duty timeline-${activityClass(p)}"><div><strong>${activity(p)}</strong><span>${escapeHtml(p.start)}–${escapeHtml(p.end)}</span></div></td>`;if(i>p.firstRow&&i<p.firstRow+p.rowSpan)return '';return '<td class="timeline-off"><span class="timeline-sr-only">Fuera de turno</span></td>';}).join('')}<td class="timeline-total"><strong>${row.total}</strong><span>Muro: ${row.muro}<br>Airtrail: ${row.airtrail}</span></td></tr>`).join('');
 return warning+`<div class="timeline-scroll" tabindex="0" role="region" aria-label="Tabla de horarios de monitores; desplázate para ver todas las columnas"><table class="timeline-table"><caption>Disponibilidad del ${escapeHtml(date)} · ${people.length} ${people.length===1?'monitor':'monitores'}</caption><thead><tr><th scope="col" class="timeline-hour">Horario</th>${head}<th scope="col">En turno</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function mount(){
 const list=document.getElementById('rosterList'),output=document.getElementById('timelineOutput'),status=document.getElementById('timelineStatus'),dirtyLabel=document.getElementById('dirtyLabel');
 if(!list||!output||!status)return;
 let frame=null;
 function render(){frame=null;const entries=[...list.querySelectorAll('[data-monitor]')].filter(row=>row.querySelector('[data-working]')?.checked).map(row=>({name:row.querySelector('.roster-person strong')?.textContent||'Monitor',start:row.querySelector('[data-start]')?.value||'',end:row.querySelector('[data-end]')?.value||'',areas:{muro:!!row.querySelector('[data-area="muro"]')?.checked,airtrail:!!row.querySelector('[data-area="airtrail"]')?.checked}}));
 const date=document.getElementById('date')?.value||'';const label=dirtyLabel?.textContent||'';const dirty=/Cambios sin guardar/i.test(label);
 status.textContent=dirty?'Vista previa con cambios sin guardar. Pulsa «Guardar dotación del día» para conservarlos.':label.includes('Carga una jornada')?'Cargando la dotación…':'Resumen de la dotación cargada. Se actualiza al editar los horarios.';
 status.classList.toggle('timeline-warning',dirty);
 // Conservar el desplazamiento al modificar un horario o una actividad.
 const previous=output.querySelector('.timeline-scroll'),left=previous?.scrollLeft||0,top=previous?.scrollTop||0;
 output.innerHTML=timelineMarkup(entries,date);const next=output.querySelector('.timeline-scroll');if(next){next.scrollLeft=left;next.scrollTop=top;}
 }
 function schedule(){if(frame===null)frame=requestAnimationFrame(render);}
 list.addEventListener('input',schedule);list.addEventListener('change',schedule);
 new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
 if(dirtyLabel)new MutationObserver(schedule).observe(dirtyLabel,{childList:true,subtree:true,characterData:true});
 render();
}
if(typeof document!=='undefined')mount();
