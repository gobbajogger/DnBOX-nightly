// SPDX-License-Identifier: GPL-3.0-only
import {paintFrame} from './render.mjs';
const group = document.querySelector('#group');
const state = document.querySelector('#state');
const scope = document.querySelector('#scope');
const sources = document.querySelector('#seq-sources');
const source = document.querySelector('#lcd-source');
const sequencers = new Map([
  ['view-08-part-00-voice-00-page-00', '909'],
  ['view-08-part-01-voice-00-page-00', '808'],
]);
const status = document.querySelector('#status');
const compare = document.querySelector('#compare');
const comparison = document.querySelector('#comparison');
const lcd = document.querySelector('#lcd');
const context = lcd.getContext('2d', {alpha: false});
let request = 0;
let oracle;

async function nativeHashes() {
  const response = await fetch('native-rgb.tsv');
  if (!response.ok) throw new Error('The native frame hashes could not be loaded.');
  return new Map((await response.text()).trimEnd().split('\n').map(line => line.split('\t')));
}

async function compareFrame() {
  const selected = request;
  const name = lcd.dataset.state;
  if (!name || source.value !== 'current') return;
  compare.disabled = true;
  comparison.textContent = 'Comparing pixels…';
  try {
    oracle ??= nativeHashes().catch(error => { oracle = undefined; throw error; });
    const native = (await oracle).get(name);
    if (selected !== request) return;
    if (!/^[a-f0-9]{64}$/.test(native || '')) throw new Error('The native hash is unavailable for this frame.');
    const rgba = context.getImageData(0, 0, lcd.width, lcd.height).data;
    const rgb = new Uint8Array(lcd.width * lcd.height * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i];
      rgb[j + 1] = rgba[i + 1];
      rgb[j + 2] = rgba[i + 2];
    }
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', rgb));
    const actual = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    if (selected !== request) return;
    comparison.textContent = actual === native ? 'All 57,600 pixels match the native frame.'
      : 'The displayed frame differs from the native frame. Displayed SHA-256 ' + actual + '. Native SHA-256 ' + native + '.';
  } catch (error) {
    if (selected === request) comparison.textContent = error.message;
  } finally {
    if (selected === request) compare.disabled = false;
  }
}

async function start() {
  const response = await fetch('states.json');
  if (!response.ok) throw new Error('The screen index could not be loaded.');
  const {groups, modules, kinds, states} = await response.json();
  let worker;
  let pending = false;
  const byName = new Map(states.map(row => [row[0], row]));
  const showError = message => {
    compare.disabled = true;
    comparison.textContent = '';
    context.clearRect(0, 0, 240, 240);
    lcd.removeAttribute('data-state');
    lcd.setAttribute('aria-label', 'Firmware LCD unavailable');
    status.textContent = message;
  };
  function renderer() {
    if (pending && worker) {
      worker.terminate();
      worker = null;
    }
    if (!worker) {
      const next = new Worker(new URL('./worker.mjs', import.meta.url), {type: 'module'});
      worker = next;
      next.onerror = () => {
        if (worker !== next) return;
        pending = false;
        next.terminate();
        worker = null;
        showError('The firmware renderer could not be started.');
      };
      next.onmessage = ({data}) => {
        if (worker !== next || data.request !== request) return;
        pending = false;
        if (data.error) { showError(data.error); return; }
        paintFrame(context, data.frame);
        lcd.dataset.state = data.state;
        lcd.dataset.source = 'current';
        compare.disabled = false;
        lcd.setAttribute('aria-label', 'Firmware LCD for ' + data.state);
        status.textContent = data.state;
      };
    }
    pending = true;
    return worker;
  }
  async function drawReference(engine, selectedSource, selected) {
    const image = new Image();
    image.src = new URL(engine + '-seq-' + selectedSource + '.png', import.meta.url);
    try {
      await image.decode();
      if (selected !== request) return;
      if (image.naturalWidth !== lcd.width || image.naturalHeight !== lcd.height) {
        throw new Error('Invalid reference frame size');
      }
      context.drawImage(image, 0, 0);
      const label = selectedSource === 'shipping' ? 'Shipping 0.0.26 · 94197fc8'
        : 'R22 · source-frame-' + (engine === '909' ? '066' : '068');
      lcd.dataset.state = state.value;
      lcd.dataset.source = selectedSource;
      lcd.setAttribute('aria-label', engine + ' SEQ — ' + label);
      status.textContent = label;
    } catch {
      if (selected === request) showError('The selected LCD reference could not be loaded.');
    }
  }
  function render() {
    const [id, , kind, module, family] = byName.get(state.value);
    const engine = sequencers.get(id);
    sources.hidden = !engine;
    if (!engine) source.value = 'current';
    const selectedSource = source.value;
    scope.textContent = selectedSource === 'current' ? kinds[kind] : 'Captured 240 × 240 reference';
    compare.hidden = selectedSource !== 'current';
    status.textContent = 'Rendering ' + id + '…';
    compare.disabled = true;
    comparison.textContent = '';
    lcd.removeAttribute('data-state');
    lcd.removeAttribute('data-source');
    context.clearRect(0, 0, 240, 240);
    history.replaceState(null, '', '#' + id);
    const selected = ++request;
    if (selectedSource !== 'current') {
      void drawReference(engine, selectedSource, selected);
      return;
    }
    renderer().postMessage({state: id, file: modules[module], family, request: selected});
  }
  function fillGroup(preferred) {
    const options = states.filter(row => row[1] === Number(group.value))
      .map(([id]) => new Option(id, id));
    state.replaceChildren(...options);
    if (preferred) state.value = preferred;
    render();
  }
  group.replaceChildren(...groups.map((name, i) => new Option(name, i)));
  function openHash() {
    const selected = byName.get(location.hash.slice(1)) || byName.get('home-playing') || states[0];
    group.value = selected[1];
    fillGroup(selected[0]);
  }
  group.addEventListener('change', () => fillGroup());
  state.addEventListener('change', render);
  source.addEventListener('change', render);
  compare.addEventListener('click', compareFrame);
  window.addEventListener('hashchange', openHash);
  group.disabled = state.disabled = false;
  openHash();
}
start().catch(error => { status.textContent = error.message; });
