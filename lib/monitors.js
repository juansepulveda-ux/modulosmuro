import {createHash,randomUUID} from 'node:crypto';
import {gh} from './github.js';
import {fail} from './http.js';
export const skillKeys=['equip','launch','brake','poles'];
export const monitorPath='data/personal.json';
export const validTime=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function normalizeMonitor(p={},index=0){
 const skills=Object.fromEntries(skillKeys.map(k=>[k,p.airtrail?.skills?.[k]===true]));
 const id=/^[A-Za-z0-9_-]{1,80}$/.test(p.id||'')?p.id:'legacy_'+createHash('sha256').update(JSON.stringify([index,p.name,p.nick])).digest('hex').slice(0,20);
 return {id,name:String(p.name||p.full||'Monitor').slice(0,120),nick:String(p.nick||'').slice(0,60),active:p.active!==false,areas:{muro:typeof p.areas?.muro==='boolean'?p.areas.muro:true,airtrail:typeof p.areas?.airtrail==='boolean'?p.areas.airtrail:skillKeys.some(k=>skills[k])},needsReview:p.needsReview===true||!p.areas,defaultStart:validTime(p.defaultStart)?p.defaultStart:'12:00',defaultEnd:validTime(p.defaultEnd)?p.defaultEnd:'20:00',airtrail:{skills,preferred:skills[p.airtrail?.preferred]?p.airtrail.preferred:''}};
}
export async function readMonitors(){const file=await gh('GET',monitorPath);if(!file)return {revision:null,people:[],updatedAt:null};const raw=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));if((raw.version||1)>2)fail(503,'La base de monitores requiere una versión más nueva.');if(!Array.isArray(raw.people))fail(503,'La base de monitores tiene un formato inválido.');const people=raw.people.map(normalizeMonitor);if(new Set(people.map(p=>p.id)).size!==people.length)fail(503,'Hay identificadores repetidos en la base de monitores.');return {revision:file.sha,people,updatedAt:raw.updatedAt||null};}
function field(value,max,label,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())fail(400,label+' inválido.');return value.trim();}
export function validateMonitor(b,previous){
 if(!b||typeof b!=='object')fail(400,'Monitor inválido.');
 const id=b.id||'p_'+randomUUID();if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))fail(400,'Identificador de monitor inválido.');
 for(const v of [b.active,b.areas?.muro,b.areas?.airtrail,...skillKeys.map(k=>b.airtrail?.skills?.[k])])if(typeof v!=='boolean')fail(400,'Indica las actividades y capacitaciones del monitor.');
 const skills={...b.airtrail.skills};if(b.areas.airtrail&&!skillKeys.some(k=>skills[k]))fail(400,'Marca al menos una capacitación para Airtrail / Tirolesa.');
 const preferred=b.airtrail.preferred||'';if(preferred&&(!skillKeys.includes(preferred)||!skills[preferred]))fail(400,'La función preferida debe estar entre sus capacitaciones.');
 return {...normalizeMonitor(previous||{}),id,name:field(b.name,120,'Nombre',true),nick:field(b.nick||'',60,'Apodo'),active:b.active,areas:{muro:b.areas.muro,airtrail:b.areas.airtrail},needsReview:false,airtrail:{skills:Object.fromEntries(skillKeys.map(k=>[k,skills[k]])),preferred}};
}
export async function saveMonitor(body,user){const current=await readMonitors();if(body.revision!==current.revision)fail(409,'La base de monitores cambió. Recarga antes de guardar.');const prev=current.people.find(p=>p.id===body.monitor?.id);const next=validateMonitor(body.monitor,prev);const people=prev?current.people.map(p=>p.id===next.id?next:p):[...current.people,next];if(people.length>1000)fail(400,'La base admite hasta 1000 monitores.');const data={version:2,people,updatedAt:new Date().toISOString(),updatedBy:user.username};await gh('PUT',monitorPath,{message:'Actualizar base central de monitores',content:Buffer.from(JSON.stringify(data,null,2)).toString('base64'),...(current.revision?{sha:current.revision}:{})});return {ok:true,id:next.id};}
