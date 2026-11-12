const OWNER=process.env.GITHUB_OWNER;
const REPO=process.env.GITHUB_REPO;
const BRANCH=process.env.GITHUB_BRANCH||'main';
const TOKEN=process.env.GITHUB_TOKEN;
const ADMIN_USER=process.env.ADMIN_USER;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD;

function send(res,status,obj){res.status(status);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.json(obj)}
function validType(t){return t==='muro'||t==='airtrail'}
function validDate(d){return /^\d{4}-\d{2}-\d{2}$/.test(String(d||''))}
function pathFor(type,date){return `data/${type}/${date}.json`}
function ghPath(path){return path.split('/').map(encodeURIComponent).join('/')}
function headers(){return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${TOKEN}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'modulosmuro-vercel'}}
async function gh(method,path,body){const url=`https://api.github.com/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${ghPath(path)}`+(method==='GET'?`?ref=${encodeURIComponent(BRANCH)}`:'');const r=await fetch(url,{method,headers:{...headers(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json().catch(()=>({}));return {r,data}}
function auth(body){return body&&body.username===ADMIN_USER&&body.password===ADMIN_PASSWORD}

export default async function handler(req,res){
  try{
    if(!OWNER||!REPO||!TOKEN)return send(res,500,{error:'Faltan variables de GitHub en Vercel.'});
    if(req.method==='GET'){
      const type=String(req.query.type||'');
      if(!validType(type))return send(res,400,{error:'Tipo inválido.'});
      const date=String(req.query.date||'');
      if(date){
        if(!validDate(date))return send(res,400,{error:'Fecha inválida.'});
        const {r,data}=await gh('GET',pathFor(type,date));
        if(r.status===404)return send(res,404,{error:'Jornada no encontrada.'});
        if(!r.ok)return send(res,r.status,{error:data.message||'Error leyendo GitHub.'});
        const text=Buffer.from(data.content||'','base64').toString('utf8');
        return send(res,200,{type,date,plan:JSON.parse(text),sha:data.sha});
      }
      const {r,data}=await gh('GET',`data/${type}`);
      if(r.status===404)return send(res,200,{type,items:[]});
      if(!r.ok)return send(res,r.status,{error:data.message||'Error listando GitHub.'});
      const items=(Array.isArray(data)?data:[]).filter(x=>x.type==='file'&&/^\d{4}-\d{2}-\d{2}\.json$/.test(x.name)).map(x=>({date:x.name.slice(0,10),size:x.size,sha:x.sha}));
      return send(res,200,{type,items});
    }
    if(req.method==='POST'){
      const body=req.body||{};if(!auth(body))return send(res,401,{error:'Usuario o contraseña incorrectos.'});
      const {type,date,plan}=body;if(!validType(type)||!validDate(date)||!plan||typeof plan!=='object')return send(res,400,{error:'Publicación inválida.'});
      const path=pathFor(type,date);const existing=await gh('GET',path);let sha=null;if(existing.r.ok)sha=existing.data.sha;else if(existing.r.status!==404)return send(res,existing.r.status,{error:existing.data.message||'No se pudo revisar el archivo actual.'});
      const clean={...plan,date,publication:{type,date,publishedAt:new Date().toISOString()}};const content=Buffer.from(JSON.stringify(clean,null,2),'utf8').toString('base64');
      const payload={message:`Publicar ${type} ${date}`,content,branch:BRANCH,...(sha?{sha}:{})};const out=await gh('PUT',path,payload);if(!out.r.ok)return send(res,out.r.status,{error:out.data.message||'No se pudo publicar en GitHub.'});
      return send(res,200,{message:'Jornada publicada.',date,type,commitUrl:out.data.commit?.html_url||null});
    }
    if(req.method==='DELETE'){
      const body=req.body||{};if(!auth(body))return send(res,401,{error:'Usuario o contraseña incorrectos.'});const {type,date}=body;if(!validType(type)||!validDate(date))return send(res,400,{error:'Solicitud inválida.'});const path=pathFor(type,date);const current=await gh('GET',path);if(current.r.status===404)return send(res,404,{error:'La jornada ya no existe.'});if(!current.r.ok)return send(res,current.r.status,{error:current.data.message||'No se pudo leer la jornada.'});const out=await gh('DELETE',path,{message:`Eliminar ${type} ${date}`,sha:current.data.sha,branch:BRANCH});if(!out.r.ok)return send(res,out.r.status,{error:out.data.message||'No se pudo eliminar la jornada.'});return send(res,200,{message:'Jornada eliminada.',type,date,commitUrl:out.data.commit?.html_url||null});
    }
    res.setHeader('Allow','GET, POST, DELETE');return send(res,405,{error:'Método no permitido.'});
  }catch(e){console.error(e);return send(res,500,{error:'Error interno: '+e.message})}
}
