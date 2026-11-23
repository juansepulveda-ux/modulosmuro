import {fail,chileClock} from './http.js';
const TYPES=['muro','airtrail'];
export function modulesFrom(plans){
 const out=[];
 for(const type of TYPES)for(const m of plans[type]?.modules||[]){
  if(!Number.isInteger(m.start)||m.start<0||m.start>=1440)continue;
  const operational=type==='muro'?!!m.primary:['equipMain','launchMain','brakeMain'].every(role=>{
   const tasks=m.assign?.[role]||[];
   const start=role==='equipMain'?m.equipStart:m.launchStart;
   const end=role==='equipMain'?m.equipEnd:m.end;
   let covered=start;
   for(const t of [...tasks].sort((a,b)=>a.start-b.start)){if(t.assigned==null||t.start>covered)continue;covered=Math.max(covered,t.end)}
   return Number.isFinite(start)&&Number.isFinite(end)&&covered>=end;
  });
  out.push({key:`${type}:${m.start}`,type,start:m.start,end:m.end,number:m.id,operational});
 }
 const keys=out.map(m=>m.key);if(new Set(keys).size!==keys.length)fail(409,'La jornada tiene módulos repetidos a la misma hora. Corrige el planificador.');
 return out.sort((a,b)=>a.start-b.start||a.type.localeCompare(b.type));
}
export const active=r=>r.status!=='cancelled';
export const activities=m=>m.type==='muro'?['muro']:['airtrail','tirolesa'];
export function capacity(day,m,a){return day.overrides[m.key]?.[a]??day.defaults[a]??0}
export function usage(day,key,a,except){return day.registrations.filter(r=>active(r)&&r.moduleKey===key&&r.id!==except&&r.activities.includes(a)).length}
export function annotate(day,modules){return modules.map(m=>({...m,capacity:Object.fromEntries(activities(m).map(a=>[a,capacity(day,m,a)])),used:Object.fromEntries(activities(m).map(a=>[a,usage(day,m.key,a)])),override:day.overrides[m.key]||{}}))}
function integer(v,min,max,label){if(!Number.isInteger(v)||v<min||v>max)fail(400,`${label}: debe ser un entero entre ${min} y ${max}.`);return v}
function text(v,max,label,required=false){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(400,`${label} inválido.`);return v.trim()}
const audit=(r,action,user)=>{r.history||=[];r.history.push({action,at:new Date().toISOString(),by:user.username});r.revision=(r.revision||0)+1};
export function changeDay(day,modules,b,user,date){
 const now=new Date().toISOString();
 if(b.action==='capacity'){
  if(!['admin','vendedor'].includes(user.role))fail(403,'No puedes modificar cupos.');
  if(b.version!==day.version)fail(409,'Los cupos o inscripciones cambiaron. Actualiza y revisa antes de guardar.');
  const next=structuredClone(day);
  if(b.moduleKey){const m=modules.find(m=>m.key===b.moduleKey);if(!m)fail(404,'Módulo no encontrado.');
   if(b.inherit)delete next.overrides[m.key];
   else{next.overrides[m.key]={};for(const a of activities(m))next.overrides[m.key][a]=integer(b.values?.[a],0,500,'Cupo')}
  }else{for(const a of ['muro','airtrail','tirolesa'])next.defaults[a]=integer(b.values?.[a],0,500,'Cupo')}
  for(const m of modules)for(const a of activities(m))if(usage(day,m.key,a)>capacity(next,m,a))fail(409,'No puedes dejar un cupo menor que la cantidad ya inscrita.');
  day.defaults=next.defaults;day.overrides=next.overrides;day.capacityHistory||=[];day.capacityHistory.push({at:now,by:user.username,moduleKey:b.moduleKey||null,defaults:structuredClone(day.defaults),overrides:structuredClone(day.overrides)});return {ok:true};
 }
 if(b.action==='register'||b.action==='edit'){
  if(!['admin','vendedor'].includes(user.role))fail(403,'No puedes inscribir participantes.');
  if(!/^[a-f0-9-]{36}$/i.test(b.id||''))fail(400,'Identificador de inscripción inválido.');
  const existing=day.registrations.find(r=>r.id===b.id);
  if(b.action==='register'&&existing)return {ok:true,id:existing.id,repeated:true};
  if(b.action==='edit'&&(!existing||!active(existing)))fail(404,'Inscripción no encontrada.');
  if(existing&&b.revision!==existing.revision)fail(409,'Esta inscripción cambió. Actualiza antes de editar.');
  const m=modules.find(m=>m.key===b.moduleKey);if(!m||!m.operational)fail(409,'Este módulo no está disponible para inscripciones.');
  if(existing?.checkin&&existing.moduleKey!==m.key)fail(409,'Deshaz el check-in antes de cambiar el módulo.');
  const list=Array.isArray(b.activities)?[...new Set(b.activities)]:[];
  if(!list.length||list.some(a=>!activities(m).includes(a)))fail(400,'Selecciona al menos una actividad válida.');
  const r={id:b.id,moduleKey:m.key,name:text(b.name,120,'Nombre',true),age:integer(b.age,0,120,'Edad'),declaration:b.declaration,notes:text(b.notes??'',1000,'Observaciones'),activities:list};
  if(typeof r.declaration!=='boolean')fail(400,'Indica si tiene declaración jurada.');
  for(const a of list)if(usage(day,m.key,a,b.id)>=capacity(day,m,a))fail(409,`No quedan cupos en ${a}. Actualiza la lista.`);
  if(existing){const before={name:existing.name,age:existing.age,moduleKey:existing.moduleKey,activities:existing.activities,declaration:existing.declaration,notes:existing.notes};Object.assign(existing,r);audit(existing,'edit',user);existing.history.at(-1).before=before;}
  else{r.createdAt=now;r.createdBy=user.username;r.status='active';r.checkin=null;r.history=[];audit(r,'register',user);day.registrations.push(r)}
  return {ok:true,id:r.id};
 }
 const r=day.registrations.find(r=>r.id===b.id&&active(r));if(!r)fail(404,'Inscripción no encontrada.');
 if(b.revision!==r.revision)fail(409,'Otra persona modificó esta inscripción. Actualiza la lista.');
 if(b.action==='cancel'){
  if(!['admin','vendedor'].includes(user.role))fail(403,'No puedes cancelar inscripciones.');
  if(r.checkin)fail(409,'Deshaz el check-in antes de cancelar.');
  r.status='cancelled';audit(r,'cancel',user);return {ok:true};
 }
 if(b.action==='checkin'||b.action==='undoCheckin'){
  if(!['admin','recepcionista'].includes(user.role))fail(403,'Solo recepción puede registrar la llegada.');
  if(date!==chileClock().date)fail(409,'El check-in se realiza únicamente para la jornada de hoy.');
  if(b.action==='checkin'){
   if(r.checkin)return {ok:true};r.checkin={at:now,by:user.username};audit(r,'checkin',user);
  }else{
   if(!r.checkin)return {ok:true};const previous=r.checkin;r.checkin=null;audit(r,'undoCheckin',user);r.history.at(-1).previousCheckin=previous;
  }
  return {ok:true};
 }
 fail(400,'Acción inválida.');
}
export function protectPublished(day,type,nextPlan){
 const modules=modulesFrom({[type]:nextPlan});
 for(const r of day.registrations.filter(r=>active(r)&&r.moduleKey.startsWith(type+':'))){
  const m=modules.find(m=>m.key===r.moduleKey);
  if(!m||!m.operational)fail(409,'Hay participantes inscritos en un módulo que desaparecería o quedaría sin cobertura. Reubica o cancela esas inscripciones antes de publicar.');
 }
}
export function publicName(name){const parts=name.trim().split(/\s+/);return parts.length<2?parts[0]:`${parts[0]} ${parts.at(-1).slice(0,1).toUpperCase()}.`}
export function publicView(day,modules,clock=chileClock()){
 return {...clock,modules:annotate(day,modules).map(m=>({...m,participants:day.registrations.filter(r=>active(r)&&r.moduleKey===m.key).map(r=>({name:publicName(r.name),activities:r.activities}))}))};
}
