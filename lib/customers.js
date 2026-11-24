import {createHmac,randomBytes,timingSafeEqual,randomUUID,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import {redis,prefix} from './redis.js';
import {fail} from './http.js';
import {normalizeRut,profileId} from './declarations.js';
const scrypt=promisify(scryptCallback);
export const RUT_ACCESS_NOTICE='Autorizo que mis datos y los datos de los menores que registre se recuperen desde cualquier teléfono o computador usando únicamente mi RUT. Entiendo que cualquier persona que conozca mi RUT podrá consultar y reutilizar estos datos para completar el formulario, sin una clave. Esta opción no permite consultar las firmas de declaraciones anteriores.';
export const customerKey=id=>`${prefix()}:customer:${id}`;
export const declarationKey=id=>`${prefix()}:declaration:${id}`;
const secret=()=>{if(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32)fail(503,'Falta configurar AUTH_SECRET.');return process.env.AUTH_SECRET;};
const digest=s=>createHmac('sha256',secret()).update(s).digest('hex');
const tokenOf=req=>String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('mm_customer='))?.slice(12)||'';
function cookie(req,token){return `mm_customer=${token}; Path=/; HttpOnly; SameSite=Strict${token?'':'; Max-Age=0'}${process.env.NODE_ENV==='production'||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`;}
export async function rateLimit(req,label,value,max,seconds=900){
 const k=`${prefix()}:customer-limit:${label}:${digest(value)}`;
 const count=await redis('EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end return n",1,k,seconds);
 if(count>max)fail(429,'Demasiados intentos. Espera unos minutos antes de volver a intentar.');
}
const ip=req=>String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
export async function readCustomer(id){const raw=await redis('GET',customerKey(id));return raw?JSON.parse(raw):null;}
export function safeProfile(p){return {revision:p.revision,adult:p.adult,children:p.children,accessMode:p.accessMode};}
export async function customerSession(req,required=true){
 const token=tokenOf(req);let session=null;
 if(/^[a-f0-9]{64}$/.test(token)){const raw=await redis('GET',`${prefix()}:customer-session:${digest(token)}`);if(raw)session=JSON.parse(raw);}
 if(session){const p=await readCustomer(session.id);if(!p||p.accessRevision!==session.accessRevision)session=null;}
 if(!session&&required)fail(401,'Ingresa con tu RUT y, si corresponde, tu clave para continuar.');return session;
}
export async function customerLogout(req,res){const token=tokenOf(req);if(token)await redis('DEL',`${prefix()}:customer-session:${digest(token)}`);res.setHeader('Set-Cookie',cookie(req,''));}
async function passwordHash(password,salt){if(typeof password!=='string'||password.length>200)fail(400,'La clave no es válida.');return Buffer.from(await scrypt(password,salt,64)).toString('hex');}
export async function accessCustomer(req,res){
 const b=req.body||{},rut=normalizeRut(b.rut),id=profileId(rut);
 await rateLimit(req,'access-ip',ip(req),100);await rateLimit(req,'access-rut',id,20);
 let profile=await readCustomer(id);
 if(!profile&&b.firstVisit===true){
  if(!['rut','password'].includes(b.accessMode))fail(400,'Selecciona cómo recuperar tus datos en próximas visitas.');
  if(b.accessMode==='rut'&&b.allowRutAccess!==true)fail(400,'Debes autorizar expresamente la recuperación usando solo RUT.');
  const at=new Date().toISOString();
  const base={id,revision:0,accessRevision:1,adult:{rut},children:[],createdAt:at,accessMode:b.accessMode};
  if(b.accessMode==='password'){
   if(typeof b.password!=='string'||b.password.length<8||b.password.length>200)fail(400,'Crea una clave de al menos 8 caracteres.');
   const salt=randomBytes(16).toString('hex');base.password={salt,hash:await passwordHash(b.password,salt)};
  }else base.rutConsent={accepted:true,at,text:RUT_ACCESS_NOTICE};
  const created=await redis('SET',customerKey(id),JSON.stringify(base),'NX');
  if(created)profile=base;else profile=await readCustomer(id);
 }
 if(!profile)fail(401,'No pudimos ingresar. Revisa el RUT y la clave, o marca «Es mi primera visita» para crear tu registro.');
 if(profile.accessMode==='password'){
  const hash=await passwordHash(typeof b.password==='string'?b.password:'',profile.password.salt);
  if(!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(profile.password.hash,'hex')))fail(401,'No pudimos ingresar. Revisa el RUT y tu clave.');
 }
 const token=randomBytes(32).toString('hex'),session={id,rut,accessMode:profile.accessMode,accessRevision:profile.accessRevision,sessionId:randomUUID()};
 await redis('SET',`${prefix()}:customer-session:${digest(token)}`,JSON.stringify(session),'EX',14400);
 res.setHeader('Set-Cookie',cookie(req,token));return {ok:true,profile:safeProfile(profile)};
}
// Serialize family edits and atomically save the profile with its immutable signed declaration.
export async function withCustomer(id,fn){
 const key=customerKey(id),lock=key+':lock',token=randomUUID();
 if(!await redis('SET',lock,token,'NX','PX',30000))fail(409,'Ya hay un guardado en curso. Espera y vuelve a intentar.');
 try{return await fn(await readCustomer(id),async(profile,doc)=>{
  const result=await redis('EVAL',"if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end if redis.call('EXISTS',KEYS[3])==1 then return 2 end redis.call('SET',KEYS[2],ARGV[2]); redis.call('SET',KEYS[3],ARGV[3]); return 1",3,lock,key,declarationKey(doc.id),token,JSON.stringify(profile),JSON.stringify(doc));
  if(result!==1)fail(409,'No se pudo confirmar el guardado. Actualiza tus datos e intenta nuevamente.');
 });}finally{await redis('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,lock,token).catch(()=>{});}
}
export async function readDeclaration(id){const raw=await redis('GET',declarationKey(id));return raw?JSON.parse(raw):null;}
export const canReadDeclaration=(doc,session)=>doc&&doc.owner===session.id&&(session.accessMode==='password'||doc.signedSession===session.sessionId);
