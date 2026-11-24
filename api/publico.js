import {send,errorResponse,fail,chileClock} from '../lib/http.js';
import {publicView} from '../lib/bookings.js';
import {operationalDay} from '../lib/operations.js';
export default async function handler(req,res){try{if(req.method!=='GET')fail(405,'Método no permitido.');const clock=chileClock();if(req.query.date&&req.query.date!==clock.date)fail(403,'La consulta pública muestra solamente hoy.');const {day,modules}=await operationalDay(clock.date);return send(res,200,publicView(day,modules,clock));}catch(e){return errorResponse(res,e);}}
