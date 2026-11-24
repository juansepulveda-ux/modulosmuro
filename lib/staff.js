import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {redis,prefix} from './redis.js';
import {fail} from './http.js';
const scrypt=promisify(scryptCallback);
export async function managedStaff(){const raw=await redis('GET',`${prefix()}:staff`);return raw?JSON.parse(raw):{revision:0,users:[]};}
export async function hashPassword(password,minLength=8){if(typeof password!=='string'||password.length<minLength||password.length>200)fail(400,'La clave debe tener entre 8 y 200 caracteres.');const salt=randomBytes(16).toString('hex');return {salt,hash:Buffer.from(await scrypt(password,salt,64)).toString('hex')};}
export async function verifyPassword(password,record){if(typeof password!=='string'||password.length>500)return false;const result=Buffer.from(await scrypt(password,record.salt,64));return timingSafeEqual(result,Buffer.from(record.hash,'hex'));}
export function staffMetadata(users){return users.map(({username,role,disabled,source})=>({username,role,disabled:!!disabled,source:source||'base'}));}
