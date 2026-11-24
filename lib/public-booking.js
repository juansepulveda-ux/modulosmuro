import {randomUUID} from 'node:crypto';
import {fail,chileClock} from './http.js';
import {uuid,ageOn} from './declarations.js';
import {active,changeDay,annotate} from './bookings.js';

export function declarationPeople(doc){return [...(doc.mode!=='minors'?[{id:'self',name:doc.adult.name,birthDate:doc.adult.birthDate}]:[]),...doc.children];}
export function bookingReceipt(registrations){return {ok:true,orderId:registrations[0].orderId,registrations:registrations.map(r=>({id:r.id,name:r.name,moduleKey:r.moduleKey,activities:r.activities,paid:r.paid,active:active(r)}))};}
export function publicCatalog(day,modules,clock=chileClock()){
 return {clock,modules:annotate(day,modules).filter(m=>m.operational&&m.start>clock.minute)};
}
export function createPublicBooking(day,modules,b,doc,owner,clock=chileClock()){
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
  if(!m||!m.operational||m.start<=clock.minute)fail(409,'Uno de los módulos ya comenzó o dejó de estar disponible. Elige otro horario.');
  if(working.registrations.some(r=>active(r)&&r.customerId===owner&&r.personId===p.id&&(()=>{const other=modules.find(x=>x.key===r.moduleKey);return other&&m.start<other.end&&other.start<m.end;})()))fail(409,`${p.name} ya tiene una actividad que coincide con ese horario. Revisa su selección o consulta a recepción.`);
  const id=randomUUID();
  changeDay(working,modules,{action:'register',id,moduleKey:m.key,name:p.name,age:ageOn(p.birthDate,clock.date),declaration:true,paid:false,notes:'',activities:s.activities},{role:'vendedor',username:'Autogestión web'},clock.date);
  const r=working.registrations.find(r=>r.id===id);
  Object.assign(r,{source:'public',customerId:owner,personId:p.id,declarationId:doc.id,orderId:b.orderId});created.push(r);
 }
 // Commit only after every person/activity passes capacity validation.
 day.registrations=working.registrations;
 return bookingReceipt(created);
}
