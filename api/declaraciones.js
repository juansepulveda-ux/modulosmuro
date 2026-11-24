import {send,errorResponse,fail} from '../lib/http.js';
import {getSession} from '../lib/auth.js';
import {customerSession,readDeclaration,canReadDeclaration} from '../lib/customers.js';
import {uuid} from '../lib/declarations.js';
export default async function handler(req,res){try{
 if(req.method!=='GET')fail(405,'Método no permitido.');
 const staff=await getSession(req),customer=staff?null:await customerSession(req,false);
 if(!staff&&!customer)fail(401,'Inicia sesión para consultar una declaración.');
 if(!uuid(req.query.id))fail(400,'Identificador inválido.');
 const doc=await readDeclaration(req.query.id);
 if(!doc||(!staff&&!canReadDeclaration(doc,customer)))fail(404,'Declaración no encontrada.');
 const {owner,signedSession,...safe}=doc;return send(res,200,safe);
}catch(e){return errorResponse(res,e);}}
