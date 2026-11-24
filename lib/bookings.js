import {assertEnrollment} from './operations.js';
import {defaultSettings} from './settings.js';
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
export const confirmed=r=>active(r)&&r.paid!==false;
export const activities=m=>m.type==='muro'?['muro']:['airtrail','tirolesa'];
export function capacity(day,m,a){return day.overrides[m.key]?.[a]??day.defaults[a]??0}
export function usage(day,key,a,except){return day.registrations.filter(r=>active(r)&&r.moduleKey===key&&r.id!==except&&r.activities.includes(a)).length}
export function annotate(day,modules){return modules.map(m=>({...m,capacity:Object.fromEntries(activities(m).map(a=>[a,capacity(day,m,a)])),used:Object.fromEntries(activities(m).map(a=>[a,usage(day,m.key,a)])),override:day.overrides[m.key]||{}}))}
function integer(v,min,max,label){if(!Number.isInteger(v)||v<min||v>max)fail(400,`${label}: debe ser un entero entre ${min} y ${max}.`);return v}
function text(v,max,label,required=false){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(400,`${label} inválido.`);return v.trim()}
const audit=(r,action,user)=>{r.history||=[];r.history.push({action,at:new Date().toISOString(),by:user.username});r.revision=(r.revision||0)+1};
export function changeDay(day,modules,b,user,date,config=defaultSettings(),clock=chileClock()){
 const now=new Date().toISOString();
 if(b.action==='block'){
  if(!['admin','vendedor'].includes(user.role))fail(403,'No puedes bloquear módulos.');if(b.version!==day.version)fail(409,'La jornada cambió. Actualiza antes de bloquear.');if(!modules.some(m=>m.key===b.moduleKey)||typeof b.blocked!=='boolean')fail(400,'Módulo o bloqueo inválido.');day.blocks||={};day.blocks[b.moduleKey]={blocked:b.blocked,reason:text(b.reason||'',200,'Motivo'),at:now,by:user.username};day.blockHistory||=[];day.blockHistory.push({moduleKey:b.moduleKey,...day.blocks[b.moduleKey]});return {ok:true};
 }
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
  const changingPlace=!existing||existing.moduleKey!==m.key||[...existing.activities].sort().join(',')!==[...list].sort().join(',');
  if(changingPlace){if(existing?.checkin)fail(409,'Deshaz el check-in antes de cambiar módulo o actividades.');if(existing){const old=modules.find(x=>x.key===existing.moduleKey);if(old)assertEnrollment({...day,blocks:{}},old,date,config,clock);}assertEnrollment(day,m,date,config,clock);}
  if((!existing||b.age!==existing.age)&&b.age<config.warningAge&&b.ageWarningAccepted!==true)fail(400,`Participante menor de ${config.warningAge} años. Revisa la edad y confirma la alerta.`);
  const r={id:b.id,moduleKey:m.key,name:text(b.name,120,'Nombre',true),age:integer(b.age,0,120,'Edad'),declaration:b.declaration,notes:text(b.notes??'',1000,'Observaciones'),activities:list};
  if(typeof r.declaration!=='boolean')fail(400,'Indica si tiene declaración jurada.');
  if(b.paid!==undefined&&typeof b.paid!=='boolean')fail(400,'Estado de pago inválido.');
  if(existing?.checkin&&b.paid===false)fail(409,'Deshaz el check-in antes de quitar el pago.');
  // An existing digital signature covers a specific participant identity.
  // Operational corrections are audited; the original signed declaration stays immutable.
  for(const a of list)if(usage(day,m.key,a,b.id)>=capacity(day,m,a))fail(409,`No quedan cupos en ${a}. Actualiza la lista.`);
  if(existing){const before={name:existing.name,age:existing.age,moduleKey:existing.moduleKey,activities:existing.activities,declaration:existing.declaration,notes:existing.notes};Object.assign(existing,r);audit(existing,'edit',user);existing.history.at(-1).before=before;}
  else{r.paid=false;r.createdAt=now;r.createdBy=user.username;r.status='active';r.checkin=null;r.history=[];audit(r,'register',user);day.registrations.push(r)}
  const target=existing||r;
  if(b.paid!==undefined&&target.paid!==b.paid){const previous=target.paid??null;target.paid=b.paid;target.payment=b.paid?{at:now,by:user.username}:null;target.history.push({action:b.paid?'paid':'undoPayment',at:now,by:user.username,previous});}
  return {ok:true,id:r.id};
 }
 const r=day.registrations.find(r=>r.id===b.id&&active(r));if(!r)fail(404,'Inscripción no encontrada.');
 if(b.revision!==r.revision)fail(409,'Otra persona modificó esta inscripción. Actualiza la lista.');
 if(b.action==='payment'){
  if(!['admin','vendedor'].includes(user.role))fail(403,'Solo ventas o administración pueden registrar pagos.');
  if(typeof b.paid!=='boolean')fail(400,'Estado de pago inválido.');
  if(r.checkin&&!b.paid)fail(409,'Deshaz el check-in antes de quitar el pago.');
  const previous=r.paid??null;
  r.paid=b.paid;r.payment=b.paid?{at:now,by:user.username}:null;
  audit(r,b.paid?'paid':'undoPayment',user);r.history.at(-1).previous=previous;return {ok:true};
 }
 if(b.action==='cancel'){
  if(!['admin','vendedor'].includes(user.role)&&!(user.role==='recepcionista'&&r.paid===false))fail(403,'Recepción solo puede cancelar inscripciones pendientes de pago.');
  if(r.checkin)fail(409,'Deshaz el check-in antes de cancelar.');
  r.status='cancelled';r.cancellation={at:now,by:user.username,reason:'manual',description:'Cancelada por el personal'};audit(r,'cancel',user);return {ok:true};
 }
 if(b.action==='checkin'||b.action==='undoCheckin'){
  if(!['admin','recepcionista'].includes(user.role))fail(403,'Solo recepción puede registrar la llegada.');
  if(date!==chileClock().date)fail(409,'El check-in se realiza únicamente para la jornada de hoy.');
  if(b.action==='checkin'){
   if(r.paid===false)fail(409,'El pago está pendiente. Pide a ventas que lo confirme antes del check-in.');
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
 return {...clock,modules:annotate(day,modules).map(m=>({...m,participants:day.registrations.filter(r=>confirmed(r)&&r.moduleKey===m.key).map(r=>({name:publicName(r.name),activities:r.activities}))}))};
}
