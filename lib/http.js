export class AppError extends Error { constructor(status,message){super(message);this.status=status;} }
export function fail(status,message){throw new AppError(status,message)}
export function send(res,status,data){res.status(status);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');return res.json(data)}
export function errorResponse(res,e){if(!e.status)console.error('API:',e.message);return send(res,e.status||500,{error:e.status?e.message:'No se pudo completar la operación. Intenta nuevamente.'})}
export function mutation(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Se requiere JSON.');
  const origin=req.headers.origin;
  if(!origin)fail(403,'Origen de la solicitud ausente.');
  try{if(new URL(origin).host!==req.headers.host)fail(403,'Origen no permitido.')}catch(e){if(e.status)throw e;fail(403,'Origen no permitido.')}
  if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Origen no permitido.');
}
export function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date}
export function dateParam(date){if(!validDate(date))fail(400,'Fecha inválida.');return date}
export function chileClock(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,minute:Number(parts.hour)*60+Number(parts.minute)+Number(parts.second)/60,now:now.toISOString(),timeZone:'America/Santiago'};
}
