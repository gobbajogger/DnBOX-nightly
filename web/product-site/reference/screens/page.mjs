// SPDX-License-Identifier: GPL-3.0-only
import {paintFrame} from './render.mjs';
const group = document.querySelector('#group');
const state = document.querySelector('#state');
const scope = document.querySelector('#scope');
const status = document.querySelector('#status');
const lcd = document.querySelector('#lcd');
const context = lcd.getContext('2d', {alpha: false});
let request = 0;

async function start() {
  const response = await fetch('states.json');
  if (!response.ok) throw new Error('The screen index could not be loaded.');
  const {groups, modules, kinds, states} = await response.json();
  let worker;
  let pending = false;
  const byName = new Map(states.map(row => [row[0], row]));
  const showError = message => {
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
        lcd.setAttribute('aria-label', 'Firmware LCD for ' + data.state);
        status.textContent = data.state;
      };
    }
    pending = true;
    return worker;
  }
  function render() {
    const [id, , kind, module, family] = byName.get(state.value);
    scope.textContent = kinds[kind];
    status.textContent = 'Rendering ' + id + '…';
    lcd.removeAttribute('data-state');
    context.clearRect(0, 0, 240, 240);
    history.replaceState(null, '', '#' + id);
    renderer().postMessage({state: id, file: modules[module], family, request: ++request});
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
  window.addEventListener('hashchange', openHash);
  group.disabled = state.disabled = false;
  openHash();
}
start().catch(error => { status.textContent = error.message; });
