(()=>{
 const pad=n=>String(n).padStart(2,'0');
 window.DailyRoster={
  today:()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
  async read(type,date){if(!date)throw Error('Selecciona primero la fecha de la planificación.');const r=await fetch(`/api/dotacion?action=import&type=${type}&date=${encodeURIComponent(date)}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo importar la dotación.');const label=type==='muro'?'Muro':'Airtrail / Tirolesa';let text=`Importar ${d.people.length} monitores para ${label} el ${date}. Se reemplazará toda la lista de este planificador y se descartará su planificación sin publicar. La base central y las jornadas publicadas se conservan.`;if(d.both.length)text+='\n\nDisponibles para ambas: '+d.both.join(', ')+'. Revisa que no queden asignados simultáneamente en los dos planes.';if(!confirm(text))return null;return d;},
  metadata:d=>({date:d.date,revision:d.revision,baseRevision:d.baseRevision,importedAt:new Date().toISOString()}),
  message:d=>`${d.people.length} monitores importados del ${d.date}. Ingreso, salida y capacidades copiados. ${d.both.length?'Hay monitores para ambas actividades: revisa los cruces entre planes. ':''}Ajusta los tramos y descansos, genera y revisa antes de publicar.`
 };
})();
