(()=>{
 const nativeFetch=window.fetch.bind(window);
 const protectedPage=document.currentScript?.dataset.role;
 const home={admin:'/planificador',vendedor:'/inscripciones',recepcionista:'/checkin'};
 window.Session={user:null,home,ready:null};
 Session.ready=nativeFetch('/api/auth',{cache:'no-store'}).then(async r=>{
  if(r.status===401){if(protectedPage)location.replace('/login?next='+encodeURIComponent(location.pathname+location.search));return null}
  const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo verificar la sesión.');Session.user=d.user;
  if(protectedPage&&protectedPage!=='staff'&&d.user.role!==protectedPage){location.replace(home[d.user.role]);return null}
  document.documentElement.classList.remove('protected-pending');return d.user;
 }).catch(e=>{document.documentElement.classList.remove('protected-pending');document.addEventListener('DOMContentLoaded',()=>showFailure(e),{once:true});if(document.readyState!=='loading')showFailure(e);throw e});
 function showFailure(e){let box=document.getElementById('sessionError');if(!box){box=document.createElement('div');box.id='sessionError';box.className='notice error';document.body.prepend(box)}box.textContent=e.message}
 if(protectedPage)window.fetch=async(input,options)=>{
  const url=typeof input==='string'?input:input.url;
  if(url.startsWith('/api/')&&!url.startsWith('/api/auth')){const user=await Session.ready;if(!user)throw Error('Inicia sesión para continuar.')}
  const r=await nativeFetch(input,options);if(r.status===401&&!url.startsWith('/api/auth'))location.assign('/login?next='+encodeURIComponent(location.pathname+location.search));return r;
 };
 document.addEventListener('DOMContentLoaded',async()=>{
  let user;try{user=await Session.ready}catch{return}if(!user)return;
  let nav=document.getElementById('sessionNav');if(!nav){nav=document.createElement('div');nav.className='topbar';nav.innerHTML='<a class="brand" href="/planificador">MALLSPORT <span>MÓDULOS EDUCATIVOS</span></a><div id="sessionNav" class="session-links"></div>';document.body.prepend(nav);nav=document.getElementById('sessionNav')}
  const links=user.role==='admin'?[['Planificar','/planificador'],['Inscripciones','/inscripciones'],['Check-in','/checkin']]:user.role==='vendedor'?[['Inscripciones','/inscripciones']]:[['Check-in','/checkin']];
  nav.replaceChildren();for(const [text,url] of links){const a=document.createElement('a');a.href=url;a.textContent=text;nav.append(a)}const who=document.createElement('span');who.className='username';who.textContent=user.username;nav.append(who);const button=document.createElement('button');button.textContent='Cerrar sesión';button.onclick=async()=>{button.disabled=true;try{const r=await nativeFetch('/api/auth',{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error();location.replace('/login')}catch{button.disabled=false;alert('No se pudo cerrar sesión. Intenta nuevamente.')}};nav.append(button);
 });
})();
