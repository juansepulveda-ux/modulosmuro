import {requireRole} from '../lib/auth.js';
import {send,errorResponse,mutation,fail,dateParam} from '../lib/http.js';
import {readMonitors} from '../lib/monitors.js';
import {emptyRoster,readRoster,validateRoster,importRoster} from '../lib/roster.js';
import {withRecord} from '../lib/settings.js';
export default async function handler(req,res){try{const user=await requireRole(req,['admin']);
 if(req.method==='GET'){const date=dateParam(req.query.date);const [roster,base]=await Promise.all([readRoster(date),readMonitors()]);if(req.query.action==='import')return send(res,200,importRoster(roster,base,req.query.type));return send(res,200,{roster,people:base.people,baseRevision:base.revision});}
 if(req.method!=='POST')fail(405,'Método no permitido.');mutation(req);const b=req.body||{},date=dateParam(b.date);if(b.action!=='save')fail(400,'Acción inválida.');
 return send(res,200,await withRecord('roster:'+date,emptyRoster(date),async(current,save)=>{if(current.schemaVersion!==1)fail(503,'Dotación de una versión incompatible.');if(current.revision!==b.revision)fail(409,'La dotación cambió en otra ventana. Recarga antes de guardar.');const base=await readMonitors();if(base.revision!==b.baseRevision)fail(409,'La base de monitores cambió. Recarga para revisar capacidades y horarios antes de guardar.');const entries=validateRoster(b.entries,base.people);const next={...current,entries,revision:current.revision+1,updatedAt:new Date().toISOString(),updatedBy:user.username};await save(next);return {ok:true,roster:next};}));
 }catch(e){return errorResponse(res,e);}}
