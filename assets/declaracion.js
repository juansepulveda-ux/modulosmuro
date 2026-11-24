import {$,api,escape as esc,notice,today} from './common.js';
import {signaturePad} from './signature.js';
let profile=null,mode='self',busy=false,children=[],docId=crypto.randomUUID(),textVersion=null,textEpoch=0;
const pad=signaturePad($('signature'));
function accessOptions(){const first=$('firstVisit').checked,open=first&&$('allowRutAccess').checked;$('accessOptions').hidden=!first;$('passwordField').hidden=open;$('password').required=first&&!open;$('password').autocomplete=first?'new-password':'current-password';$('confirmPasswordField').hidden=!first||open;$('confirmPassword').required=first&&!open;$('accessButton').textContent=first?'Crear registro y continuar':'Ingresar';}
$('firstVisit').onchange=accessOptions;$('allowRutAccess').onchange=accessOptions;
async function run(fn){if(busy)return;busy=true;const controls=[...document.querySelectorAll('button')],prev=controls.map(b=>b.disabled);controls.forEach(b=>b.disabled=true);notice('');try{return await fn();}catch(e){notice(e.message,true);$('notice').scrollIntoView({behavior:'smooth',block:'center'});}finally{busy=false;controls.forEach((b,i)=>{if(b.isConnected)b.disabled=prev[i];});}}
$('accessForm').onsubmit=e=>{e.preventDefault();run(async()=>{const first=$('firstVisit').checked,open=$('allowRutAccess').checked;if(first&&!open&&$('password').value!==$('confirmPassword').value)throw Error('Las claves no coinciden.');const r=await api('/api/clientes',{action:'access',rut:$('rut').value,firstVisit:first,accessMode:open?'rut':'password',allowRutAccess:open,password:$('password').value});$('password').value='';$('confirmPassword').value='';showFamily(r.profile);});};
$('logout').onclick=()=>run(async()=>{await api('/api/clientes',{action:'logout'});sessionStorage.removeItem('mm_declaration');location.replace('/declaracion');});
function showFamily(p){profile=p;children=(p.children||[]).map(c=>({...c,selected:true}));$('access').hidden=true;$('familySection').hidden=false;$('logout').hidden=false;const f=$('familyForm');for(const k of ['name','rut','birthDate','phone','email'])f.elements[k].value=p.adult[k]||'';f.elements.birthDate.max=today();$('accessModeNotice').textContent=p.accessMode==='rut'?'Recuperación solo con RUT activada: los datos guardados de esta familia pueden consultarse desde cualquier dispositivo con el RUT.':'Tus datos están protegidos con una clave.';renderChildren();syncMode();}
function snapshotChildren(){for(const card of $('children').querySelectorAll('[data-child]')){const c=children.find(c=>c.id===card.dataset.child);c.name=card.querySelector('[data-name]').value;c.birthDate=card.querySelector('[data-birth]').value;c.selected=card.querySelector('[data-select]').checked;}}
function renderChildren(){
 $('children').innerHTML=children.length?children.map((c,i)=>`<div class="child-card" data-child="${c.id}"><div class="row"><h3>Menor ${i+1}</h3><button type="button" class="secondary small" data-remove="${c.id}">Quitar</button></div><label class="field">Nombre y apellido<input data-name required maxlength="120" value="${esc(c.name||'')}" autocomplete="off"></label><label class="field">Fecha de nacimiento<input data-birth type="date" required max="${today()}" value="${esc(c.birthDate||'')}" autocomplete="off"></label><label class="check"><input data-select type="checkbox" ${c.selected?'checked':''}> Participa hoy</label></div>`).join(''):'<p class="hint">Agrega a los menores que participarán.</p>';
}
$('addChild').onclick=()=>{snapshotChildren();if(children.length>=20){notice('Puedes guardar hasta 20 menores.',true);return;}children.push({id:crypto.randomUUID(),name:'',birthDate:'',selected:true});renderChildren();syncMode();$('children').lastElementChild.querySelector('input[data-name]').focus();};
$('children').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;snapshotChildren();if(!confirm('¿Quitar este menor de tus datos guardados? Las declaraciones ya firmadas se conservan.'))return;children=children.filter(c=>c.id!==b.dataset.remove);renderChildren();syncMode();};
async function syncMode(){
 snapshotChildren();const adult=$('adultParticipates').checked,minors=children.some(c=>c.selected);mode=adult&&minors?'both':minors?'minors':'self';
 $('guardianField').hidden=mode==='self';$('guardian').required=mode!=='self';$('guardian').checked=false;$('acceptRisks').checked=false;pad.clear();
 const epoch=++textEpoch;textVersion=null;$('declareButton').disabled=true;
 try{const r=await api('/api/clientes?action=text&mode='+mode);if(epoch!==textEpoch)return;$('declarationText').innerHTML=r.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('');textVersion=r.version;$('declareButton').disabled=false;}catch(e){if(epoch===textEpoch)notice(e.message,true);}
}
$('adultParticipates').onchange=syncMode;$('children').addEventListener('change',e=>{if(e.target.matches('[data-select]'))syncMode();});
$('clearSignature').onclick=()=>pad.clear();
$('familyForm').onsubmit=e=>{e.preventDefault();run(async()=>{
 snapshotChildren();if(!$('adultParticipates').checked&&!children.some(c=>c.selected))throw Error('Marca al adulto o al menos un menor que participe.');if(!textVersion)throw Error('No se cargó el texto de la declaración. Recarga la página.');
 const f=e.target,childIds=mode==='self'?[]:children.filter(c=>c.selected).map(c=>c.id);
 if(mode!=='self'&&!childIds.length)throw Error('Selecciona al menos un menor que participe hoy.');
 const family={adult:Object.fromEntries(['name','rut','birthDate','phone','email'].map(k=>[k,f.elements[k].value])),children:children.filter(c=>mode!=='self'||c.name||c.birthDate).map(({selected,...c})=>c)};
 const r=await api('/api/clientes',{action:'declare',id:docId,revision:profile.revision,declarationVersion:textVersion,family,mode,childIds,guardian:$('guardian').checked,acceptRisks:$('acceptRisks').checked,acceptTerms:$('acceptTerms').checked,acceptPrivacy:$('acceptPrivacy').checked,signature:pad.get()});
 sessionStorage.setItem('mm_declaration',r.declarationId);location.assign('/elegir-modulos?declaracion='+encodeURIComponent(r.declarationId));
 });};
// A refresh never stores personal data or the signature in browser storage.
try{const r=await api('/api/clientes?action=me');showFamily(r.profile);}catch{accessOptions();}
