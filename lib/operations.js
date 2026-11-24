import {chileClock,fail} from './http.js';
import {defaultSettings,settings} from './settings.js';
import {readDay,withDay} from './redis.js';
import {plansFor} from './github.js';
import {modulesFrom,active,capacity,usage} from './bookings.js';
export const wallMinute=(date,minute)=>Date.parse(date+'T00:00:00Z')/60000+minute;
export function registrationWindow(m,date,config=defaultSettings(),clock=chileClock()){
 const now=wallMinute(clock.date,clock.minute),start=wallMinute(date,m.start),end=wallMinute(date,m.end);
 if(now>=end)return {open:false,reason:'Módulo finalizado'};
 if(now>=start&&(!config.allowLate||now>=start+config.lateMinutes))return {open:false,reason:'Plazo de inscripción cerrado'};
 return {open:true,reason:'Inscripciones abiertas'};
}
export function assertEnrollment(day,m,date,config,clock){if(day.blocks?.[m.key]?.blocked)fail(409,'Este módulo está bloqueado por el personal.');const w=registrationWindow(m,date,config,clock);if(!w.open)fail(409,w.reason+'. No se admiten nuevas inscripciones ni cambios de módulo o actividad.');}
export function moduleStates(day,modules,date,config,clock){return modules.map(m=>({...m,...registrationWindow(m,date,config,clock),blocked:!!day.blocks?.[m.key]?.blocked,blockReason:day.blocks?.[m.key]?.reason||''}));}
export function expireReservations(day,modules,date,config=defaultSettings(),clock=chileClock()){
 if(!config.releaseUnpaid)return 0;let changed=0;
 const now=wallMinute(clock.date,clock.minute);
 for(const m of modules){if(now<wallMinute(date,m.start-config.releaseBeforeMinutes))continue;
  // Capture saturated products BEFORE cancelling, so all eligible holds in those products follow the same rule.
  const full=(m.type==='muro'?['muro']:['airtrail','tirolesa']).filter(a=>capacity(day,m,a)>0&&usage(day,m.key,a)>=capacity(day,m,a));
  if(!full.length)continue;
  for(const r of day.registrations){if(!active(r)||r.moduleKey!==m.key||r.paid!==false||r.checkin||!r.activities.some(a=>full.includes(a)))continue;
   r.status='cancelled';r.revision=(r.revision||0)+1;r.cancellation={at:clock.now,by:'Sistema',reason:'unpaid_full',description:'Reserva impaga anulada al vencer el límite con la actividad llena.',minutesBefore:config.releaseBeforeMinutes};r.history||=[];r.history.push({action:'autoCancelUnpaid',at:clock.now,by:'Sistema',reason:'unpaid_full'});changed++;
  }
 }return changed;
}
export async function operationalDay(date){const [config,plans,initial]=await Promise.all([settings(),plansFor(date),readDay(date)]),modules=modulesFrom(plans),clock=chileClock();let day=initial;
 if(expireReservations(structuredClone(initial),modules,date,config,clock))day=await withDay(date,async(current,save)=>{if(expireReservations(current,modules,date,config,chileClock()))await save();return current;});
 return {day,modules,config,clock};
}
