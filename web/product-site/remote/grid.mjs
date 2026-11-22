// SPDX-License-Identifier: GPL-3.0-only
// One device-pixel-aligned time layer above all pitch row shading. Fractional
// repeated gradients can lose a half-pixel line over dark keys on small screens.
export function verticalGrid(width,{bar='#415052',beat='#293d43',step='#19262b'}={}){
 if(!Number.isFinite(width)||width<=0)throw Error('Positive grid width required');
 // At extreme gesture zoom, there may be fewer device pixels than subdivisions.
 // Overpainted lines darken the grid; keep the strongest (bar > beat > step).
 const w=Math.max(1,Math.round(width)),strokes=new Map();
 for(let i=0;i<16;i++){
  const x=Math.min(w-1,Math.round(i*w/16)),strength=i===0?2:i%4===0?1:0;
  if(!strokes.has(x)||strength>strokes.get(x))strokes.set(x,strength);
 }
 const colors=[step,beat,bar];
 const lines=[...strokes].sort((a,b)=>a[0]-b[0]).map(([x,strength])=>
  `<path d="M${x} 0V1" stroke="${colors[strength]}"/>`).join('');
 return 'url("data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="1" shape-rendering="crispEdges"><g fill="none" stroke-width="1">${lines}</g></svg>`)+'")';
}
