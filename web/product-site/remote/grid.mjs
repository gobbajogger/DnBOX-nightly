// SPDX-License-Identifier: GPL-3.0-only
// One device-pixel-aligned time layer above all pitch row shading. Fractional
// repeated gradients can lose a half-pixel line over dark keys on small screens.
export function verticalGrid(width,{bar='#415052',beat='#293d43',step='#19262b'}={}){
 if(!Number.isFinite(width)||width<=0)throw Error('Positive grid width required');
 const w=Math.round(width),lines=Array.from({length:16},(_,i)=>`<path d="M${Math.round(i*w/16)} 0V1" stroke="${i%16===0?bar:i%4===0?beat:step}"/>`).join('');
 return 'url("data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="1" shape-rendering="crispEdges"><g fill="none" stroke-width="1">${lines}</g></svg>`)+'")';
}
