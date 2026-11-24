import {createHash} from 'node:crypto';
import {fail,chileClock,validDate} from './http.js';

export const DECLARATION_VERSION='2026-11-24.1';
export const TERMS_URL='https://www.chileclimbers.cl/terminos-y-condiciones/';
export const PRIVACY_URL='https://www.chileclimbers.cl/politica-de-privacidad/';
export const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function normalizeRut(value){
 const r=String(value||'').replace(/[.\s-]/g,'').toUpperCase();
 if(!/^\d{7,8}[0-9K]$/.test(r))fail(400,'Revisa el RUT, incluido su dígito verificador.');
 const body=r.slice(0,-1);let sum=0,mult=2;
 for(const digit of [...body].reverse()){sum+=Number(digit)*mult;mult=mult===7?2:mult+1;}
 const dv=11-sum%11,expected=dv===11?'0':dv===10?'K':String(dv);
 if(r.at(-1)!==expected||Number(body)===0)fail(400,'El dígito verificador del RUT no coincide.');
 return `${body}-${expected}`;
}
export const profileId=rut=>createHash('sha256').update(normalizeRut(rut)).digest('hex');
export function text(v,max,label){if(typeof v!=='string'||!v.trim()||v.length>max)fail(400,`Revisa ${label}.`);return v.trim();}
export function emailAddress(v){const email=text(v,254,'el correo electrónico').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Revisa el correo electrónico.');return email;}
export function ageOn(birthDate,date=chileClock().date){
 if(!validDate(birthDate)||birthDate>date)fail(400,'Revisa la fecha de nacimiento.');
 const age=Number(date.slice(0,4))-Number(birthDate.slice(0,4))-Number(date.slice(5)<birthDate.slice(5));
 if(age<0||age>120)fail(400,'Revisa la fecha de nacimiento.');return age;
}
export function validateFamily(input,expectedRut){
 const adult=input?.adult||{},rut=normalizeRut(adult.rut);
 if(rut!==expectedRut)fail(403,'El RUT no corresponde a tu acceso.');
 if(ageOn(adult.birthDate)<18)fail(400,'La declaración debe completarla una persona mayor de edad.');
 const phone=text(adult.phone,30,'el teléfono');if(!/^\+?[\d ()-]{8,30}$/.test(phone))fail(400,'Revisa el teléfono.');
 if(!Array.isArray(input.children)||input.children.length>20)fail(400,'Puedes guardar hasta 20 menores.');
 const children=input.children.map(c=>{
  if(!uuid(c.id))fail(400,'Identificador del menor inválido.');
  if(ageOn(c.birthDate)>=18)fail(400,'Una persona de 18 años o más debe completar su propia declaración.');
  return {id:c.id,name:text(c.name,120,'el nombre del menor'),birthDate:c.birthDate};
 });
 if(new Set(children.map(c=>c.id)).size!==children.length)fail(400,'Hay menores duplicados.');
 return {adult:{rut,name:text(adult.name,120,'el nombre'),birthDate:adult.birthDate,phone,email:emailAddress(adult.email)},children};
}
export function declarationText(mode){
 if(!['self','minors','both'].includes(mode))fail(400,'Selecciona quién participará.');
 const minors=mode!=='self',self=mode!=='minors';
 return [
  'Declaración de participación y aceptación de riesgos — Muro Mall Sport, Airtrail, Tirolesa y Gravity Mallsport, al interior de Mall Sport.',
  minors?'Declaro ser mayor de edad y apoderado o representante autorizado de los menores identificados en esta declaración, y autorizo su participación.':'Declaro ser mayor de edad y participar por decisión propia.',
  `${mode==='both'?'Declaro que tanto yo como los menores contamos':self?'Declaro que cuento':'Declaro que los menores cuentan'} con las aptitudes físicas y de salud necesarias para las actividades elegidas. Informaré al personal, antes de comenzar, cualquier condición relevante para una participación segura.`,
  `Conozco que estas actividades incluyen riesgos propios, entre ellos caídas, golpes y lesiones. He decidido libre y voluntariamente ${self?'mi participación':''}${mode==='both'?' y ':''}${minors?'la participación de los menores identificados':''}, tras tener la oportunidad de consultar al personal.`,
  'Me comprometo a utilizar correctamente los elementos de seguridad indicados y proporcionados para cada actividad, incluidos casco, arnés, cintas y mosquetones cuando corresponda, y a seguir las instrucciones del personal. Si participan menores, me comprometo a transmitirles estas instrucciones y colaborar en su cumplimiento.',
  'Me comprometo a vaciar los bolsillos y asegurar o retirar los objetos que puedan caer y causar daños a terceros o a las instalaciones. Si participan menores, verificaré también sus objetos personales. Responderé por los daños que legalmente me sean imputables.',
  'Me comprometo a conocer y respetar los reglamentos de Boulder, Ruta, General, Airtrail y Tirolesa que correspondan, y a solicitar al personal su consulta y cualquier aclaración antes de iniciar la actividad.',
  'Acepto los riesgos propios de la actividad que me han sido informados. Esta declaración no excluye ni limita las responsabilidades que correspondan por ley a Inmobiliaria, Administradora y Comercial Mall Sport S.A., Escuela de Escalada Tomás Ravanal SpA y Escuela Chileclimbers SpA, ni implica renunciar a derechos irrenunciables.',
  'Autorizo el tratamiento de los datos proporcionados y de mi firma para gestionar esta declaración, recuperar los datos en futuras visitas, administrar las inscripciones y acreditar las aceptaciones. Los datos de los menores se utilizarán para estos mismos fines. En las pantallas y la consulta pública del día se muestra solamente el primer nombre e inicial del apellido, la actividad y el horario de las inscripciones confirmadas.',
  `Acepto los términos y condiciones disponibles en ${TERMS_URL} y la política de privacidad disponible en ${PRIVACY_URL}. Para consultas o solicitudes sobre los datos: info@chileclimbers.cl.`
 ];
}
export function validateSignature(value){
 if(!Array.isArray(value)||!value.length||value.length>60)fail(400,'Firma en el recuadro para continuar.');
 let count=0;const points=[];
 for(const stroke of value){if(!Array.isArray(stroke)||stroke.length<1||stroke.length>1500)fail(400,'Firma inválida.');
  for(const p of stroke){if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))fail(400,'Firma inválida.');points.push(p);count++;}}
 if(count<8||count>6000||Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))<0.05)fail(400,'La firma está vacía o incompleta. Vuelve a firmar.');
 return value;
}
export function makeDeclaration(input,family,owner,context={}){
 if(!uuid(input.id))fail(400,'Identificador de declaración inválido.');
 const paragraphs=declarationText(input.mode);
 if(input.acceptRisks!==true||input.acceptTerms!==true||input.acceptPrivacy!==true)fail(400,'Debes aceptar la declaración, los términos y la política de privacidad.');
 const ids=input.childIds;
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length)fail(400,'Revisa los menores incluidos.');
 const children=ids.map(id=>{const c=family.children.find(c=>c.id===id);if(!c)fail(400,'Menor no encontrado en tus datos.');return c;});
 if(input.mode!=='self'&&(!children.length||input.guardian!==true))fail(400,'Incluye al menos un menor y confirma tu autorización como apoderado.');
 if(input.mode==='self'&&children.length)fail(400,'Revisa quién participará.');
 const doc={id:input.id,owner,...context,version:DECLARATION_VERSION,signedAt:new Date().toISOString(),date:chileClock().date,mode:input.mode,adult:structuredClone(family.adult),children:structuredClone(children),paragraphs,termsUrl:TERMS_URL,privacyUrl:PRIVACY_URL,acceptRisks:true,acceptTerms:true,acceptPrivacy:true,guardian:input.mode!=='self',signature:validateSignature(input.signature)};
 doc.digest=createHash('sha256').update(JSON.stringify(doc)).digest('hex');return doc;
}
