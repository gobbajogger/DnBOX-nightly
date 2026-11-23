// SPDX-License-Identifier: GPL-3.0-only
// TEST ONLY: drives the pinned emulator runtime (real firmware compiled to WASM) from Node,
// through the same exports the AudioWorklet uses. No browser, no audio device.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function loadEmulator(dir = process.env.DNBOX_EMULATOR_RUNTIME) {
  if (!dir) throw Error('DNBOX_EMULATOR_RUNTIME is required');
  const {createKernelWasi} = await import(pathToFileURL(join(dir, 'wasi.mjs')).href);
  const module = new WebAssembly.Module(readFileSync(join(dir, 'kernel.wasm')));
  let memory, time = 0n;
  const wasi = createKernelWasi(() => memory, {clockNanoseconds: () => time});
  const ex = new WebAssembly.Instance(module, {wasi_snapshot_preview1: wasi}).exports;
  memory = ex.memory; ex._initialize?.();
  if (ex.web_boot() !== 0) throw Error('boot failed');
  const runtime = JSON.parse(readFileSync(join(dir, 'runtime.json'), 'utf8'));
  const emu = {
    ex, runtime,
    caps: ex.web_remote_caps ? ex.web_remote_caps() : 0,
    // Renders n blocks of 128 frames (~2.9 ms each) and returns the peak absolute sample.
    render(blocks = 1) {
      let peak = 0;
      for (let i = 0; i < blocks; i++) {
        if (ex.web_render(128) !== 0) throw Error('render refused');
        time += 2902494n;
        const pcm = new Int32Array(memory.buffer, ex.web_output(), 256);
        for (const v of pcm) peak = Math.max(peak, Math.abs(v));
      }
      return peak;
    },
    ms(n) { return this.render(Math.ceil(n / 2.9)); },
    midi(bytes) { return ex.web_midi(bytes[0], bytes[1] ?? 0, bytes[2] ?? 0); },
    sysex(frame) {
      if (!ex.web_sysex_in) return -1;
      new Uint8Array(memory.buffer, ex.web_sysex_buffer(), frame.length).set(frame);
      return ex.web_sysex_in(frame.length);
    },
    sysexOut() {
      const out = [];
      for (let n; ex.web_sysex_out_take && (n = ex.web_sysex_out_take()) > 0;) out.push(new Uint8Array(memory.buffer, ex.web_sysex_out(), n).slice());
      return out;
    },
    playing() { return ex.web_playing(); },
    // kind 1 = Chicago amp (adsr[4], level, state), 3 = 909 BD/SD amp (raw_level ... active @40)
    envelope(kind, slot, role) {
      if (!ex.web_envelope_read(kind, slot, role)) return null;
      return new DataView(memory.buffer, ex.web_envelope_data(), 64);
    },
  };
  emu.ms(200);
  return emu;
}
