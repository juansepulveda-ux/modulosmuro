import {send,errorResponse,mutation,fail,dateParam,chileClock} from '../lib/http.js';
import {requireRole} from '../lib/auth.js';
import {withDay} from '../lib/redis.js';
import {plansFor} from '../lib/github.js';
import {modulesFrom,annotate,changeDay,active} from '../lib/bookings.js';
import {operationalDay,expireReservations,moduleStates} from '../lib/operations.js';
import {settings} from '../lib/settings.js';
export default async function handler(req,res){try{
 const user=await requireRole(req,['admin','vendedor','recepcionista']);
 if(req.method==='GET'){
  const date=dateParam(req.query.date),{day,modules,config,clock}=await operationalDay(date);
  return send(res,200,{date,clock,config,version:day.version,defaults:day.defaults,modules:moduleStates(day,annotate(day,modules),date,config,clock),registrations:day.registrations.filter(active),cancelled:day.registrations.filter(r=>!active(r)),user});
 }
 if(req.method!=='POST')fail(405,'Método no permitido.');mutation(req);const b=req.body||{},date=dateParam(b.date),config=await settings();
 const result=await withDay(date,async(day,save)=>{const modules=modulesFrom(await plansFor(date));if(expireReservations(day,modules,date,config))await save();const result=changeDay(day,modules,b,user,date,config);expireReservations(day,modules,date,config);await save();return {...result,autoCancelled:!!b.id&&day.registrations.some(r=>r.id===b.id&&r.cancellation?.reason==='unpaid_full')};});
 return send(res,200,result);
}catch(e){return errorResponse(res,e);}}
