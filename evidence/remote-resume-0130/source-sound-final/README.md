# Chicago and Miami source-matched glyphs

The patch starts from Remote `3c5a9142b5013ffc6d5178825a0e4fc10692be4e` and uses the Sound matrix of firmware `f1786ebec2616477163b62b029c7e77405a9c3de`. The existing matched Website/FWUI matrix contains Home, FX, Mix, Song and Global states. It supplies no Chicago or Miami Sound pixel pair.

| Family | Changed source roles | Existing roles |
| --- | --- | --- |
| Chicago | Glide, Cutoff, Peak, filter ENV, Bite, Gnaw, ENV/GATE, Level, ARP On/Mode/Range/Speed and FX Type | WAVE keeps its existing source projection, four VCA ADSR controls share the existing envelope view, and the two FX Edit pots remain neutral amount controls. |
| Miami | Carrier and XMOD Level, Sub, carrier Pitch, Glide, XMOD Tune and Depth, Cutoff, Crush, Wobble amount and Rate, Output and Stereo | The three source-tested waves retain their current drawings. The remaining original mapping records operate beneath the visible macros. |

The four coupled drawings receive their actual same-owner values. Chicago Peak reads Cutoff and filter ENV reads Cutoff and Peak. The three arpeggiator detail glyphs use their owner's On state for dimming. Miami Wobble and Rate use their selected shape, and Rate also uses Wobble amount. The source layout's stationary Wobble preview does not expose transport phase. A dependency that's absent from the admitted state leaves its dependent drawing empty.

The native compiler fixture records 9,636 idle drawing call lists for 26 roles over every legal raw value and three representative input sets. Both browser owners resolve the same role by their own bank/control identity. The fixture compares the actual line, rectangle and guide calls before the proportional R22 projection. SVG and canvas share the resulting source paths and filled shapes.

The actual Miami program conversion also supplies 384 semitone, XMOD and clock readouts. Chicago/Miami retain the stored raw words. Both Miami owners passed numeric edit, reopen and Undo on Pitch, XMOD Tune and Rate. The Chicago Peak binding followed Cutoff raw 32 → 80 → 32 through edit, reopen and Undo. XMOD Tune uses the f178 bipolar-percent display for the stored raw value.

The focused source fixture and all nine existing app event regressions passed. A dedicated test verifies SVG and canvas pixel changes for a changed Peak dependency. Live filter-envelope activity and Miami modulation phase remain outside the idle fixture.

Refresh the Chicago and Miami Sound families for both owners at the four existing sizes, owner `04-chicago` and `05-miami`, and the four registered `remote-sound-*` defaults. The hidden Sequence glyph card does not affect rendered pixels.

```sh
python3 tools/probe-source-sound-glyphs.py /path/to/f178-firmware tests/product-remote/fixtures/source-sound-glyphs-f178.json --module web/product-site/remote/source-sound-glyphs.mjs
node --test tests/product-remote/source-sound-glyphs.test.mjs
node tests/product-workspace/app-sound-regression.mjs
```
