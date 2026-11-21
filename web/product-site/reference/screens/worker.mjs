// SPDX-License-Identifier: GPL-3.0-only
import {runFixture} from './runner.mjs';
const modules = new Map();

async function loadModule(name) {
  if (!modules.has(name)) {
    const response = await fetch(name);
    if (!response.ok) throw new Error('The firmware renderer is unavailable in this build.');
    modules.set(name, await WebAssembly.compile(await response.arrayBuffer()));
  }
  return modules.get(name);
}

self.onmessage = async ({data: {state, family, file, request}}) => {
  const selected = {};
  try {
    const module = await loadModule(file);
    try {
      runFixture(module, family, (id, pixels) => {
        if (id !== state) return;
        const frame = pixels.slice();
        self.postMessage({state, frame, request}, [frame.buffer]);
        throw selected;
      });
    } catch (error) {
      if (error === selected) return;
      throw error;
    }
    throw new Error('The firmware did not produce the selected state.');
  } catch (error) {
    self.postMessage({error: String(error.message || error), request});
  }
};
