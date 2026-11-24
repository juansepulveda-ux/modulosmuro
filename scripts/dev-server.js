// Local demonstration only. The deployed Vercel API never imports this file.
import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
import {fixtures,setupEnvironment,demoPlans} from '../tests/fixtures.js';import {chileClock} from '../lib/http.js';import {emptyDay} from '../lib/redis.js';
if(process.env.NODE_ENV==='production')throw Error('El servidor demo no se ejecuta en producción.');
setupEnvironment();const fake=fixtures();fake.install();
const portIndex=process.argv.indexOf('--port');const port=Number(process.env.PORT||(portIndex>=0?process.argv[portIndex+1]:3000));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clock=chileClock(),start=Math.min(1260,Math.max(0,Math.floor(clock.minute/30)*30));
const plans=demoPlans(start);for(const [type,plan] of Object.entries(plans))fake.setFile(`data/${type}/${clock.date}.json`,plan);
fake.setFile('data/personal.json',{version:1,people:[{id:'demo',name:'Monitor Demo',nick:'Demo',defaultStart:'10:00',defaultEnd:'21:00',airtrail:{skills:{equip:true,launch:true,brake:true,poles:true},preferred:'equip'}}]});
const day=emptyDay();day.defaults={muro:12,airtrail:10,tirolesa:14};
for(const [type,plan] of Object.entries(plans))for(const [i,m] of plan.modules.entries())for(let n=0;n<(i===0?15:4);n++)day.registrations.push({id:randomUUID(),moduleKey:`${type}:${m.start}`,name:['Sofía Ejemplo','Mateo Prueba','Emilia Demo','Tomás Ficticio'][n%4]+' '+(n+1),age:7+n%6,declaration:n%3!==0,notes:n===0?'Observación de ejemplo para recepción':'',activities:type==='muro'?['muro']:n%2?['airtrail','tirolesa']:['tirolesa'],status:'active',revision:1,checkin:null,history:[]});
// Demo capacity is deliberately large enough for the fictional roster.
day.defaults={muro:20,airtrail:20,tirolesa:20};fake.redisCommand(['SET','demo:day:'+clock.date,JSON.stringify(day)]);
const names=['auth','inscripciones','publico','jornadas','personal','clientes','declaraciones','configuracion','datos','mantenimiento'];const handlers=Object.fromEntries(await Promise.all(names.map(async name=>[name,(await import('../api/'+name+'.js')).default])));
const routes={'/configuracion':'configuracion.html','/datos':'datos.html','/venta':'declaracion.html','/declaracion':'declaracion.html','/elegir-modulos':'elegir-modulos.html','/declaracion-registro':'declaracion-registro.html','/':'index.html','/login':'login.html','/planificador':'planificador.html','/planificador-muro':'planificador_muro.html','/planificador-airtrail':'planificador_airtrail.html','/inscripciones':'inscripciones.html','/checkin':'checkin.html','/hoy':'hoy.html','/pantalla':'pantalla.html'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/demo'){
 const role=url.searchParams.get('role');const users={admin:'demo-admin',ventas:'demo-ventas',recepcion:'demo-recepcion'};
 if(!users[role]){res.writeHead(400);res.end('Rol demo inválido');return}
 req.body={username:users[role],password:'Demo123!'};const {login}=await import('../lib/auth.js');await login(req,res);res.statusCode=302;res.setHeader('Location',role==='admin'?'/planificador':role==='ventas'?'/inscripciones':'/checkin');res.end();return;
 }
 if(url.pathname.startsWith('/api/')){const handler=handlers[url.pathname.slice(5)];if(!handler){res.writeHead(404);res.end();return}req.query=Object.fromEntries(url.searchParams);let body='';for await(const c of req){body+=c;if(body.length>2000000)throw Error('Solicitud demasiado grande')}req.body=body?JSON.parse(body):{};res.status=n=>{res.statusCode=n;return res};res.json=data=>res.end(JSON.stringify(data));await handler(req,res);return}
 const file=routes[url.pathname]||url.pathname.slice(1);
 if(!/^(?:[a-z_-]+\.html|assets\/[a-z_-]+\.(?:js|css))$/.test(file)){res.writeHead(404);res.end('No encontrado');return}
 let content=await readFile(path.join(root,file));const ext=path.extname(file);res.setHeader('Content-Type',ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'text/javascript; charset=utf-8':'text/css; charset=utf-8');res.setHeader('Cache-Control','no-store');
 if(ext==='.html')content=content.toString().replace('</body>','<aside style="position:fixed;bottom:0;left:0;right:0;z-index:10000;padding:7px 12px;background:#ffe29a;color:#513900;font:12px system-ui;text-align:center">DEMOSTRACIÓN · Datos ficticios · <a href="/demo?role=admin">Probar administración</a> · <a href="/demo?role=ventas">Probar ventas</a> · <a href="/demo?role=recepcion">Probar recepción</a></aside></body>');res.end(content);
 }catch(e){res.writeHead(500);res.end(e.message)}}).listen(port,'0.0.0.0',()=>console.log('Demo ready on port '+port));
