// SPDX-License-Identifier: GPL-3.0-only
// These firmware fixtures use the preview1 console, deterministic clock, and an
// empty environment. The browser reference has no host filesystem or devices.
export function runFixture(module, family, onFrame) {
  let memory, instance;
  const reset = Symbol();
  let exitCode;
  const ended = {};
  const view = () => new DataView(memory.buffer);
  const decoder = new TextDecoder();
  let lastError = '';
  function emptyList(count, bytes) {
    view().setUint32(count, 0, true);
    view().setUint32(bytes, 0, true);
    return 0;
  }
  const wasi = {
    environ_sizes_get: emptyList,
    environ_get() { return 0; },
    args_sizes_get: emptyList,
    args_get() { return 0; },
    clock_time_get(_id, _precision, out) { view().setBigUint64(out, 0n, true); return 0; },
    fd_close() { return 0; },
    fd_fdstat_get(fd, out) {
      if (fd > 2) return 8;
      new Uint8Array(memory.buffer, out, 24).fill(0);
      view().setUint8(out, 2); // character device
      return 0;
    },
    fd_prestat_get() { return 8; },
    fd_prestat_dir_name() { return 8; },
    fd_seek() { return 70; },
    fd_write(fd, iov, count, out) {
      if (fd !== 1 && fd !== 2) return 8;
      let size = 0;
      const data = view();
      for (let i = 0; i < count; i++) {
        const address = data.getUint32(iov + 8 * i, true);
        const length = data.getUint32(iov + 8 * i + 4, true);
        if (fd === 2) lastError = (lastError + decoder.decode(new Uint8Array(memory.buffer, address, length))).slice(-512);
        size += length;
      }
      data.setUint32(out, size, true);
      return 0;
    },
    proc_exit(code) { exitCode = code; throw ended; },
  };
  const env = {
    family: () => family,
    w3_jump(code) { throw {reset, code}; },
    w3_run(key) {
      const stack = instance.exports.__stack_pointer;
      const saved = stack.value;
      try {
        instance.exports.w3_call(key);
        throw new Error('The firmware fixture did not reach its reset endpoint.');
      } catch (error) {
        if (error?.reset !== reset) throw error;
        return error.code;
      } finally { stack.value = saved; }
    },
    capture(name, framebuffer) {
      const bytes = new Uint8Array(memory.buffer);
      const end = bytes.indexOf(0, name);
      if (end < name || end - name > 128) throw new Error('Invalid firmware state identifier');
      onFrame(decoder.decode(bytes.subarray(name, end)), new Uint8Array(memory.buffer, framebuffer, 115200));
    },
  };
  instance = new WebAssembly.Instance(module, {env, wasi_snapshot_preview1: wasi});
  memory = instance.exports.memory;
  try { instance.exports._start(); }
  catch (error) { if (error !== ended) throw error; }
  if (exitCode) throw new Error(lastError.trim() || `Firmware fixture exited with code ${exitCode}`);
}
