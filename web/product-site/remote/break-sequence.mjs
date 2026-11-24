// SPDX-License-Identifier: GPL-3.0-only
import {startingBreakName} from '../starting-break-names.mjs';
import {mountBreakPanel} from '../components/break-panel/panel.mjs';
import {SAMPLE_CONTRACT_SHA256} from '../sample-pin.mjs';
import {createStartingBreakPreview, normalizeStartingBreakSelection} from '../starting-break-preview.mjs';

const rates = ['1/16', '1/8', '1/4'];
// Firmware BREAK pattern part (seq/pattern.h brkpart_t): steps bit s = the break may sound on
// 16th s (fresh pattern: all off), slice[16] 0 = the generator chooses / 1..32 = loop A slice,
// slot A/B, rate 1/16, 1/8, 1/4.
export function emptyBreakSequence() {
  return {loops: [null, null], rate: rates[0], slices: Array(16).fill(0), steps: Array(16).fill(false)};
}

export function validateBreakSequence(value) {
  const validLoop = id => id === null || typeof id === 'string' && normalizeStartingBreakSelection([id])?.length === 1;
  const keys = value && Object.keys(value).sort().join(',');
  if (!value || !['loops,rate,slices', 'loops,rate,slices,steps'].includes(keys) ||
      !Array.isArray(value.loops) || value.loops.length !== 2 || !value.loops.every(validLoop) ||
      !rates.includes(value.rate) || !Array.isArray(value.slices) || value.slices.length !== 16 ||
      !value.slices.every(v => Number.isInteger(v) && v >= 0 && v <= 32) ||
      (value.steps !== undefined && !(Array.isArray(value.steps) && value.steps.length === 16 && value.steps.every(v => typeof v === 'boolean')))) {
    throw Error('Invalid BREAK sequence');
  }
  const out = structuredClone(value);
  if (!out.steps) out.steps = Array(16).fill(false);
  return out;
}

// Steps whose firmware step record (on, slice) differs between two sequences.
export function changedBreakSteps(before, after) {
  const out = [];
  for (let i = 0; i < 16; i++)
    if (!!before.steps?.[i] !== !!after.steps?.[i] || before.slices[i] !== after.slices[i]) out.push({step: i, on: !!after.steps[i], slice: after.slices[i]});
  return out;
}

