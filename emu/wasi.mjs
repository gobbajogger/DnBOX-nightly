// SPDX-License-Identifier: GPL-3.0-only
// Explicit WASI preview1 host: no files, network, device, or inherited environment.
// errno values are from the pinned Emscripten wasi/api.h: BADF8, SPIPE70.
export function createKernelWasi(getMemory,{clockNanoseconds=()=>0n,onWrite=()=>{}}={}){
 const open=new Set([0,1,2]);const view=()=>new DataView(getMemory().buffer);
 return {
  clock_time_get(id,precision,out){if(id!==0&&id!==1)return 28;view().setBigUint64(out,BigInt(clockNanoseconds()),true);return 0;},
  environ_sizes_get(count,bytes){const v=view();v.setUint32(count,0,true);v.setUint32(bytes,0,true);return 0;},
  environ_get(){return 0;},
  // There are no mounted directories. Only stdin, stdout and stderr exist.
  fd_prestat_get(){return 8;},
  fd_prestat_dir_name(){return 8;},
  path_open(){return 8;},
  fd_fdstat_set_flags(fd,flags){return !open.has(fd)?8:flags?58:0;},
  fd_fdstat_get(fd,out){
   if(!open.has(fd))return 8;
   const mem=view();new Uint8Array(mem.buffer,out,24).fill(0);
   mem.setUint8(out,2);
   mem.setBigUint64(out+8,fd===0?2n:64n,true);
   return 0;
  },
  fd_read(fd,iov,count,out){if(fd!==0||!open.has(fd))return 8;view().setUint32(out,0,true);return 0;},
  fd_write(fd,iov,count,out){
   if((fd!==1&&fd!==2)||!open.has(fd))return 8;
   const v=view();let total=0;
   for(let i=0;i<count;i++){const at=v.getUint32(iov+i*8,true),n=v.getUint32(iov+i*8+4,true);const b=new Uint8Array(getMemory().buffer,at,n);onWrite(fd,b.slice());total+=n;}
   v.setUint32(out,total,true);return 0;
  },
  fd_seek(fd){return open.has(fd)?70:8;},
  fd_close(fd){if(!open.has(fd))return 8;open.delete(fd);return 0;},
  proc_exit(code){throw Error('Kernel exit '+code);}
 };
}
export function assertKernelImports(module,wasi){
 for(const x of WebAssembly.Module.imports(module))if(x.module!=='wasi_snapshot_preview1'||x.kind!=='function'||!Object.hasOwn(wasi,x.name))throw Error('Unimplemented host import '+x.module+'.'+x.name);
}
