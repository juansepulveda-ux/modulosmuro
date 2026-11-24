import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {fixtures,setupEnvironment,demoPlans} from './fixtures.js';import {chileClock} from '../lib/http.js';
setupEnvironment();
const {default:auth}=await import('../api/auth.js');const {default:bookings}=await import('../api/inscripciones.js');const {default:publico}=await import('../api/publico.js');const {default:jornadas}=await import('../api/jornadas.js');const {default:personal}=await import('../api/personal.js');
async function call(handler,{method='GET',body,query={},cookie='',origin='http://localhost',host='localhost'}={}){let status=200;const headers={};let output;const req={method,body,query,headers:{host,origin,cookie,'content-type':'application/json','x-forwarded-for':'127.0.0.1'}};const res={status(n){status=n;return this},setHeader(k,v){headers[k]=v},json(data){output=data;return data}};await handler(req,res);return {status,headers,body:output}}
async function signIn(username='demo-admin'){const r=await call(auth,{method:'POST',body:{username,password:'Demo123!'}});assert.equal(r.status,200);return r.headers['Set-Cookie'].split(';')[0]}
test('integración: sesiones, permisos, cupo simultáneo, publicación y privacidad',async()=>{
 const f=fixtures();f.install();try{
 const date=chileClock().date;for(const [type,plan] of Object.entries(demoPlans()))f.setFile(`data/${type}/${date}.json`,plan);
 const admin=await signIn(),seller=await signIn('demo-ventas'),reception=await signIn('demo-recepcion');
 assert.equal((await call(auth,{cookie:admin})).body.user.role,'admin');assert.equal((await call(bookings,{query:{date}})).status,401);assert.equal((await call(personal,{cookie:seller})).status,403);
 assert.equal((await call(bookings,{method:'POST',cookie:seller,origin:'https://evil.example',body:{date,action:'capacity'}})).status,403);
 assert.equal((await call(bookings,{method:'POST',cookie:seller,body:{date,action:'capacity',version:0,values:{muro:1,airtrail:1,tirolesa:1}}})).status,200);
 const request=()=>({method:'POST',cookie:seller,body:{date,action:'register',id:randomUUID(),moduleKey:'airtrail:600',name:'Ana Privada',age:8,activities:['airtrail','tirolesa'],declaration:false,paid:true,notes:'Privado'}});
 const requests=[request(),request()];const result=await Promise.all(requests.map(r=>call(bookings,r)));assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);
 const winner=requests[result.findIndex(r=>r.status===200)];assert.equal((await call(bookings,winner)).status,200);
 const list=await call(bookings,{cookie:reception,query:{date}});assert.equal(list.body.registrations.length,1);const record=list.body.registrations[0];
 assert.equal((await call(bookings,{method:'POST',cookie:seller,body:{date,action:'checkin',id:record.id,revision:record.revision}})).status,403);
 assert.equal((await call(bookings,{method:'POST',cookie:reception,body:{date,action:'checkin',id:record.id,revision:record.revision}})).status,200);
 assert.equal((await call(jornadas,{method:'DELETE',cookie:admin,body:{type:'airtrail',date}})).status,409);
 const safePlan=demoPlans().airtrail;safePlan.modules[0].id=45;assert.equal((await call(jornadas,{method:'POST',cookie:admin,body:{type:'airtrail',date,plan:safePlan}})).status,200);
 const pub=await call(publico);assert.equal(pub.status,200);assert.ok(!JSON.stringify(pub.body).includes('Privada'));assert.ok(!JSON.stringify(pub.body).includes('Privado'));assert.equal((await call(publico,{query:{date:'2000-01-01'}})).status,403);
 assert.equal((await call(auth,{method:'DELETE',cookie:admin,body:{}})).status,200);assert.equal((await call(auth,{cookie:admin})).status,401);
 }finally{f.restore()}
});
test('credenciales incorrectas y cambios de contraseña invalidan sesiones',async()=>{const f=fixtures();f.install();try{assert.equal((await call(auth,{method:'POST',body:{username:'demo-admin',password:'incorrecta'}})).status,401);const cookie=await signIn();const previous=process.env.ADMIN_PASSWORD;process.env.ADMIN_PASSWORD='nueva';assert.equal((await call(auth,{cookie})).status,401);process.env.ADMIN_PASSWORD=previous;}finally{f.restore()}});
test('cookie HttpOnly, SameSite y sin persistencia; login limitado',async()=>{const f=fixtures();f.install();try{const r=await call(auth,{method:'POST',body:{username:'demo-admin',password:'Demo123!'}});assert.match(r.headers['Set-Cookie'],/HttpOnly/);assert.match(r.headers['Set-Cookie'],/SameSite=Strict/);assert.doesNotMatch(r.headers['Set-Cookie'],/Expires|Max-Age/);for(let i=0;i<20;i++)await call(auth,{method:'POST',body:{username:'someone',password:'wrong'}});assert.equal((await call(auth,{method:'POST',body:{username:'someone',password:'wrong'}})).status,429)}finally{f.restore()}});
