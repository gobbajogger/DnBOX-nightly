// SPDX-License-Identifier: GPL-3.0-only
// Fixed values from the production Synth One INIT note path, shared by both owners.
import {renderSvg} from './glyph-render.mjs';
import {INIT} from './synth-one-init-data.mjs';

const percent = fraction => Math.round(100 * fraction) + '%';
const milliseconds = seconds => Math.round(1000 * seconds) + ' ms';

function traceSvg(points, name) {
  const path = points.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)).join(' ');
  return '<svg class="glyph readout" data-init-plot="'+name+'" viewBox="0 0 100 24" aria-hidden="true">'+
    '<path d="'+path+'" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>';
}

function valueCell(id, label, value, glyph) {
  return '<div class="encoder init-readout" data-init-field="'+id+'"><span>'+label+'</span>'+
    glyph+'<output aria-label="'+label+'">'+value+'</output></div>';
}

function envelopeRow(id, title, index) {
  const points = INIT.points.map((pair, sample) => [1 + sample * 98 / (INIT.points.length - 1), 22 - pair[index] * 20]);
  const [attack, decay, sustain, release] = INIT[id];
  const values = [milliseconds(attack), milliseconds(decay), percent(sustain), milliseconds(release)];
  const labels = ['Attack', 'Decay', 'Sustain', 'Release'];
  return '<section class="init-envelope" aria-label="'+title+'"><h3>'+title+'</h3>'+
    traceSvg(points, id)+'<dl>'+labels.map((label, i) =>
      '<div data-init-field="'+id+'-'+label.toLowerCase()+'"><dt>'+label+'</dt><dd>'+values[i]+'</dd></div>'
    ).join('')+'</dl></section>';
}

export function renderSynthOneInit(slot) {
  if (slot !== 0 && slot !== 1) throw new RangeError('Expected Bass A or Bass B');
  // The source oscillator is a rising ramp with a one-table-sample return at the seam.
  const wave = traceSvg([[1,22],[49.98,2],[50,22],[98.98,2],[99,22]], 'saw');
  const rows = [
    valueCell('wave', 'Oscillator 1', 'Saw', wave),
    valueCell('oscillator1Level', 'Oscillator level', percent(INIT.oscillator1Level), renderSvg('LEVEL', INIT.oscillator1Level, 'synth-one')),
    valueCell('balance', 'Oscillator mix', percent(INIT.balance), renderSvg('MIX', INIT.balance, 'synth-one')),
    valueCell('cutoffHz', 'Cutoff', INIT.cutoffHz+' Hz', renderSvg('CUTOFF', Math.log2(INIT.cutoffHz / 64) / Math.log2(22050 / 64), 'synth-one')),
    valueCell('resonance', 'Resonance', percent(INIT.resonance), renderSvg('RES', INIT.resonance, 'synth-one')),
    valueCell('filterDepth', 'Envelope depth', percent(INIT.filterDepth), renderSvg('LEVEL', INIT.filterDepth / 1.2, 'synth-one'))
  ];
  return '<section class="synth-one-init" data-synth-one-init="'+slot+'" aria-label="Synth One INIT source values">'+
    '<h3>INIT · source values</h3><div class="encoder-grid">'+rows.join('')+'</div>'+
    '<div class="init-envelopes">'+envelopeRow('amp','Amplitude envelope',0)+envelopeRow('filter','Filter envelope',1)+'</div></section>';
}
