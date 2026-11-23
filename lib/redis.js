import {randomUUID} from 'node:crypto';
import {fail} from './http.js';
export const prefix=()=>process.env.DATA_NAMESPACE||'modulosmuro:v1';
export async function redis(...args){
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
 if(!url||!token)fail(503,'Falta conectar la base de inscripciones. Revisa la guía de instalación.');
 let r;try{r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(7000)})}catch{fail(503,'La base de datos no responde. Reintenta; no se confirmó el guardado.')}
 const out=await r.json();if(!r.ok||out.error)fail(503,'No se pudo acceder a la base de inscripciones.');return out.result;
}
export const dayKey=date=>`${prefix()}:day:${date}`;
export function emptyDay(){return {version:0,defaults:{muro:0,airtrail:0,tirolesa:0},overrides:{},registrations:[]}}
export async function readDay(date){const raw=await redis('GET',dayKey(date));return raw?JSON.parse(raw):emptyDay()}
// All booking, capacity and planner mutations use this same per-day lock.
// The final SET and release verify ownership atomically, including after expiry.
export async function withDay(date,fn){
 const key=`${dayKey(date)}:lock`,token=randomUUID();let acquired=false;
 for(let i=0;i<12;i++){if(await redis('SET',key,token,'NX','PX',60000)){acquired=true;break}await new Promise(r=>setTimeout(r,70+i*20))}
 if(!acquired)fail(409,'Otra persona está guardando esta jornada. Actualiza e intenta nuevamente.');
 const assertLease=async()=>{const ok=await redis('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] and redis.call('PTTL',KEYS[1])>10000 then return 1 else return 0 end",1,key,token);if(!ok)fail(409,'La operación tardó demasiado. Actualiza e intenta nuevamente.')};
 try{
  const day=await readDay(date);
  return await fn(day,async()=>{
   day.version++;day.updatedAt=new Date().toISOString();
   const ok=await redis('EVAL',"if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end redis.call('SET',KEYS[2],ARGV[2]); return 1",2,key,dayKey(date),token,JSON.stringify(day));
   if(!ok)fail(409,'El guardado perdió su turno. Actualiza antes de reintentar.');
  },assertLease);
 }finally{await redis('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,key,token).catch(()=>{})}
}
