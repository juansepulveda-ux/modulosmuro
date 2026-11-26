import {requireRole} from '../lib/auth.js';
import {send,errorResponse,mutation,fail} from '../lib/http.js';
import {readMonitors,saveMonitor} from '../lib/monitors.js';
export default async function handler(req,res){try{const user=await requireRole(req,['admin']);if(req.method==='GET')return send(res,200,await readMonitors());if(req.method!=='POST')fail(405,'Método no permitido.');mutation(req);if(req.body?.action!=='upsert')fail(409,'La base central se edita en Base de monitores. Recarga el planificador actualizado; importar dotación no modifica la base.');return send(res,200,await saveMonitor(req.body,user));}catch(e){return errorResponse(res,e);}}
