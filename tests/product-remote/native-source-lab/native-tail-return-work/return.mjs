// SPDX-License-Identifier: GPL-3.0-only
// One explicit source owner shared by compact/R22 presentations, not an audio clock.
const f=Math.fround;
export class NativeTailReturn{
 #last=new Uint32Array(24);
 value({target,voice,live,now}){
  if(!Number.isInteger(target)||target<0||target>1||!Number.isInteger(voice)||voice<0||voice>11||typeof live!=='boolean'||!Number.isInteger(now)||now<0||now>4294967295)throw Error('Exact native tail clock/voice context required');
  const i=target*12+voice;
  if(live)this.#last[i]=(now|1)>>>0;
  else{const last=this.#last[i],elapsed=(now-last)>>>0;if(last&&elapsed<300)return f(f(elapsed)/300);}
  return 1;
 }
 snapshot(){return Array.from(this.#last);}
}
