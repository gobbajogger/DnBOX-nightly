# Original SuperJ6 LFO formatter and bank qualification

The authenticated AU extension ZIP is24,716,801bytes, SHA256`abe2f2e089306770489fb30c8870f608dc2f2e0804541f624337523679638a28`. Its9,282,464-byte ARM64 executable has SHA256`a5243e50bda6bd44f463c6e63ea3137802142f55f3c1ea25a5a6e046acba81a1`; Info.plist identifies version0.999.8/build9. Original installers/executable bytes stay outside Git.

`tools/probe-superj6-original-lfo.py` executes original ARM64 instructions using Unicorn2.1.4. It does not execute the portable reconstruction. The original18-case literal formatter at`0x100283aa8` returns Swift small strings. The adjacent original numerical getter at`0x100283c34` returns the exact frequency factors64,48,32,24,16,12,8,6,4,3,2,1.5,1,.5,.3333,.25,.1667,.125. The original generic UI formatter dispatch table maps fields88/96/100 to`0x10001f628`, which passes the inverted binary32 position to`0x100021054`, then calls that literal formatter. The probe executes each of these three original dispatch slices across179normalized words (537field/sample executions), stopping after the original formatter returns and before the Swift append/UI bridge. No Apple UI is simulated or claimed.

Native outputs, from fastest to slowest:

`1/64`, `1/64 D`, `1/32`, `1/32 D`, `1/16`, `1/16 D`, `1/8`, `1/8 D`, `1/4`, `1/4 D`, `1/2`, `1/2 D`, `1 Bar`, `2 Bars`, `3 Bars`, `4 Bars`, `6 Bars`, `8 Bars`.

The179unique normalized words comprise all128positions (position/127 rounded to binary32), each of the17native transition starts with both immediate binary32 neighbors, endpoints and exactly0.5. Transitions are found by binary-searching the original executed output, not a reconstructed selection formula. The small source-bound oracle is`tests/product-workspace/fixtures/superj6-build9-lfo.json` and includes code/input hashes and original register outputs/addresses.

The new regression failed before the product change: expected native`8 Bars`, actual`32 beats` (`literal-red.tap`). The corrected product and original-input tests passed12/12 (`literal-green.tap`), including all179samples on all3LFOs for both owners (1,074Remote comparisons). Seven application Sound regression cases also passed (`app-sound-green.log`). Existing Hz laws, normalized values, field identities and timing factors are unchanged. Original`D` spelling is preserved literally; it is not replaced by inferred conventional note-duration names.

The recovered J6presets ZIP is451,262bytes, SHA256`ab702e00b4cc425c9406b9b2b44e68ba0f40e1125d591fcaa422cc6a8c6272b8`. Actual original-bank tests verify12bank files,640program identities, all5,860present words among the13mapped fields,25programs storing all13fields, absent-field semantics, both owner fixtures, byte-identical unchanged copies, independent owner edits and snapshot recovery. This replaces the earlier synthetic two-program bank limitation for this tested source slice. It does not claim all original instrument controls are admitted natively.

Reproduce with the private original ZIP and a Python environment containing Unicorn2.1.4:

```sh
python3 tools/probe-superj6-original-lfo.py /private/SuperJ6-AU-original-extension.private.zip /tmp/lfo.json
cmp /tmp/lfo.json tests/product-workspace/fixtures/superj6-build9-lfo.json
DNBOX_SUPERJ6_ARCHIVE=/private/J6presets.zip node --test tests/product-workspace/superj6.test.mjs tests/product-workspace/superj6-banks.test.mjs
node tests/product-workspace/app-sound-regression.mjs
```

The updated original-bank browser journey passed at1440×900,844×390,390×844 and1024×640 (`original-banks-browser.log`). `DNBOX_SUPERJ6_ARCHIVE` explicitly pointed to the authenticated original ZIP: the desktop journey loaded the actual26-program GarageBand Guide bank, not the two-program fallback. It exercised original-byte copies, both owners, independent program edits, Undo/Redo, copy reimport, digest reattachment, Draft recovery and MIDI0. Each viewport verified the new literal`2 Bars` readout and source-backed Sound controls. The ordinary bundled Chromium151 ran with its normal sandbox. No additional full-page capture sweep was created. This receipt claims original instruction/formatter execution, source/application regressions and these actual browser file journeys, not full Apple UI execution. Qualification is software-only; no hardware is required or attempted.
