// SPDX-License-Identifier: GPL-3.0-only
// DnBOX f1786ebe drum808.c: k_m_sw and k_m_cp route Tune and Decay to
// track_sound. Each track owns its switch and each sound has k_spec_head pots.
const componentPrefix = voice => 'current-state-and-reference/808-voice-0' + voice + '.svg|1:1:' + voice + ':';
export const clapSoundId = componentPrefix(6) + '4';
export const clapSelection = draft => draft.get(clapSoundId) ?? 0;

// Only these two owner-dependent pots are present in the current Draft frames.
// Level is unmounted, Clap Attack stays fixed to MARAC, and Accent is shared.
const tracks = [
 {voice:2, track:'LT', selector:3, owners:['TOM','CONGA'], decay:[68,58]},
 {voice:3, track:'MT', selector:3, owners:['TOM','CONGA'], decay:[56,36]},
 {voice:4, track:'HT', selector:3, owners:['TOM','CONGA'], decay:[53,34]},
 {voice:5, track:'RS', selector:3, owners:['RIM','CLAVE'], decay:[40,64]},
 {voice:6, track:'CP', selector:4, owners:['CLAP','MARAC'], decay:[64,51]},
];
const ownerFields = new Map();
const ownerSelectors = new Map();
for (const {voice, track, selector, owners, decay} of tracks) {
 const prefix = componentPrefix(voice), soundId = prefix + selector;
 const components = [];
 for (const [parameter, label, defaults] of [[1,'Tune',[64,64]],[2,'Decay',decay]]) {
  const componentId = prefix + parameter;
  const specs = owners.map((owner, index) => Object.freeze({
   id: 'source-drum/808/' + track + '/' + owner + '|1:1:' + voice + ':' + parameter,
   componentId, label, context: '808 / ' + (voice <= 4 ? track + ' / ' : '') + owner,
   value: defaults[index], min: 0, max: 127, step: 1,
  }));
  ownerFields.set(componentId, {soundId, specs});
  components.push(componentId);
 }
 ownerSelectors.set(soundId, Object.freeze(components));
}
export const drum808OwnerSpecs = Object.freeze([...ownerFields.values()].flatMap(field => field.specs));
export const drum808OwnerComponents = id => ownerSelectors.get(id) ?? [];
export const isDrum808OwnerControl = id => ownerFields.has(id) || ownerSelectors.has(id);
export function drum808OwnerSpec(id, draft) {
 const field = ownerFields.get(id);
 if (field) return field.specs[draft.get(field.soundId) ?? 0];
}

export function normalizeDrum808OwnerEdits(entries) {
 const saved = new Map(entries.map(({id, value}) => [id, value]));
 return entries.map(entry => {
  const owner = drum808OwnerSpec(entry.id, saved);
  if (!owner) return entry;
  // A legacy Draft only recorded one raw value, so use its track's saved selection.
  // An explicit value for that owner plus the legacy scalar is ambiguous.
  if (saved.has(owner.id)) throw Error('Local draft: duplicate 808 sound owner parameter');
  return {id: owner.id, value: entry.value};
 });
}
