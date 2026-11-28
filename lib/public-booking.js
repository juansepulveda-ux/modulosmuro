import {randomUUID} from 'node:crypto';
import {fail,chileClock} from './http.js';
import {uuid,ageOn} from './declarations.js';
import {assertEnrollment,registrationWindow,wallMinute} from './operations.js';
import {defaultSettings} from './settings.js';
import {active,changeDay,annotate,capacity,usage} from './bookings.js';

export function declarationPeople(doc){return [...(doc.mode!=='minors'?[{id:'self',name:doc.adult.name,birthDate:doc.adult.birthDate}]:[]),...doc.children];}
export function bookingReceipt(registrations){return {ok:true,orderId:registrations[0].orderId,registrations:registrations.map(r=>({id:r.id,name:r.name,moduleKey:r.moduleKey,activities:r.activities,paid:r.paid,active:active(r)}))};}

// Resolve a wall-clock cutoff in Santiago without hard-coding UTC-3 / UTC-4.
function cutoffInstant(date,minute,clock){
 const target=wallMinute(date,minute)*60000;
 let candidate=Math.round(Date.parse(clock.now)+(target-wallMinute(clock.date,clock.minute)*60000));
 for(let i=0;i<4;i++){const local=chileClock(new Date(candidate)),difference=Math.round(target-wallMinute(local.date,local.minute)*60000);if(difference===0)return candidate;candidate+=difference;}
 return NaN; // A nonexistent local time must not produce an invented deadline.
}
export function receiptWithPaymentNotice(registrations,day,modules,date,config=defaultSettings(),clock=chileClock()){
 const receipt=bookingReceipt(registrations),nowMs=Date.parse(clock.now);
 return {...receipt,clock,registrations:receipt.registrations.map(item=>{
  const r=registrations.find(r=>r.id===item.id),m=modules.find(m=>m.key===r.moduleKey);
  if(!config.releaseUnpaid||!active(r)||r.paid!==false||r.checkin||!m)return {...item,paymentNotice:null};
  const created=typeof r.createdAt==='string'?Date.parse(r.createdAt):NaN;
  const cutoff=cutoffInstant(date,m.start-config.releaseBeforeMinutes,clock);
  if(!Number.isFinite(created)||!Number.isFinite(cutoff))return {...item,paymentNotice:null};
  const deadline=Math.max(created+(config.reservationGraceMinutes??5)*60000,cutoff);
  const full=r.activities.some(a=>capacity(day,m,a)>0&&usage(day,m.key,a)>=capacity(day,m,a));
  return {...item,paymentNotice:{deadlineAt:new Date(deadline).toISOString(),remainingSeconds:Math.max(0,Math.ceil((deadline-nowMs)/1000)),activityFull:full,graceMinutes:config.reservationGraceMinutes??5}};
 })};
}

export function publicCatalog(day,modules,clock=chileClock(),config=defaultSettings()){
 return {clock,config:{warningAge:config.warningAge,releaseUnpaid:config.releaseUnpaid,releaseBeforeMinutes:config.releaseBeforeMinutes,reservationGraceMinutes:config.reservationGraceMinutes??5},modules:annotate(day,modules).filter(m=>m.operational&&!day.blocks?.[m.key]?.blocked&&registrationWindow(m,clock.date,config,clock).open)};
}
export function createPublicBooking(day,modules,b,doc,owner,clock=chileClock(),config=defaultSettings()){
 if(!uuid(b.orderId))fail(400,'Identificador de reserva inválido.');
 const repeated=day.registrations.filter(r=>r.orderId===b.orderId);
 if(repeated.length){if(repeated.some(r=>r.customerId!==owner))fail(409,'La referencia de reserva ya existe.');return bookingReceipt(repeated);}
 if(doc.owner!==owner)fail(403,'Esta declaración no te pertenece.');
 if(doc.date!==clock.date)fail(409,'Confirma y firma tu declaración para la jornada de hoy. Tus datos ya están guardados.');
 if(!Array.isArray(b.selections)||!b.selections.length||b.selections.length>42)fail(400,'Selecciona al menos una actividad y un módulo.');
 const people=declarationPeople(doc),working=structuredClone(day),created=[];
 for(const s of b.selections){
  const p=people.find(p=>p.id===s.personId),m=modules.find(m=>m.key===s.moduleKey);
  if(!p)fail(400,'El participante no está incluido en la declaración firmada.');
  if(!m||!m.operational)fail(409,'Uno de los módulos ya comenzó o dejó de estar disponible. Elige otro horario.');
  assertEnrollment(working,m,clock.date,config,clock);
  if(working.registrations.some(r=>active(r)&&r.customerId===owner&&r.personId===p.id&&(()=>{const other=modules.find(x=>x.key===r.moduleKey);return other&&m.start<other.end&&other.start<m.end;})()))fail(409,`${p.name} ya tiene una actividad que coincide con ese horario. Revisa su selección o consulta a recepción.`);
  const id=randomUUID();
  changeDay(working,modules,{action:'register',id,moduleKey:m.key,name:p.name,age:ageOn(p.birthDate,clock.date),declaration:true,paid:false,notes:'',activities:s.activities,ageWarningAccepted:b.ageWarningAccepted},{role:'vendedor',username:'Autogestión web'},clock.date,config,clock);
  const r=working.registrations.find(r=>r.id===id);
  Object.assign(r,{source:'public',customerId:owner,personId:p.id,declarationId:doc.id,orderId:b.orderId});created.push(r);
 }
 // Commit only after every person/activity passes capacity validation.
 day.registrations=working.registrations;
 return bookingReceipt(created);
}
