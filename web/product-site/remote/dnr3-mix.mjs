// SPDX-License-Identifier: GPL-3.0-only
import {CAP, NOTIFY_KIND} from './dnr3.mjs';

const address = g => ({kind: 1, a: g.target, b: g.voice, c: g.parameter});
const same = (a,b) => ['kind','a','b','c'].every(key => a[key] === b[key]);

export function createDnr3MixProvider(session, bindings) {
  const client = session.client;
  if (!client?.has(CAP.PARAM)) throw Error('The firmware does not offer Mix controls');
  const groups = [...bindings.values()], undoStack = new Map();
  let closed = false, serial = 0;
  function checkOpen() { if (closed || !session.current()) throw Error('Firmware source changed'); }
  async function lookup(groupList) {
    checkOpen();
    const controls = [];
    for (let i = 0; i < groupList.length; i += 16) {
      const keys = groupList.slice(i, i + 16), addrs = keys.map(address);
      const vals = await client.paramGet(addrs);
      checkOpen();
      if (vals.length !== keys.length) throw Error('Incomplete Mix response');
      for (const [idx, g] of keys.entries()) {
        const matches = vals.filter(v => same(v, addrs[idx]));
        if (matches.length !== 1 || matches[0].max !== g.max || matches[0].value > g.max)
          throw Error('Unsupported Mix control range');
        controls.push({...g, kind:'u32', value:matches[0].value});
      }
    }
    return controls;
  }
  const read = async () => ({controls:await lookup(groups)});
  async function write(group, expected, value) {
    if (!Number.isInteger(value) || value < group.min || value > group.max) throw Error('Invalid Mix intent');
    checkOpen();
    const addr = address(group), reply = await client.paramSet(addr, value, expected);
    checkOpen();
    if (!same(reply.fields, addr) || !Number.isInteger(reply.fields.value) || reply.fields.value > group.max)
      throw Error('Wrong Mix acknowledgement');
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, 30));
      const [live] = await lookup([group]);
      if (live.value === reply.fields.value) return live.value;
    }
    throw Error('Mix readback did not confirm the edit');
  }
  return {
    read,
    async set({target,voice,parameter,expected,value}) {
      const group = bindings.get(`${target}:${voice}:${parameter}`);
      if (!group) throw Error('Unknown Mix control');
      const applied = await write(group, expected, value);
      const snap = await read();
      const token = String(++serial);
      undoStack.set(token, {group, applied, expected});
      if (undoStack.size > 16) undoStack.delete(undoStack.keys().next().value);
      return {...snap, undoToken:token};
    },
    async undo({token}) {
      const op = undoStack.get(token);
      if (!op || token !== [...undoStack.keys()].at(-1)) throw Error('Stale Mix Undo');
      await write(op.group, op.applied, op.expected);
      const snap = await read();
      undoStack.delete(token);
      return {...snap, undoToken:null};
    },
    onChange(listener) {
      return session.onNotify(event => {
        if (event.type === 'resync' || event.kind === NOTIFY_KIND.PARAM &&
            groups.some(group => same(event.fields, address(group)))) listener();
      });
    },
    close() { closed = true; undoStack.clear(); },
  };
}
