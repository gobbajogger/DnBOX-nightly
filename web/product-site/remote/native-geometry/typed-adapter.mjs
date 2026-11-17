// Source-only projection: caller must supply exact b341 descriptor identity.
// No runtime registration, native admission or device I/O.
import registry from './typed-controls.json' with {type:'json'};
import {nativeTuneAttack} from './tune-attack.mjs';
const key=r=>[r.kind,r.target,r.voice,r.slot].join(':');
const entries=new Map();
for(const r of registry.controls){if(entries.has(key(r)))throw Error("Duplicate native typed descriptor");entries.set(key(r),Object.freeze(r));}
export function projectNativeTuneAttack(identity,raw,layout){
 if(!identity||![identity.kind,identity.target,identity.voice,identity.slot].every(Number.isInteger))throw Error("Integer typed identity required");
 const r=entries.get(key(identity));
 if(!r||identity.source!==registry.source||identity.name!==r.name||identity.maximumRaw!==r.maximumRaw||identity.minimumRaw!==r.minimumRaw)throw Error('Exact native typed descriptor required');
 if(!Number.isFinite(raw)||raw<r.minimumRaw||raw>r.maximumRaw)throw Error('Native raw domain required');
 return nativeTuneAttack(r.family,raw,r.maximumRaw,layout);
}
