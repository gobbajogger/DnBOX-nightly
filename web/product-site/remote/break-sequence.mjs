// SPDX-License-Identifier: GPL-3.0-only
import {STARTING_BREAK_NAMES, startingBreakName} from '../starting-break-names.mjs';
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
  let serial = 0, picker = null, selectedIds, selectedStep = 0;
  function stop() {
    serial++;
    picker?.destroy();
    picker = null;
  }
  const live = () => device?.mode() === 'firmware';
  const query = selector => root.querySelector(selector);
  const buttons = selector => root.querySelectorAll(selector);
  const currentCell = i => query(`[data-break-step="${i}"]`);
  const eligible = ({snapshot, working} = {}) => !live() || !!snapshot?.rows && !working && !snapshot.playing;
  function paint() {
    const current = device?.state();
    const {snapshot, working} = current ?? {};
    const deviceMode = live(), records = deviceMode ? snapshot?.rows : null;
    const source = query('[data-break-source]');
    if (!source) return;
    source.dataset.breakSource = deviceMode ? 'firmware' : 'draft';
    source.textContent = deviceMode ? (snapshot?.error || (!records ? 'Device · reading BREAK steps…' :
      'Device · P' + String(snapshot.pat + 1).padStart(2, '0') + (snapshot.playing ? ' · Stop to edit' : working ? ' · checking…' : ''))) :
      'Draft · edits stay in this browser.';
    query('[data-break-limit]').hidden = !deviceMode;
    for (const row of buttons('[data-break-slot]')) {
      const i = Number(row.dataset.breakSlot), id = state.loops[i];
      row.querySelector('[data-break-loop-name]').textContent = deviceMode ? 'Not reported by device' : id ? startingBreakName(id) : 'No loop selected';
      const summary = row.querySelector('summary');
      summary.setAttribute('aria-disabled', String(deviceMode));
      if (deviceMode) row.open = false;
    }
    for (const b of buttons('[data-break-loop],[data-break-rate]')) b.disabled = deviceMode;
    for (const b of buttons('[data-break-on],[data-break-slice]')) b.disabled = !eligible(current);
    for (const b of buttons('[data-break-loop]')) b.setAttribute('aria-pressed', String(!deviceMode && (state.loops[Number(b.dataset.breakLoop)] ?? '') === b.dataset.breakValue));
    for (const b of buttons('[data-break-rate]')) b.setAttribute('aria-pressed', String(!deviceMode && b.dataset.breakRate === state.rate));
    for (const b of buttons('[data-break-on]')) {
      const i = Number(b.dataset.breakOn), on = deviceMode ? records?.[i]?.on : state.steps?.[i];
      b.setAttribute('aria-pressed', on === undefined ? 'mixed' : String(!!on));
      b.classList.toggle('hit', !!on);
    }
    for (const b of buttons('[data-break-step]')) {
      const i = Number(b.dataset.breakStep), record = deviceMode ? records?.[i] : {slice: state.slices[i], on: state.steps?.[i]};
      const v = record?.slice;
      b.querySelector('.break-cell-value').textContent = v === undefined ? '…' : v ? String(v) : '–';
      b.value = v === undefined ? '' : String(v);
      b.dataset.value = b.value;
      b.setAttribute('aria-label', 'Select step ' + (i + 1) + ', ' + (v === undefined ? 'slice unconfirmed' : v ? 'slice ' + v : 'Auto'));
      b.setAttribute('aria-pressed', String(i === selectedStep));
      b.classList.toggle('selected', i === selectedStep);
      b.classList.toggle('lit', !!v && !!record?.on);
    }
    const selectedSlice = deviceMode ? records?.[selectedStep]?.slice : state.slices[selectedStep];
    query('[data-break-target]').textContent = 'Step ' + (selectedStep + 1);
    query('[data-break-open-slices]').textContent = selectedSlice === undefined ? 'Pick slice' : selectedSlice ? 'Slice ' + selectedSlice : 'Pick slice';
    for (const b of buttons('[data-break-slice]')) b.setAttribute('aria-pressed', String(Number(b.dataset.breakSlice) === selectedSlice));
  }
  async function show() {
    stop();
    const own = serial;
    const editor = document.createElement('section'), previews = document.createElement('div');
    editor.className = 'break-editor';
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    const chip = (label, data) => { const b = el('button', 'break-chip', label); b.type = 'button'; Object.assign(b.dataset, data); b.setAttribute('aria-pressed', 'false'); return b; };
    const source = el('p', 'break-row-label'); source.dataset.breakSource = '';
    const limit = el('p', 'break-row-label', 'Loop choice and rate are Draft only. Device slice numbers use the installed Loop A.'); limit.dataset.breakLimit = '';
    const loops = el('div', 'break-loops');
    for (const [index, name] of ['A', 'B'].entries()) {
      const row = el('details', 'break-loop'); row.dataset.breakSlot = index;
      const summary = el('summary', 'break-chip');
      const loopName = el('strong'); loopName.dataset.breakLoopName = '';
      summary.append(el('span', 'break-row-label', 'Loop ' + name), loopName);
      const choices = el('div', 'break-loop-row');
      choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'Draft Loop ' + name);
      choices.append(chip('None', {breakLoop: index, breakValue: ''}));
      for (const [id, label] of Object.entries(STARTING_BREAK_NAMES)) choices.append(chip(label, {breakLoop: index, breakValue: id}));
      row.append(summary, choices); loops.append(row);
    }
    const rateRow = el('div', 'break-loop-row break-rate');
    rateRow.setAttribute('role', 'group'); rateRow.setAttribute('aria-label', 'Draft rate');
    rateRow.append(el('span', 'break-row-label', 'Rate'));
    for (const r of rates) rateRow.append(chip(r, {breakRate: r}));
    // One horizontally scrollable 16-step grid keeps slice and trigger in sync.
    const grid = el('div', 'break-grid funkybeats-sequencer');
    grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'BREAK steps 1–16, scroll for later steps');
    const onRow = el('div', 'break-row'), sliceRow = el('div', 'break-row');
    for (let i = 0; i < 16; i++) {
      const on = el('button', 'seq-step break-on'); on.type = 'button'; on.dataset.breakOn = i;
      on.setAttribute('aria-label', 'Step ' + (i + 1) + ' on');
      const cell = el('button', 'seq-step break-slice'); cell.type = 'button'; cell.dataset.breakStep = i;
      cell.append(el('span', 'break-step-number', String(i + 1)), el('strong', 'break-cell-value'));
      if (i % 4 === 0) { on.classList.add('beat'); cell.classList.add('beat'); }
      onRow.append(on); sliceRow.append(cell);
    }
    grid.append(sliceRow, onRow);
    const help = el('p', 'break-row-label break-help', 'Select a step, then pick a slice or Auto. Lower row toggles on/off.');
    help.append(el('span', 'break-scroll-hint', ' Swipe for later steps.'));
    const bar = el('div', 'break-actions');
    const target = el('strong'); target.dataset.breakTarget = '';
    const details = el('details', 'break-picker');
    const summary = el('summary', 'break-chip'); summary.dataset.breakOpenSlices = '';
    const pad = el('div', 'break-pad'); pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'Loop A slice numbers');
    for (let n = 1; n <= 32; n++) pad.append(chip(String(n), {breakSlice: n}));
    details.append(summary, pad);
    const auto = chip('Auto', {breakSlice: 0}); auto.title = 'Let the generator choose a slice';
    bar.append(target, details, auto);
    editor.append(source, loops, limit, help, grid, bar, rateRow);
    root.replaceChildren(editor, previews);
    paint();
    // Optional audio previews must not block step edits (including offline drafts).
    try {
      const response = await fetch('../sample-contract.json');
      if (!response.ok) throw Error('Starting breaks unavailable');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (own !== serial) return;
      const panel = await mountBreakPanel(previews, {contractBytes: bytes, contractSha256: SAMPLE_CONTRACT_SHA256, initialSelectedIds: selectedIds,
        onSelection: value => { if (own === serial) selectedIds = value.selectedIds; }, ...createStartingBreakPreview()});
      if (own !== serial) { panel.destroy(); return; }
      picker = panel;
    } catch {
      if (own === serial) previews.textContent = 'Starting break audio previews unavailable.';
    }
  }
  function edit(mutate) {
    const next = validateBreakSequence(state);
    mutate(next);
    onEdit(validateBreakSequence(next));
    paint();
  }
  function stepEdit(step, change) {
    if (!eligible(device?.state())) return;
    if (live()) { void device.edit(step, change); return; }
    edit(n => {
      const r = change({on: n.steps[step] ? 1 : 0, slice: n.slices[step]});
      n.steps[step] = !!r.on;
      n.slices[step] = r.slice;
    });
  }
  function selectStep(i) { selectedStep = i; paint(); }
  root.addEventListener('click', e => {
    const summary = e.target.closest?.('.break-loop summary');
    if (summary && live()) { e.preventDefault(); return; }
    const b = e.target.closest?.('button');
    if (!b || !root.contains(b) || b.disabled) return;
    if (b.dataset.breakLoop !== undefined) {
      if (live()) return;
      edit(n => { n.loops[Number(b.dataset.breakLoop)] = b.dataset.breakValue || null; });
      const menu = b.closest('details');
      menu.open = false;
      menu.querySelector('summary').focus({preventScroll: true});
    } else if (b.dataset.breakRate !== undefined) {
      if (!live()) edit(n => { n.rate = b.dataset.breakRate; });
    } else if (b.dataset.breakOn !== undefined) {
      stepEdit(Number(b.dataset.breakOn), r => ({...r, on: 1-r.on}));
    } else if (b.dataset.breakStep !== undefined) {
      selectStep(Number(b.dataset.breakStep)); // selecting, double-tapping and key navigation are read-only
    } else if (b.dataset.breakSlice !== undefined) {
      const value = Number(b.dataset.breakSlice);
      if (value) {
        const menu = b.closest('details');
        menu.open = false;
        menu.querySelector('summary').focus({preventScroll: true});
      }
      stepEdit(selectedStep, r => ({...r, slice: value}));
    }
  });
  root.addEventListener('keydown', e => {
    const b = e.target.closest?.('[data-break-step]');
    if (!b || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = Number(b.dataset.breakStep);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? 15 :
      Math.max(0, Math.min(15, i + (e.key === 'ArrowLeft' ? -1 : 1)));
    selectStep(next);
    currentCell(next)?.focus({preventScroll: true});
    currentCell(next)?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  });
  return {show, stop, paint};
}
