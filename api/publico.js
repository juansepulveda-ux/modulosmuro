import {send,errorResponse,fail,chileClock} from '../lib/http.js';
import {readDay} from '../lib/redis.js';
import {plansFor} from '../lib/github.js';
import {modulesFrom,publicView} from '../lib/bookings.js';
// No date selector or query parameter can retrieve another day's participants.
export default async function handler(req,res){try{
 if(req.method!=='GET')fail(405,'Método no permitido.');
 const clock=chileClock();if(req.query.date&&req.query.date!==clock.date)fail(403,'La consulta pública muestra solamente hoy.');
 const [day,plans]=await Promise.all([readDay(clock.date),plansFor(clock.date)]);
 return send(res,200,publicView(day,modulesFrom(plans),clock));
}catch(e){return errorResponse(res,e)}}
