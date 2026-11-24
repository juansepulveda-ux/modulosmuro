import {operationalDay} from '../lib/operations.js';
import {chileClock} from '../lib/http.js';
import {randomBytes} from 'node:crypto';
import {send,errorResponse,mutation,fail,dateParam} from '../lib/http.js';
import {requireRole} from '../lib/auth.js';
import {redis,prefix,readDay,withDay} from '../lib/redis.js';
import {range,allDayDates,exportPage} from '../lib/reporting.js';
import {modulesFrom,usage,capacity,active} from '../lib/bookings.js';
import {plansFor} from '../lib/github.js';
export default async function handler(req,res){try{
 const user=await requireRole(req,['admin']);
 if(req.method==='GET'){
  const r=range(req.query.from,req.query.to);
  if(req.query.action==='export'){if(!['days','customers'].includes(req.query.type))fail(400,'Exportación inválida.');if(req.query.type==='days'&&(!req.query.cursor||req.query.cursor==='0'))await operationalDay(chileClock().date);return send(res,200,await exportPage(req.query.type,req.query.cursor||'0',r,req.query.archived==='1'));}
  if(req.query.action==='archives'){const results=[];for(const date of await allDayDates(r)){const day=await readDay(date);for(const a of day.archives.filter(a=>!a.restoredAt))results.push({date,id:a.id,at:a.at,by:a.by,count:a.registrations.length});}return send(res,200,{archives:results});}
  fail(400,'Consulta inválida.');
 }
 if(req.method!=='POST')fail(405,'Método no permitido.');mutation(req);const b=req.body||{};
 if(b.action==='preview'){
  const r=range(b.from,b.to,true);if((Date.parse(r.to)-Date.parse(r.from))/86400000>366)fail(400,'Selecciona un máximo de 367 días por limpieza.');
  const days=[];for(const date of await allDayDates(r)){const day=await readDay(date);if(day.registrations.length)days.push({date,version:day.version,count:day.registrations.length});}
  const token=randomBytes(24).toString('hex'),count=days.reduce((n,d)=>n+d.count,0),preview={by:user.username,days,count,createdAt:new Date().toISOString()};
  await redis('SET',`${prefix()}:cleanup:${token}`,JSON.stringify(preview),'EX',900);return send(res,200,{token,days,count,phrase:`ARCHIVAR ${count} INSCRIPCIONES`});
 }
 if(b.action==='archive'){
  if(!/^[a-f0-9]{48}$/.test(b.token||''))fail(400,'Vista previa inválida.');const raw=await redis('GET',`${prefix()}:cleanup:${b.token}`);if(!raw)fail(409,'La vista previa venció. Genera otra.');const p=JSON.parse(raw);
  if(p.by!==user.username||b.phrase!==`ARCHIVAR ${p.count} INSCRIPCIONES`)fail(403,'La confirmación no coincide.');const target=p.days[b.index];if(!Number.isInteger(b.index)||!target)fail(400,'Día inválido.');
  const result=await withDay(target.date,async(day,save)=>{const id=b.token+':'+target.date;if(day.archives.some(a=>a.id===id))return {ok:true,repeated:true,date:target.date};if(day.version!==target.version)fail(409,`La jornada ${target.date} cambió desde la vista previa; no se archivó. Genera otra vista previa.`);day.archives.push({id,at:new Date().toISOString(),by:user.username,registrations:structuredClone(day.registrations)});day.registrations=[];await save();return {ok:true,date:target.date,count:target.count};});return send(res,200,result);
 }
 if(b.action==='restore'){
  const date=dateParam(b.date);const result=await withDay(date,async(day,save)=>{const archive=day.archives.find(a=>a.id===b.id);if(!archive)fail(404,'Archivo no encontrado.');if(archive.restoredAt)return {ok:true,repeated:true};if(archive.registrations.some(r=>day.registrations.some(x=>x.id===r.id)))fail(409,'Hay inscripciones coincidentes. No se sobrescribió ninguna.');const combined={...day,registrations:[...day.registrations,...archive.registrations]},modules=modulesFrom(await plansFor(date));for(const r of archive.registrations.filter(active)){const m=modules.find(m=>m.key===r.moduleKey);if(!m||!m.operational)fail(409,'Antes de restaurar debes recuperar la planificación operativa de esos módulos.');for(const a of r.activities)if(usage(combined,m.key,a)>capacity(day,m,a))fail(409,'La restauración supera los cupos actuales. Ajusta los cupos o reubica inscripciones antes de restaurar.');}day.registrations=combined.registrations;archive.restoredAt=new Date().toISOString();archive.restoredBy=user.username;await save();return {ok:true};});return send(res,200,result);
 }
 fail(400,'Acción inválida.');
}catch(e){return errorResponse(res,e);}}
