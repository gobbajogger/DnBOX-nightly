// SPDX-License-Identifier: GPL-3.0-only
// A responsive Draft projection of the captured 909/808 voice, in source bank order.
import {drumDisplay} from './drum-format.mjs';

const escape = value => String(value).replace(/[&<>"']/g,
  c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const cache = new WeakMap();

// Each retained R17 function schematic occupies a 32 × 18 unit source cell.
// The viewport translates that cell into place. The captured paths and their
// original transform, stroke, colour and line joins stay intact.
function glyphsFor(screen) {
  if (cache.has(screen)) return cache.get(screen);
  const svg = new DOMParser().parseFromString(screen.body_svg, 'image/svg+xml');
  const xml = new XMLSerializer();
  const glyphs = new Map();
  for (const control of svg.querySelectorAll('[data-drum-control]')) {
    const glyph = control.querySelector('[data-glyph-semantic]');
    if (!glyph) throw Error('Missing source drum glyph');
    const matrix = glyph.cloneNode(true).transform.baseVal.consolidate()?.matrix;
    if (!matrix || matrix.b || matrix.c || matrix.a <= 0 || matrix.d <= 0)
      throw Error('Invalid source drum transform');
    const viewBox = [matrix.e - matrix.a, matrix.f - matrix.d, 34 * matrix.a, 20 * matrix.d].join(' ');
    glyphs.set(control.getAttribute('data-source-control'),
      '<svg class="drum-source-glyph" aria-hidden="true" viewBox="'+viewBox+'">'+xml.serializeToString(glyph)+'</svg>');
  }
  cache.set(screen, glyphs);
  return glyphs;
}

export function drumValueText(control, value) {
  return drumDisplay(control.identity, value) ?? 'Raw '+value;
}

// Keep the source frame intact. Its active column centres, summary right edges
// and outlined text baselines also locate the editable readouts.
export function mountDrumReadouts(scene, screen, getSpec) {
  const source = scene.querySelector('svg');
  const outputs = document.createElement('div');
  outputs.className = 'drum-frame-values';
  outputs.setAttribute('aria-hidden', 'true');
  const view = source.viewBox.baseVal;
  for (const button of scene.querySelectorAll('.source-hit')) {
    const index = Number(button.dataset.paramOccurrence);
    const control = screen.controls[index];
    const entry = source.querySelector(`[data-source-control="${control.identity}"]`);
    const glyph = entry.querySelector('[data-glyph-semantic]');
    // Read cloned transforms. consolidate() mutates the original transform list.
    const glyphMatrix = glyph.cloneNode(false).transform.baseVal.consolidate().matrix;
    const digit = entry.lastElementChild.firstElementChild;
    const digitMatrix = digit.cloneNode(false).transform.baseVal.consolidate().matrix;
    // Single-control banks also place their active value to the right of the glyph.
    const inline = digitMatrix.e >= glyphMatrix.e + 32 * glyphMatrix.a;
    const x = inline ? control.bounds[2] : glyphMatrix.e + 16 * glyphMatrix.a;
    const output = document.createElement('span');
    output.dataset.paramValue = button.dataset.param;
    output.className = inline ? 'inline-value' : 'stacked-value';
    output.style.left = (x - view.x) / view.width * 100 + '%';
    output.style.top = (digitMatrix.f - view.y) / view.height * 100 + '%';
    output.textContent = drumValueText(control, getSpec(button.dataset.param,index).value);
    outputs.append(output);
    const label = control.context.name === 'P.Dpth' ? 'Pitch depth' : control.context.name;
    button.dataset.drumLabel = label;
    button.setAttribute('aria-label', label + ', ' + output.textContent + ', local draft');
  }
  scene.append(outputs);
}

export function renderDrumStrip(screen, getSpec, glyphs = glyphsFor(screen)) {
  const units = screen.controls.map((control, index) => {
    const id = screen.path+'|'+control.identity;
    const spec = getSpec(id, String(index));
    const glyph = glyphs.get(control.identity);
    if (!glyph) throw Error('Unknown source drum control '+control.identity);
    const label = control.context.name === 'P.Dpth' ? 'Pitch depth' : control.context.name;
    const display = drumValueText(control, spec?.value ?? Number(control.context.raw));
    const role = control.markers['visual-role'] === 'active glyph/value control' ? 'active' : 'summary';
    const disabled = spec ? '' : ' disabled';
    const target = escape(id);
    return '<section data-drum-sound-unit data-drum-role="'+role+'">'+
      '<button type="button" class="drum-strip-control" data-param="'+target+'" data-param-occurrence="'+index+'"'+disabled+'>'+
      '<span data-drum-label>'+escape(label)+'</span><span class="drum-strip-readout">'+glyph+
      '<output data-drum-value data-param-value="'+target+'">'+escape(display)+'</output></span></button>'+
      '<div class="drum-step-buttons"><button type="button" data-drum-decrement="'+target+'" aria-label="Decrease '+escape(label)+'"'+disabled+'>−</button>'+
      '<button type="button" data-drum-increment="'+target+'" aria-label="Increase '+escape(label)+'"'+disabled+'>+</button></div></section>';
  });
  return '<div role="group" data-drum-sound-strip aria-label="Drum sound controls" style="--drum-columns:'+units.length+'">'+units.join('')+'</div>';
}
