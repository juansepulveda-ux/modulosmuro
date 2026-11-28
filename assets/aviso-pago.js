import {escape as esc} from './common.js';
export function paymentNoticeHtml(registration){
 const n=registration.paymentNotice;
 if(!registration.active||registration.paid||!n)return '';
 const timestamp=Date.parse(n.deadlineAt);
 if(!Number.isFinite(timestamp))return '';
 const deadline=new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(timestamp));
 const date=new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit'}).format(new Date(timestamp));
 const seconds=Math.max(0,Math.floor(n.remainingSeconds||0)),mins=Math.floor(seconds/60),rest=seconds%60;
 const remaining=mins?`${mins} min${rest?' '+rest+' s':''}`:`${rest} s`;
 const title=seconds>0?'Tu cupo está reservado temporalmente':'Acércate a pagar ahora';
 const timing=seconds>0?`Paga en recepción antes de las <strong class="payment-deadline">${esc(deadline)}</strong> del ${esc(date)} (hora de Chile).<br>Tiempo disponible al consultar: <strong>${esc(remaining)}</strong>.`:'El plazo protegido ya terminó. Si la actividad está llena y sigues sin pagar, tu reserva puede anularse automáticamente.';
 const fullness=n.activityFull?'La actividad está llena.':'Al consultar todavía había espacio.';
 return `<aside class="payment-notice" aria-label="Plazo para pagar"><strong>${title}</strong><p>${timing}</p><p>${fullness} ${seconds>0?'Después de la hora indicada, tu reserva puede anularse automáticamente si sigue impaga y la actividad está llena.':''}</p><small>El pago se confirma en recepción. Este aviso no confirma un pago ni una cancelación.</small></aside>`;
}