export function mountBreakSequence(root, state, onEdit, {device}={}) {
  let serial = 0, picker = null, selectedIds;
  function stop() {
    serial++;
    picker?.destroy();
    picker = null;
  }
  let selectedStep = 0;
  const live=()=>device?.mode()==='firmware';
  function paint() {
    const {snapshot,working}=device?.state()??{};
    const deviceMode=live(), records=deviceMode?snapshot?.rows:null;
    const label=root.querySelector('[data-break-source]');
    if(label) {
      label.dataset.breakSource=deviceMode?'firmware':'draft';
      label.textContent=deviceMode?(snapshot?.error||(!records?'Firmware · reading BREAK steps…':
        'Firmware · P'+String(snapshot.pat+1).padStart(2,'0')+(snapshot.playing?' · Stop to edit':working?' · checking…':''))):
        'Draft · steps and preview choices are not sent to the device.';
    }
    const limit=root.querySelector('[data-break-limit]');
    if(limit) limit.hidden=!deviceMode;
    for(const b of root.querySelectorAll('[data-break-loop],[data-break-rate]'))b.disabled=deviceMode;
    for(const b of root.querySelectorAll('[data-break-on],[data-break-step],[data-break-slice]'))
      b.disabled=deviceMode&&(!records||working||snapshot.playing);
    for (const b of root.querySelectorAll('[data-break-loop]')) b.setAttribute('aria-pressed', String(!deviceMode&&(state.loops[Number(b.dataset.breakLoop)] ?? '') === b.dataset.breakValue));
    for (const b of root.querySelectorAll('[data-break-rate]')) b.setAttribute('aria-pressed', String(!deviceMode&&b.dataset.breakRate === state.rate));
    for (const b of root.querySelectorAll('[data-break-on]')) { const i = Number(b.dataset.breakOn); b.setAttribute('aria-pressed', deviceMode&&!records?'mixed':String(deviceMode?!!records[i].on:!!state.steps?.[i])); b.classList.toggle('hit',deviceMode?!!records?.[i]?.on:!!state.steps?.[i]); }
    for (const b of root.querySelectorAll('[data-break-step]')) {
      const i = Number(b.dataset.breakStep), v = deviceMode ? records?.[i]?.slice : state.slices[i];
      b.textContent = v===undefined ? '…' : v ? String(v) : '–'; b.value = v===undefined?'':String(v); b.dataset.value = b.value;
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ' slice ' + (v===undefined?'unconfirmed':v ? v : 'auto')); b.title = i === selectedStep ? 'Tap again for the next slice' : 'Select step ' + (i + 1);
      b.setAttribute('aria-pressed', String(i === selectedStep)); b.classList.toggle('selected', i === selectedStep); b.classList.toggle('lit', !!v && !!state.steps?.[i]);
    }
    for (const b of root.querySelectorAll('[data-break-slice]')) b.setAttribute('aria-pressed', String(Number(b.dataset.breakSlice) === (deviceMode?records?.[selectedStep]?.slice:state.slices[selectedStep])));
  }
  async function show() {
    stop();
    const own = serial;
    root.textContent = 'Loading starting breaks…';
    try {
      const response = await fetch('../sample-contract.json');
      if (!response.ok) throw Error('Starting breaks unavailable.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (own !== serial) return;
      const editor = document.createElement('section'), previews = document.createElement('div');
      const panel = await mountBreakPanel(previews, {contractBytes: bytes, contractSha256: SAMPLE_CONTRACT_SHA256, initialSelectedIds: selectedIds,
        onSelection: summary => { if (own === serial) selectedIds = summary.selectedIds; }, ...createStartingBreakPreview()});
      if (own !== serial) {panel.destroy(); return;}
      picker = panel;
      const assets = JSON.parse(new TextDecoder().decode(bytes)).assets;
      editor.className = 'break-editor';
      const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
      const chip = (label, data, pressed) => { const b = el('button', 'break-chip', label); b.type = 'button'; Object.assign(b.dataset, data); b.setAttribute('aria-pressed', String(pressed)); return b; };
      // Loop A / Loop B: the firmware's two slots, chosen from the starting breaks.
      const loops = el('div', 'break-loops');
      for (const [index, name] of ['A', 'B'].entries()) {
        const row = el('div', 'break-loop-row'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Loop ' + name);
        row.append(el('span', 'break-row-label', name));
        row.append(chip('–', {breakLoop: index, breakValue: ''}, false));
        for (const a of assets) row.append(chip(startingBreakName(a.id,a.name), {breakLoop: index, breakValue: a.id}, false));
        loops.append(row);
      }
      const rateRow = el('div', 'break-loop-row break-rate'); rateRow.setAttribute('role', 'group'); rateRow.setAttribute('aria-label', 'Rate');
      for (const r of rates) rateRow.append(chip(r, {breakRate: r}, false));
      loops.append(rateRow);
      // ON row and SLICE row: one column per 16th, like the firmware footer (step number, slice or –).
      const grid = el('div', 'break-grid funkybeats-sequencer');
      const onRow = el('div', 'break-row'), sliceRow = el('div', 'break-row');
      onRow.append(el('span', 'break-row-label', 'ON')); sliceRow.append(el('span', 'break-row-label', 'SLICE'));
      for (let i = 0; i < 16; i++) {
        const on = el('button', 'seq-step break-on'); on.type = 'button'; on.dataset.breakOn = i; on.setAttribute('aria-label', 'Step ' + (i + 1));
        const slice = el('button', 'seq-step break-slice'); slice.type = 'button'; slice.dataset.breakStep = i;
        if (i % 4 === 0) { on.classList.add('beat'); slice.classList.add('beat'); }
        onRow.append(on); sliceRow.append(slice);
      }
      grid.append(onRow, sliceRow);
      // Slice pad: pick the selected step's slice (AUTO = the generator chooses), eight per page as on the firmware.
      const pad = el('div', 'break-pad'); pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'Slice');
      pad.append(chip('AUTO', {breakSlice: 0}, false));
      for (let n = 1; n <= 32; n++) pad.append(chip(String(n), {breakSlice: n}, false));
      const source=el('p','break-row-label');source.dataset.breakSource='';
      const limit=el('p','break-row-label','Loop names and rate are Draft only. Device slice numbers refer to its installed loop.');limit.dataset.breakLimit='';
      editor.append(source,limit,loops, grid, pad);
      root.replaceChildren(editor, previews); paint();
    } catch {
      if (own === serial) root.textContent = 'Starting breaks unavailable. Reopen Sequence to retry.';
    }
  }
  function edit(mutate) { const next = validateBreakSequence(state); mutate(next); onEdit(validateBreakSequence(next)); paint(); }
  function stepEdit(step, change) {
    if(live()){void device.edit(step,change);return;}
    edit(n=>{const r=change({on:n.steps[step]?1:0,slice:n.slices[step]});n.steps[step]=!!r.on;n.slices[step]=r.slice;});
  }
  function sliceEdit(step, operation){stepEdit(step,r=>({...r,slice:operation(r.slice)}));}
  root.addEventListener('click', e => {
    const b = e.target.closest?.('button'); if (!b || !root.contains(b) || b.disabled) return;
    if (b.dataset.breakLoop !== undefined) edit(n => { n.loops[Number(b.dataset.breakLoop)] = b.dataset.breakValue || null; });
    else if (b.dataset.breakRate !== undefined) edit(n => { n.rate = b.dataset.breakRate; });
    else if (b.dataset.breakOn !== undefined) stepEdit(Number(b.dataset.breakOn),r=>({...r,on:1-r.on}));
    else if (b.dataset.breakStep !== undefined) {
      // First tap selects the step for the slice pad; tapping the selected step again steps its slice (AUTO, 1..32, AUTO).
      const i = Number(b.dataset.breakStep);
      if (i !== selectedStep) { selectedStep = i; paint(); }
      else sliceEdit(i,v=>(v+1)%33);
    }
    else if (b.dataset.breakSlice !== undefined) sliceEdit(selectedStep,()=>Number(b.dataset.breakSlice));
  });
  root.addEventListener('keydown', e => {
    const b = e.target.closest?.('[data-break-step]'); if (!b || b.disabled || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault(); selectedStep = Number(b.dataset.breakStep);
    sliceEdit(selectedStep,v=>Math.max(0,Math.min(32,v+(e.key==='ArrowUp'?1:-1))));
  });
  // Double-tap a slice cell: back to AUTO (the firmware default).
  root.addEventListener('dblclick', e => { const b = e.target.closest?.('[data-break-step]'); if (b && !b.disabled) sliceEdit(Number(b.dataset.breakStep),()=>0); });
  return {show, stop, paint};
}
