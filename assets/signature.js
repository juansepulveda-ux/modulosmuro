export function signaturePad(canvas,initial=[]){
 const ctx=canvas.getContext('2d');let strokes=structuredClone(initial),drawing=false,enabled=true;
 function draw(){const rect=canvas.getBoundingClientRect(),ratio=window.devicePixelRatio||1;if(!rect.width)return;canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,rect.width,rect.height);ctx.lineWidth=2.5;ctx.strokeStyle='#112d43';ctx.lineCap='round';ctx.lineJoin='round';for(const s of strokes){ctx.beginPath();s.forEach(([x,y],i)=>i?ctx.lineTo(x*rect.width,y*rect.height):ctx.moveTo(x*rect.width,y*rect.height));ctx.stroke();}}
 function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))].map(n=>Math.round(n*10000)/10000);}
 canvas.onpointerdown=e=>{if(!enabled||strokes.length>=60)return;e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);strokes.push([point(e)]);};
 canvas.onpointermove=e=>{if(!drawing)return;e.preventDefault();if(strokes.flat().length>=6000||strokes.at(-1).length>=1500)return;strokes.at(-1).push(point(e));draw();};
 const stop=()=>{drawing=false;};canvas.onpointerup=stop;canvas.onpointercancel=stop;
 const observer=new ResizeObserver(draw);observer.observe(canvas);draw();
 return {get:()=>structuredClone(strokes),clear(){strokes=[];draw();},setEnabled(v){enabled=v;},draw,destroy(){observer.disconnect();}};
}
