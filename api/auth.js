import {send,errorResponse,mutation,fail} from '../lib/http.js';
import {getSession,login,logout} from '../lib/auth.js';
export default async function handler(req,res){try{
 if(req.method==='GET'){const user=await getSession(req);return send(res,user?200:401,{user})}
 mutation(req);
 if(req.method==='POST')return send(res,200,{user:await login(req,res)});
 if(req.method==='DELETE'){await logout(req,res);return send(res,200,{ok:true})}
 fail(405,'Método no permitido.');
}catch(e){return errorResponse(res,e)}}
