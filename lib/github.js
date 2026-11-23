import {fail} from './http.js';
export async function gh(method,path,body){
 const {GITHUB_OWNER:owner,GITHUB_REPO:repo,GITHUB_TOKEN:token}=process.env,branch=process.env.GITHUB_BRANCH||'main';
 if(!owner||!repo||!token)fail(503,'Faltan las variables de GitHub.');
 const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`+(method==='GET'?`?ref=${encodeURIComponent(branch)}`:'');
 const r=await fetch(url,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'modulosmuro-vercel','Content-Type':'application/json'},body:body?JSON.stringify({...body,branch}):undefined,signal:AbortSignal.timeout(8000)});
 const data=await r.json();if(r.status===404)return null;if(!r.ok)fail(r.status===409?409:502,r.status===409?'La jornada cambió. Actualiza e intenta nuevamente.':'No se pudo acceder a las jornadas en GitHub.');return data;
}
export const planPath=(type,date)=>`data/${type}/${date}.json`;
export async function readPlan(type,date){const file=await gh('GET',planPath(type,date));return file?{plan:JSON.parse(Buffer.from(file.content,'base64').toString('utf8')),sha:file.sha}:null}
export async function plansFor(date){const pairs=await Promise.all(['muro','airtrail'].map(async type=>[type,(await readPlan(type,date))?.plan||null]));return Object.fromEntries(pairs)}
