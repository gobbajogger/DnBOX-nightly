// SPDX-License-Identifier: GPL-3.0-only
// Read only an explicitly supplied, qualified web-runtime artifact. Never compile,
// download, deploy or admit unrelated native output/private input files.
import {readFileSync,lstatSync,openSync,fstatSync,closeSync,constants} from 'node:fs';
import {resolve,parse,join,sep} from 'node:path';import {createHash} from 'node:crypto';
const names=['runtime.json','kernel.wasm','native-session.mjs','observer.mjs','session-codec.mjs','worklet.mjs','wasi.mjs','index.html','page.mjs','style.css'];
export function readEmulatorRuntime({directory,pin}={}){
 if(typeof directory!=='string'||!directory)throw Error('Explicit native runtime directory required');
 if(typeof pin?.firmware!=='string'||!/^[a-f0-9]{40}$/.test(pin.firmware)||typeof pin?.kernel!=='string'||!/^[a-f0-9]{40}$/.test(pin.kernel)||!pin.files||Object.keys(pin.files).sort().join('|')!==[...names].sort().join('|'))throw Error('Invalid native runtime closure');
 const root=resolve(directory);let at=parse(root).root;
 for(const part of root.slice(at.length).split(sep).filter(Boolean)){at=join(at,part);if(lstatSync(at).isSymbolicLink())throw Error('Runtime symlink refused');}
 if(!lstatSync(root).isDirectory())throw Error('Regular runtime directory required');
 const inputs=[];
 for(const name of names){
  const expected=pin.files[name],limit=name==='kernel.wasm'?16*1024*1024:name==='runtime.json'?4096:1024*1024;
  if(!Number.isSafeInteger(expected?.bytes)||expected.bytes<1||expected.bytes>limit||typeof expected.sha256!=='string'||!/^[a-f0-9]{64}$/.test(expected.sha256))throw Error('Invalid runtime closure bound');
  const path=join(root,name),before=lstatSync(path);if(before.isSymbolicLink())throw Error('Runtime symlink refused');if(!before.isFile())throw Error('Regular runtime input required');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);let bytes;
  try{const stat=fstatSync(fd);if(!stat.isFile())throw Error('Regular runtime input required');if(stat.size!==expected.bytes)throw Error('Native runtime size mismatch: '+name);bytes=readFileSync(fd);}finally{closeSync(fd);}
  if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('Native runtime hash mismatch: '+name);
  inputs.push(['emu/'+name,bytes]);
 }
 const metadata=JSON.parse(inputs[0][1].toString('utf8')),wasm=pin.files['kernel.wasm'];
 if(metadata.firmware_source!==pin.firmware||metadata.kernel_source!==pin.kernel||metadata.wasm_sha256!==wasm.sha256||metadata.wasm_bytes!==wasm.bytes||metadata.device_control!==false||metadata.full_physical_panel!==false)throw Error('Native runtime metadata mismatch');
 return inputs;
}

// The repository pin is executable admission configuration, not an artifact-supplied manifest.
export function readEmulatorPin(path){
 const target=resolve(path);let at=parse(target).root;
 for(const part of target.slice(at.length).split(sep).filter(Boolean)){at=join(at,part);if(lstatSync(at).isSymbolicLink())throw Error('Runtime pin symlink refused');}
 if(!lstatSync(target).isFile())throw Error('Regular runtime pin required');
 const fd=openSync(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const stat=fstatSync(fd);if(!stat.isFile())throw Error('Regular runtime pin required');if(stat.size<1||stat.size>65536)throw Error('Runtime pin size refused');const bytes=readFileSync(fd);if(bytes.length!==stat.size)throw Error('Runtime pin changed during read');return JSON.parse(bytes.toString('utf8'));}finally{closeSync(fd);}
}
