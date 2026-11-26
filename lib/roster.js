import {fail} from './http.js';
import {validTime,skillKeys} from './monitors.js';
import {redis,prefix} from './redis.js';
export const emptyRoster=date=>({schemaVersion:1,date,revision:0,entries:[],updatedAt:null,updatedBy:null});
export async function readRoster(date){const raw=await redis('GET',`${prefix()}:roster:${date}`);const value=raw?JSON.parse(raw):emptyRoster(date);if(value.schemaVersion!==1||!Array.isArray(value.entries))fail(503,'La dotación requiere una versión compatible.');return value;}
export function validateRoster(entries,people){
 if(!Array.isArray(entries)||entries.length>1000)fail(400,'Dotación inválida.');const ids=new Set();
 return entries.map(e=>{const p=people.find(p=>p.id===e.monitorId);if(!p)fail(400,'Uno de los monitores ya no existe en la base.');if(ids.has(p.id))fail(400,'Un monitor está repetido en la dotación.');ids.add(p.id);
  if(!p.active)fail(409,p.name+': está inactivo. Retíralo de la dotación o actívalo en la base.');if(p.needsReview)fail(409,p.name+': revisa y guarda sus capacidades en Base de monitores antes de asignarlo.');
  if(!validTime(e.start)||!validTime(e.end)||e.end<=e.start)fail(400,p.name+': la salida debe ser posterior al ingreso, dentro del mismo día.');
  if(typeof e.areas?.muro!=='boolean'||typeof e.areas?.airtrail!=='boolean'||!e.areas.muro&&!e.areas.airtrail)fail(400,p.name+': selecciona Muro, Airtrail / Tirolesa o ambas.');
  for(const a of ['muro','airtrail'])if(e.areas[a]&&!p.areas[a])fail(409,p.name+': no está habilitado para '+(a==='muro'?'Muro':'Airtrail / Tirolesa')+'.');
  if(e.areas.airtrail&&!skillKeys.some(k=>p.airtrail.skills[k]))fail(409,p.name+': no tiene capacitaciones de Airtrail / Tirolesa.');
  return {monitorId:p.id,start:e.start,end:e.end,areas:{muro:e.areas.muro,airtrail:e.areas.airtrail}};
 });
}
export function importRoster(roster,base,type){
 if(!['muro','airtrail'].includes(type))fail(400,'Planificador inválido.');if(!roster.updatedAt)fail(404,'No hay dotación guardada para esta fecha. Guárdala primero en Dotación diaria.');
 const selected=roster.entries.filter(e=>e.areas[type]);validateRoster(selected,base.people);
 const people=selected.map(e=>{const p=base.people.find(p=>p.id===e.monitorId);return {...p,defaultStart:e.start,defaultEnd:e.end,rosterAreas:{...e.areas}};});
 return {date:roster.date,revision:roster.revision,baseRevision:base.revision,updatedAt:roster.updatedAt,updatedBy:roster.updatedBy,type,people,both:people.filter(p=>p.rosterAreas.muro&&p.rosterAreas.airtrail).map(p=>p.name)};
}
