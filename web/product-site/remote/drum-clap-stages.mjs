// SPDX-License-Identifier: GPL-3.0-only
// Idle portions of f1786ebe drum808_param_curve_preview and dv_cp_stage_page.
// Selection and owner-specific targets are inputs from the caller's Draft.
const float = Math.fround;
const width = 214;
const log99 = float(4.60517);
const clamp = value => Math.max(0, Math.min(1, value));
const rawPot = value => Number.isInteger(value) && value >= 0 && value <= 127;
const soundSwitch = value => value === 0 || value === 1;
const percent = raw => Math.floor((raw * 100 + 63) / 127) + '%';

function maracasAttack(raw) {
  const ratio = float(float(raw / 127) / float(.251968503));
  const riseTau = Math.max(float(.2),float(float(float(1.2) * ratio) * ratio));
  return {riseTau,riseEnd:float(riseTau * log99)};
}

function decayFall(raw, maracas) {
  const min = float(maracas ? .01 : .35);
  const max = float(maracas ? .3 : 2.8);
  const exponent = float(float(raw / 127) * float(Math.log2(float(max / min))));
  const ms = float(float(min * float(2 ** exponent)) * 1000);
  return maracas ? float(float(ms * float(.85)) / log99) : float(float(.0385) * ms);
}

function nominalLabel(ms) {
  // ui.c put_d1 rounds to tenths before choosing the displayed precision.
  const tenths = Math.floor(float(float(ms * 10) + .5));
  return '99% ' + (tenths < 100 ? (tenths / 10).toFixed(1) : Math.floor((tenths + 5) / 10)) + 'ms';
}

export function clapStageReadout(parameter, raw, selection) {
  if (!soundSwitch(selection) || !rawPot(raw)) return null;
  if (parameter === 3) {
    const {riseEnd} = maracasAttack(raw);
    return {
      owner:'MARACAS',display:Math.floor(float(riseEnd + .5)) + 'ms',
      stageLabel:'K6 A ' + percent(raw),nominalLabel:nominalLabel(riseEnd)
    };
  }
  if (parameter === 2) {
    const display = percent(raw);
    return {
      owner:selection === 1 ? 'MARACAS' : 'CLAP',display,
      stageLabel:'K8 D ' + display,
      nominalLabel:selection === 0 ? nominalLabel(float(decayFall(raw,false) * log99)) : null
    };
  }
  return null;
}

function rise(ms, tau) {
  return float(1 - float(Math.exp(float(-ms / tau))));
}

function curveLevel({delay,riseTau,riseEnd,fall}, ms) {
  const t = float(ms - delay);
  if (t < 0) return 0;
  if (t < riseEnd) return rise(t,riseTau);
  const peak = rise(riseEnd,riseTau);
  return float(peak * float(Math.exp(float(-float(t - riseEnd) / fall))));
}

function chart({owner,kind,title,windowMs,height}, curve, levelOf) {
  const points = [];
  const end = kind === 'attack' ? Math.min(windowMs,curve.riseEnd) : windowMs;
  let insertRiseKnot = kind === 'ad';
  const add = ms => points.push([
    float(13 + float(float(width * ms) / windowMs)) - 13,
    float(height - float(height * clamp(levelOf(ms))))
  ]);
  for (let i = 0; i <= 32; i++) {
    const ms = float(float(end * i) / 32);
    if (insertRiseKnot && curve.riseEnd < ms) {
      add(curve.riseEnd);
      insertRiseKnot = false;
    }
    add(ms);
  }
  const d = 'M'+points.map(([x,y])=>x.toFixed(3)+' '+y.toFixed(3)).join('L');
  return {owner,kind,title,windowMs,width,height,points,d};
}

export function clapStageCharts(selection, rawAttack, rawDecay) {
  if (!soundSwitch(selection) || !rawPot(rawAttack) || !rawPot(rawDecay)) return [];
  const attack = maracasAttack(rawAttack);
  if (selection === 1) {
    const curve = {...attack,delay:0,fall:decayFall(rawDecay,true)};
    return [chart({owner:'MARACAS',kind:'ad',title:'MARACAS AD',windowMs:350,height:48},curve,
      ms=>curveLevel(curve,ms))];
  }
  const delay = float(1234 / float(44.1));
  const logRatio = float(Math.log(float(1 - float(.007530084766))));
  const riseTau = float(-1 / float(float(44.1) * logRatio));
  const riseEnd = float(riseTau * float(3.912023));
  const curve = {delay,riseTau,riseEnd,fall:decayFall(rawDecay,false)};
  return [
    chart({owner:'MARACAS',kind:'attack',title:'MARACAS ATTACK',windowMs:90,height:20},attack,
      ms=>rise(ms,attack.riseTau)),
    chart({owner:'CLAP',kind:'decay',title:'CLAP DECAY',windowMs:650,height:20},curve,
      ms=>curveLevel(curve,float(float(delay + riseEnd) + ms)))
  ];
}
