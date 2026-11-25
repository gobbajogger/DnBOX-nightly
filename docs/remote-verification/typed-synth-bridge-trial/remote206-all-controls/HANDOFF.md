# Both synths: full Remote presentation source (pre-fit/QA)

Source staging only. Exact #206 starting Git object
`b77e49a0a2d288c9dc3a1e93191857377a9406ae`, tree
`aa2595ff6bcec286d3f75623812ced7b82ee1359`. Apply prior
`../remote206-typed/typed-synth-206.patch`, then
`both-engine-full-remote.patch`. **Do not also apply**
`full-s1-second-layer.patch`; the new patch supersedes it.
The directly staged modules are in `remote/`.

- Both synths use a 256-ID capability scan with the exact 112/113 contract
  (bank 2/3, part 0/1, low seven ID bits) and live address/marker,
  descriptor-domain, owner, patch and readback checks. Signed and named
  displays don't affect the raw wire encoding. Keyed by owner and stable ID;
  no assumed active presets, no cross-synth aliases, no fake typed fallback.
- Synth One source identities: 145 stable editor/data IDs from pinned
  S1Parameter.h and original source callback register, not 145 on-screen
  knobs. Reserved/inactive/internal and live wheel gestures are not counted
  as patch controls. Separate extensions 240–246 and 255, never presented
  as original AU IDs. Reset 245 is one momentary CAS SET 0→1, OK only, and
  independently confirms idle 0 and actual same-owner A4/SCALE defaults
  before displaying success. No action button if readback providers missing.
- SuperJ6 metadata identities cover 217 known source IDs (reserved 207 omitted)
  from pinned `public_control_catalog.json`; authenticated groups use
  `SJ6-OSC-ENV-INDEX.md`, `SUPERJ6-LFO-INDEX.md`, and
  `SUPERJ6-SEQ-INDEX.md` within composed-controls source-join. This is not
  a claimed playable count. The archived 31-row crosswalk expressly does not
  certify an exact 64-ID list. Controls not admitted by firmware never render.
  Bank3 DnBOX extensions: 240 Start Snap and 241 Sequence Lock are binary
  sequence options (not step cells); 242 Scale uses the negotiated detent names
  or raw values; 243 supplies Soft/Medium/Hard on its exact 0..2 domain.
  Original Fixed MIDI Velocity at 205 remains independent.
- Actual connected Synth One / SuperJ6 Sequence view replaces the generic
  note roll with a typed 16-step table of only independently reported position
  fields and exact ARP/SEQ options. Synth One pitch labels map -12…12 only
  for negotiated exact max24. 909/808, BREAK and ordinary Chicago/Miami
  retain current routes. Synth One has pitch/octave/enable; SuperJ6 has
  pitch/enable. Missing fields remain uneditable; no synthesized steps.
- Sound groups show independent oscillator, filter, envelope, LFO, modulation,
  effect, voice/tuning, and output/compressor roles without collapsing unrelated
  IDs. DnBOX mix/master stays separate. Protocol choices display only when
  complete and unique; other values use native detents.
- Legacy endpoints keep the existing legacy Sound surface; unsupported typed
  transport is not silently downgraded. Switch owner, reconnect, stale readback,
  read-only roles, and ACK≠commit stay independently guarded.

No runtime, browser, fit, prepackaging, hardware or release check was run for
this staging point following the user's build-all-before-checking order.
Exact modern Chromium executable remains missing behind the /usr/bin wrapper.
