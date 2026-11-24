import {timingSafeEqual,createHash} from 'node:crypto';
import {send,errorResponse,fail,chileClock} from '../lib/http.js';
import {operationalDay} from '../lib/operations.js';
// Optional external scheduler / Vercel Cron. Never exposes customer information.
export default async function handler(req,res){try{if(req.method!=='GET')fail(405,'Método no permitido.');const secret=process.env.CRON_SECRET;if(!secret)fail(503,'Programación automática no configurada.');const hash=s=>createHash('sha256').update(s).digest();if(!timingSafeEqual(hash(String(req.headers.authorization||'')),hash('Bearer '+secret)))fail(401,'Acceso no autorizado.');const clock=chileClock();const {day}=await operationalDay(clock.date);return send(res,200,{ok:true,date:clock.date,version:day.version});}catch(e){return errorResponse(res,e);}}
