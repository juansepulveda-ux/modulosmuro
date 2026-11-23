import {send,errorResponse,mutation,fail,dateParam} from '../lib/http.js';
import {requireRole} from '../lib/auth.js';
import {gh,readPlan,planPath} from '../lib/github.js';
import {withDay} from '../lib/redis.js';
import {protectPublished,modulesFrom} from '../lib/bookings.js';
export default async function handler(req,res){try{
 if(req.method==='GET'){
  const {type,date}=req.query;if(!['muro','airtrail'].includes(type))fail(400,'Tipo inválido.');
  if(date){dateParam(date);const existing=await readPlan(type,date);if(!existing)fail(404,'Jornada no encontrada.');return send(res,200,{type,date,...existing})}
  const data=await gh('GET',`data/${type}`)||[];
  return send(res,200,{type,items:data.filter(x=>x.type==='file'&&/^\d{4}-\d{2}-\d{2}\.json$/.test(x.name)).map(x=>({date:x.name.slice(0,10),size:x.size,sha:x.sha}))});
 }
 await requireRole(req,['admin']);mutation(req);
 if(!['POST','DELETE'].includes(req.method))fail(405,'Método no permitido.');
 const {type,date,plan}=req.body||{};if(!['muro','airtrail'].includes(type))fail(400,'Tipo inválido.');dateParam(date);
 if(req.method==='POST'&&(!plan||!Array.isArray(plan.modules)))fail(400,'Planificación inválida.');
 if(plan)modulesFrom({[type]:plan});
 const result=await withDay(date,async(day,save,assertLease)=>{
  protectPublished(day,type,req.method==='POST'?plan:null);
  const existing=await readPlan(type,date);await assertLease();
  if(req.method==='DELETE'){
   if(!existing)fail(404,'La jornada ya no existe.');await gh('DELETE',planPath(type,date),{message:`Eliminar ${type} ${date}`,sha:existing.sha});
  }else{
   const clean={...plan,date,publication:{type,date,publishedAt:new Date().toISOString()}};
   await gh('PUT',planPath(type,date),{message:`Publicar ${type} ${date}`,content:Buffer.from(JSON.stringify(clean,null,2)).toString('base64'),...(existing?{sha:existing.sha}:{})});
  }
  return {ok:true,type,date};
 });return send(res,200,result);
}catch(e){return errorResponse(res,e)}}
