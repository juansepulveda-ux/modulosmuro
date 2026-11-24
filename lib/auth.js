import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {redis,prefix} from './redis.js';
import {managedStaff,verifyPassword} from './staff.js';
import {fail} from './http.js';
const hash=s=>createHash('sha256').update(String(s)).digest();
const equal=(a,b)=>timingSafeEqual(hash(a),hash(b));
export function environmentAccounts(){
 let list=[];
 for(const [role,key] of [['admin','ADMIN'],['vendedor','SELLER'],['recepcionista','RECEPTION']]){
  if(process.env[`${key}_USER`]&&process.env[`${key}_PASSWORD`])list.push({username:process.env[`${key}_USER`],password:process.env[`${key}_PASSWORD`],role});
 }
 if(process.env.USERS_JSON){let extra;try{extra=JSON.parse(process.env.USERS_JSON)}catch{fail(503,'Configuración USERS_JSON inválida.')}
 if(!Array.isArray(extra))fail(503,'Configuración USERS_JSON inválida.');
 for(const u of extra){if(!u.username||!u.password||!['admin','vendedor','recepcionista'].includes(u.role))fail(503,'Configuración de usuarios inválida.');list.push(u)}}
 if(new Set(list.map(u=>u.username)).size!==list.length)fail(503,'Hay nombres de usuario repetidos en la configuración.');
 return list;
}
export async function accounts(includeDisabled=false){const base=environmentAccounts().map(u=>({...u,source:'Vercel'})),managed=await managedStaff();for(const u of managed.users){if(base.some(x=>x.username===u.username&&x.role==='admin'))continue;const i=base.findIndex(x=>x.username===u.username);const value={...u,source:i>=0?'Vercel + configuración':'base'};if(i>=0)base[i]=value;else base.push(value);}return includeDisabled?base:base.filter(u=>!u.disabled);}
function fingerprint(user){const secret=process.env.AUTH_SECRET;if(!secret||secret.length<32)fail(503,'Falta configurar AUTH_SECRET (mínimo 32 caracteres).');return createHmac('sha256',secret).update(JSON.stringify([user.username,user.password??user.passwordHash,user.role,...(user.authVersion?[user.authVersion]:[])])).digest('hex')}
function cookie(req){return String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('mm_session='))?.slice(11)||''}
function cookieText(req,value,clear=false){return `mm_session=${value}; Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV==='production'||req.headers['x-forwarded-proto']==='https'?'; Secure':''}${clear?'; Max-Age=0':''}`}
export async function getSession(req){
 const token=cookie(req);if(!/^[a-f0-9]{64}$/.test(token))return null;
 const raw=await redis('GET',`${prefix()}:session:${token}`);if(!raw)return null;
 const data=JSON.parse(raw),user=(await accounts()).find(u=>u.username===data.username);
 if(!user||!equal(data.fingerprint,fingerprint(user)))return null;
 return {username:user.username,role:user.role};
}
export async function requireRole(req,roles){const user=await getSession(req);if(!user)fail(401,'Inicia sesión para continuar.');if(!roles.includes(user.role))fail(403,'Tu cuenta no tiene permiso para esta acción.');return user}
export async function login(req,res){
 const {username,password}=req.body||{};if(typeof username!=='string'||typeof password!=='string'||username.length>120||password.length>500)fail(400,'Credenciales inválidas.');
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 for(const [label,value,max] of [['ip',ip,100],['user',username.trim().toLowerCase(),20]]){
 const k=`${prefix()}:login:${label}:${hash(value).toString('hex')}`;
 const count=await redis('EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end return n",1,k);
 if(count>max)fail(429,'Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
 }
 const user=(await accounts()).find(u=>equal(u.username,username.trim()));
 if(!user||!(user.passwordHash?await verifyPassword(password,user.passwordHash):equal(user.password||randomBytes(32).toString('hex'),password)))fail(401,'Usuario o contraseña incorrectos.');
 const token=randomBytes(32).toString('hex');await redis('SET',`${prefix()}:session:${token}`,JSON.stringify({username:user.username,fingerprint:fingerprint(user)}),'EX',43200);
 res.setHeader('Set-Cookie',cookieText(req,token));return {username:user.username,role:user.role};
}
export async function logout(req,res){const token=cookie(req);if(/^[a-f0-9]{64}$/.test(token))await redis('DEL',`${prefix()}:session:${token}`);res.setHeader('Set-Cookie',cookieText(req,'',true))}
