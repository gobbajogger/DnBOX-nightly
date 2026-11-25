// SPDX-License-Identifier: GPL-3.0-only
import {CAP, KEEP, NOTIFY_KIND} from './dnr3.mjs';
import {drumOptions, optionPref, PAGE_STEPS} from './drum-options.mjs';

export function supportsDrumPages(client) {
  return client?.has(CAP.STEP) && client.has(CAP.PARAM) && client.has(CAP.WATCH) &&
    client.hello?.nsteps === 64 && client.hello.npat === 32 &&
    client.hello.ntracks === 11 && client.hello.ndrum === 2;
}

export function createLiveDrumPages({currentClient, changed}) {
  let active = null;
  function close() { active?.off?.(); active = null; }
  const current = a => active === a && a.client === currentClient();
  const publish = a => { if (current(a)) changed(); };
  function assertCurrent(a) { if (!current(a)) throw Error('Drum source changed'); }
  async function read(a, pat, track, step) {
    const f = await a.client.stepGet(a.part, pat, step, track);
    assertCurrent(a);
    if (f.part!==a.part || f.pat!==pat || f.step!==step || f.record?.track!==track ||
        ![0,1].includes(f.record.on) || !Number.isInteger(f.record.vel) || f.record.vel<0 || f.record.vel>127)
      throw Error('Wrong drum step readback');
    return f.record;
  }
  async function refresh(a, retry = false) {
    if (!current(a)) return;
    if (a.busy && !retry) { a.dirty = true; return; }
    a.busy = true;
    publish(a);
    try {
      do {
        a.dirty = false;
        const before = await a.client.state();
        assertCurrent(a);
        const pat = before.ppat[a.part], crc = before.pattern_crc[pat];
        if (!Number.isInteger(pat) || pat<0 || pat>=32 || !Number.isInteger(crc)) throw Error('No loaded drum pattern');
        const options = drumOptions(), refs = options.map(option => optionPref(option,a.part,pat));
        const params = await a.client.paramGet(refs);
        assertCurrent(a);
        const values = Object.fromEntries(options.map((o,i) => {
          const f = params[i];
          if (!f || Object.keys(refs[i]).some(k => refs[i][k]!==f[k]) ||
              !Number.isInteger(f.value) || f.value<0 || f.value>o.max)
            throw Error('Wrong drum parameter readback');
          return [o.pref,f.value];
        }));
        const rows = [];
        for (let track = 0; track<12; track++) {
          const row = [];
          for (let i=0; i<PAGE_STEPS; i++) row.push(await read(a,pat,track,a.page*PAGE_STEPS+i));
          rows.push(row);
        }
        const after = await a.client.state();
        assertCurrent(a);
        a.dirty ||= after.ppat[a.part]!==pat || after.pattern_crc[pat]!==crc;
        if (!a.dirty) Object.assign(a,{pat,crc,rows,values,error:null});
      } while (a.dirty);
    } catch (e) {
      a.rows = null; a.error = e.message;
    } finally {
      a.busy = false;
      publish(a);
    }
  }
  function select(part,page) {
    const client = currentClient();
    if (![0,1].includes(part) || ![0,1,2,3].includes(page) || !supportsDrumPages(client)) {
      close(); return null;
    }
    if (active?.part===part && active.page===page && active.client===client) return active;
    close();
    const a = {client,part,page,busy:true,dirty:false,rows:null,values:null,pat:null,crc:null,error:null,off:null};
    active = a;
    a.off = client.onNotify(e => {
      if (e.type==='resync' || e.kind===NOTIFY_KIND.PATTERN ||
          e.kind===NOTIFY_KIND.STEP && [part,127].includes(e.fields.part) &&
            [a.pat,127].includes(e.fields.pat) ||
          e.kind===NOTIFY_KIND.PARAM && [2,3,4,14,127].includes(e.fields.kind))
        void refresh(a);
    });
    // Rendering selects the target synchronously; notify only after it returns.
    queueMicrotask(() => { if (current(a)) void refresh(a,true); });
    return a;
  }
  async function editStep(part,track,step,velocity=null) {
    const a = active, i = step-(a?.page ?? -1)*PAGE_STEPS;
    if (!a || !current(a) || a.part!==part || a.busy || !a.rows?.[track]?.[i]) return false;
    const prior = a.rows[track][i];
    if (velocity!==null && (!prior.on || track>=11 || !Number.isInteger(velocity) ||
        velocity<0 || velocity>=127 || prior.vel===velocity)) return false;
    a.busy = true;
    publish(a);
    let ok = false;
    try {
      const state = await a.client.state();
      assertCurrent(a);
      if (state.ppat[part]!==a.pat || state.pattern_crc[a.pat]!==a.crc || a.crc===KEEP)
        throw Error('Drum pattern changed or is not CAS-addressable');
      const latest=await read(a,a.pat,track,step);
      if(latest.vel!==prior.vel||latest.on!==prior.on)throw Error('Drum step changed before edit');
      const on=velocity===null?1-prior.on:prior.on;
      const sent = (await a.client.stepSet(part,a.pat,step,{track,on,vel:velocity??127},a.crc)).fields;
      assertCurrent(a);
      if (sent.part!==part || sent.pat!==a.pat || sent.step!==step || sent.record?.track!==track ||
          sent.record.on!==on || !Number.isInteger(sent.pattern_crc))
        throw Error('Wrong drum step acknowledgement');
      const actual = await read(a,a.pat,track,step);
      const after = await a.client.state();
      assertCurrent(a);
      if (actual.on!==on || velocity!==null&&actual.vel!==velocity || after.ppat[part]!==a.pat || after.pattern_crc[a.pat]!==sent.pattern_crc)
        throw Error('Drum step was not confirmed');
      a.rows[track][i] = actual;
      a.crc = sent.pattern_crc;
      ok = true;
    } catch (e) {
      a.error = e.message; a.dirty = true;
    } finally {
      if (current(a)) {
        if (a.dirty) await refresh(a,true);
        else { a.busy = false; publish(a); }
      }
    }
    return ok;
  }
  async function setOption(part,pref,value) {
    const a = active, option = drumOptions().find(o => o.pref===pref);
    if (!a || !current(a) || a.part!==part || a.busy || !a.rows || !option ||
        !Number.isInteger(value) || value<0 || value>option.max || a.values[pref]===value) return false;
    a.busy = true;
    publish(a);
    try {
      const state = await a.client.state();
      assertCurrent(a);
      if (state.ppat[part]!==a.pat || state.pattern_crc[a.pat]!==a.crc)
        throw Error('Drum pattern changed before option edit');
      const addr=optionPref(option,part,a.pat);
      await a.client.paramSet(addr,value,a.values[pref]);
      assertCurrent(a);
      const [f]=await a.client.paramGet([addr]);
      assertCurrent(a);
      if (!f || f.value!==value || Object.keys(addr).some(k=>addr[k]!==f[k]))
        throw Error('Drum option was not confirmed');
      return true;
    } catch (e) {
      a.error=e.message;
      return false;
    } finally {
      if (current(a)) await refresh(a,true);
    }
  }
  return {select,toggle:(part,track,step)=>editStep(part,track,step),setVelocity:editStep,setOption,close};
}
