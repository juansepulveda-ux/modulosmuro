import {send,errorResponse,mutation,fail,dateParam,chileClock} from '../lib/http.js';
import {requireRole} from '../lib/auth.js';
import {readDay,withDay} from '../lib/redis.js';
import {plansFor} from '../lib/github.js';
import {modulesFrom,annotate,changeDay,active} from '../lib/bookings.js';
export default async function handler(req,res){try{
 const user=await requireRole(req,['admin','vendedor','recepcionista']);
 if(req.method==='GET'){
  const date=dateParam(req.query.date);const [day,plans]=await Promise.all([readDay(date),plansFor(date)]);const modules=modulesFrom(plans);
  return send(res,200,{date,clock:chileClock(),version:day.version,defaults:day.defaults,modules:annotate(day,modules),registrations:day.registrations.filter(active),user});
 }
 if(req.method!=='POST')fail(405,'Método no permitido.');mutation(req);const b=req.body||{},date=dateParam(b.date);
 const result=await withDay(date,async(day,save)=>{const modules=modulesFrom(await plansFor(date));const result=changeDay(day,modules,b,user,date);await save();return result});
 return send(res,200,result);
}catch(e){return errorResponse(res,e)}}
