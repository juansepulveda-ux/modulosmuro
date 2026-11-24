import {chileClock} from '../lib/http.js';
export function fixtures(){
 const store=new Map(),files=new Map();let serial=0;
 const get=k=>{const item=store.get(k);if(!item)return null;if(item.expiry&&item.expiry<=Date.now()){store.delete(k);return null}return item.value};
 const put=(k,value,expiry=null)=>store.set(k,{value,expiry});
 const redisCommand=args=>{
  const [cmd,...v]=args;
  if(cmd==='SCAN'){const pattern=v[v.indexOf('MATCH')+1],stem=pattern.slice(0,-1),keys=[...store.keys()].filter(k=>k.startsWith(stem)&&get(k)!==null).sort();const offset=Number(v[0]),size=Number(v[v.indexOf('COUNT')+1])||30;return [offset+size>=keys.length?'0':String(offset+size),keys.slice(offset,offset+size)];}
  if(cmd==='GET')return get(v[0]);
  if(cmd==='DEL'){const had=get(v[0])!==null;store.delete(v[0]);return Number(had)}
  if(cmd==='SET'){if(v.includes('NX')&&get(v[0])!==null)return null;const px=v.indexOf('PX'),ex=v.indexOf('EX');put(v[0],v[1],px>=0?Date.now()+Number(v[px+1]):ex>=0?Date.now()+Number(v[ex+1])*1000:null);return 'OK'}
  if(cmd==='EVAL'){
   const [script,n,...rest]=v,keys=rest.slice(0,n),argv=rest.slice(n);
   if(script.includes("'INCR'")){const count=Number(get(keys[0])||0)+1;put(keys[0],String(count),store.get(keys[0])?.expiry||Date.now()+900000);return count}
   if(get(keys[0])!==argv[0])return 0;
   if(script.includes("'PTTL'"))return Number(store.get(keys[0]).expiry-Date.now()>10000);
   if(script.includes("'SET',KEYS[3]")){if(get(keys[2]))return 2;put(keys[1],argv[1]);put(keys[2],argv[2]);return 1}
   if(script.includes("'SET',KEYS[2]")){put(keys[1],argv[1]);return 1}
   if(script.includes("'DEL'")){store.delete(keys[0]);return 1}
  }
  throw Error('Unsupported fake Redis command '+cmd);
 };
 const original=globalThis.fetch;
 const fetchMock=async(url,options={})=>{
  if(String(url)==='https://redis.demo.invalid'){
   await new Promise(r=>setTimeout(r,1));return new Response(JSON.stringify({result:redisCommand(JSON.parse(options.body))}),{status:200});
  }
  if(String(url).startsWith('https://api.github.com/repos/demo/demo/contents/')){
   const path=decodeURIComponent(new URL(url).pathname.split('/contents/')[1]);const method=options.method||'GET';let body;
   if(method==='GET'){
    if(files.has(path))body={content:Buffer.from(JSON.stringify(files.get(path).data)).toString('base64'),sha:files.get(path).sha};
    else{const children=[...files.entries()].filter(([p])=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).map(([p,v])=>({type:'file',name:p.slice(path.length+1),sha:v.sha,size:1}));if(children.length)body=children}
    return new Response(JSON.stringify(body||{message:'not found'}),{status:body?200:404});
   }
   const input=JSON.parse(options.body),existing=files.get(path);
   if(existing&&input.sha!==existing.sha)return new Response('{}',{status:409});
   if(method==='DELETE'){files.delete(path);return new Response('{}',{status:200})}
   files.set(path,{data:JSON.parse(Buffer.from(input.content,'base64')),sha:String(++serial)});return new Response('{"commit":{}}',{status:200});
  }
  return original(url,options);
 };
 return {store,files,redisCommand,install(){globalThis.fetch=fetchMock},restore(){globalThis.fetch=original},setFile(path,data){files.set(path,{data,sha:String(++serial)})}};
}
export function setupEnvironment(){
 Object.assign(process.env,{UPSTASH_REDIS_REST_URL:'https://redis.demo.invalid',UPSTASH_REDIS_REST_TOKEN:'demo-only',AUTH_SECRET:'demonstration-only-not-for-production-123456789',ADMIN_USER:'demo-admin',ADMIN_PASSWORD:'Demo123!',SELLER_USER:'demo-ventas',SELLER_PASSWORD:'Demo123!',RECEPTION_USER:'demo-recepcion',RECEPTION_PASSWORD:'Demo123!',GITHUB_OWNER:'demo',GITHUB_REPO:'demo',GITHUB_TOKEN:'demo-only',DATA_NAMESPACE:'demo'});
 delete process.env.USERS_JSON;
}
export function demoPlans(start=600){return {
 muro:{date:chileClock().date,staff:[],rows:[],timeline:[],modules:[0,30,60,90].map((offset,i)=>({id:i+1,start:start+offset,end:start+offset+50,primary:'demo-monitor'}))},
 airtrail:{date:chileClock().date,staff:[],rows:[],timeline:[],modules:[0,30,60,90].map((offset,i)=>{const t=start+offset;return {id:i+1,start:t,end:t+40,equipStart:t,equipEnd:t+10,launchStart:t+10,assign:{equipMain:[{assigned:'demo',start:t,end:t+10}],launchMain:[{assigned:'demo2',start:t+10,end:t+40}],brakeMain:[{assigned:'demo3',start:t+10,end:t+40}]}}})
}}}
