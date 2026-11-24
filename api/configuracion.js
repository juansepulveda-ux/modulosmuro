import {send,errorResponse,mutation,fail} from '../lib/http.js';
import {requireRole,accounts,environmentAccounts} from '../lib/auth.js';
import {settings,withRecord,defaultSettings,validateSettings} from '../lib/settings.js';
import {managedStaff,hashPassword,staffMetadata} from '../lib/staff.js';
import {prefix} from '../lib/redis.js';
export default async function handler(req,res){try{
 if(req.method==='GET'&&req.query.public==='1'){const s=await settings();return send(res,200,{colors:s.colors,warningAge:s.warningAge,allowLate:s.allowLate,lateMinutes:s.lateMinutes,checkinVisibleMinutes:s.checkinVisibleMinutes});}
 const user=await requireRole(req,['admin']);
 if(req.method==='GET'){const [config,staff,list]=await Promise.all([settings(),managedStaff(),accounts(true)]);return send(res,200,{config,staffRevision:staff.revision,users:staffMetadata(list),namespace:prefix()});}
 if(req.method!=='POST')fail(405,'Método no permitido.');mutation(req);const b=req.body||{};
 if(b.action==='settings')return send(res,200,await withRecord('settings',defaultSettings(),async(current,save)=>{const next=validateSettings(b,current,user);await save(next);return {ok:true,config:next};}));
 if(b.action==='staff')return send(res,200,await withRecord('staff',{revision:0,users:[]},async(current,save)=>{
  if(current.revision!==b.revision)fail(409,'La lista de usuarios cambió. Actualiza.');
  if(typeof b.username!=='string'||!b.username.trim()||b.username.length>120)fail(400,'Usuario inválido.');const username=b.username.trim();
  if(environmentAccounts().some(u=>u.username===username&&u.role==='admin'))fail(403,'La cuenta administradora se mantiene en Vercel.');
  if(!['vendedor','recepcionista'].includes(b.role)||typeof b.disabled!=='boolean')fail(400,'Rol o estado inválido.');
  const previous=current.users.find(u=>u.username===username),env=environmentAccounts().find(u=>u.username===username);
  let passwordHash=previous?.passwordHash;
  if(b.password)passwordHash=await hashPassword(b.password);
  if(!passwordHash&&env)passwordHash=await hashPassword(env.password,1);
  if(!passwordHash)fail(400,'Indica una clave inicial de al menos 8 caracteres.');
  const updated={authVersion:(previous?.authVersion||0)+1,username,role:b.role,disabled:b.disabled,passwordHash,updatedAt:new Date().toISOString(),updatedBy:user.username};
  current.users=current.users.filter(u=>u.username!==username);current.users.push(updated);current.revision++;await save(current);return {ok:true};
 }));fail(400,'Acción inválida.');
}catch(e){return errorResponse(res,e);}}
