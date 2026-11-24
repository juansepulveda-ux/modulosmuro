import {send,errorResponse,mutation,fail,chileClock} from '../lib/http.js';
import {customerSession,customerLogout,accessCustomer,safeProfile,canReadDeclaration,rateLimit,readCustomer,withCustomer,readDeclaration} from '../lib/customers.js';
import {validateFamily,makeDeclaration,declarationText,DECLARATION_VERSION,TERMS_URL,PRIVACY_URL,uuid} from '../lib/declarations.js';
import {operationalDay,expireReservations} from '../lib/operations.js';
import {settings} from '../lib/settings.js';
import {readDay,withDay} from '../lib/redis.js';
import {plansFor} from '../lib/github.js';
import {modulesFrom} from '../lib/bookings.js';
import {publicCatalog,createPublicBooking,declarationPeople} from '../lib/public-booking.js';

export default async function handler(req,res){try{
 if(req.method==='GET'){
  const action=req.query.action||'me';
  if(action==='text')return send(res,200,{version:DECLARATION_VERSION,paragraphs:declarationText(req.query.mode||'self'),termsUrl:TERMS_URL,privacyUrl:PRIVACY_URL});
  const session=await customerSession(req);
  if(action==='me')return send(res,200,{profile:safeProfile(await readCustomer(session.id)),clock:chileClock()});
  if(action==='catalog'){
   if(!uuid(req.query.declarationId))fail(400,'Primero completa tu declaración.');
   const doc=await readDeclaration(req.query.declarationId);if(!canReadDeclaration(doc,session))fail(404,'Declaración no encontrada.');
   const clock=chileClock();if(doc.date!==clock.date)fail(409,'Completa una nueva declaración para hoy.');
   const {day,modules,config}=await operationalDay(clock.date);
   return send(res,200,{...publicCatalog(day,modules,clock,config),people:declarationPeople(doc)});
  }
  fail(400,'Consulta inválida.');
 }
 if(req.method!=='POST')fail(405,'Método no permitido.');mutation(req);
 const b=req.body||{};if(JSON.stringify(b).length>200000)fail(413,'El formulario es demasiado grande. Vuelve a firmar.');
 if(b.action==='access')return send(res,200,await accessCustomer(req,res));
 if(b.action==='logout'){await customerLogout(req,res);return send(res,200,{ok:true});}
 const session=await customerSession(req);
 if(b.action==='declare'){
  await rateLimit(req,'declarations',session.id,60,86400);
  if(!uuid(b.id))fail(400,'Identificador inválido.');
  const result=await withCustomer(session.id,async(profile,save)=>{
   const prior=await readDeclaration(b.id);
   if(prior){if(!canReadDeclaration(prior,session))fail(409,'Identificador ya utilizado.');return {ok:true,declarationId:prior.id,profile:safeProfile(profile),repeated:true};}
   if(!profile||b.revision!==profile.revision)fail(409,'Tus datos cambiaron en otra ventana. Actualiza antes de continuar.');
   if(b.declarationVersion!==DECLARATION_VERSION)fail(409,'El texto de la declaración cambió. Recarga y vuelve a leerlo antes de firmar.');
   const family=validateFamily(b.family,session.rut);
   
   const doc=makeDeclaration(b,family,session.id,{signedSession:session.sessionId,accessConsent:profile.rutConsent||{accepted:false,mode:'password'}});
   const next={...profile,...family,revision:profile.revision+1,updatedAt:doc.signedAt,lastDeclarationId:doc.id};
   await save(next,doc);return {ok:true,declarationId:doc.id,profile:safeProfile(next)};
  });return send(res,200,result);
 }
 if(b.action==='book'){
  await rateLimit(req,'bookings',session.id,120,86400);
  if(!uuid(b.declarationId))fail(400,'Primero firma tu declaración.');
  const doc=await readDeclaration(b.declarationId);if(!canReadDeclaration(doc,session))fail(404,'Declaración no encontrada.');
  const clock=chileClock(),config=await settings();
  const result=await withDay(clock.date,async(day,save)=>{const modules=modulesFrom(await plansFor(clock.date));if(chileClock().date!==clock.date)fail(409,'Cambió el día. Vuelve a la declaración.');if(expireReservations(day,modules,clock.date,config))await save();const result=createPublicBooking(day,modules,b,doc,session.id,chileClock(),config);expireReservations(day,modules,clock.date,config);await save();return {...result,registrations:result.registrations.map(r=>({...r,active:day.registrations.find(x=>x.id===r.id)?.status!=='cancelled'}))};});
  return send(res,200,result);
 }
 fail(400,'Acción inválida.');
}catch(e){return errorResponse(res,e);}}
