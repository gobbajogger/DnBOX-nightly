# Three pinned Sound glyphs

The patch applies to `efb4c070a81d486be7d6111c540da23cff59bcbd`. It uses the existing R22 control containers and the exact idle drawing paths in firmware `f1786ebec2616477163b62b029c7e77405a9c3de`.

| Control | Exact role | Compared positions |
| --- | --- | ---: |
| 909 Snare Tone `1:0:1:1` | `dv_glyph` `DG_NTAIL`. The actual DSP supplies unrounded noise decay in ms. The shape uses a 24 ms hold on the native 2-second axis. | 128 |
| 808 Snare Tone `1:1:1:1` | `dv_glyph` `DG_SHELLS`. The two peaks follow the source sine/cosine balance. | 128 |
| BREAK Pitch `source-sound/BREAK/-1\|1:3:0:1:-1` | `control_glyph` center guide, edge ticks and marker follow the native 0–24 input and integer q127 projection. | 25 |

The C replay extracts the two idle `dv_glyph` branches and the `control_glyph` marker branch, then records their drawing calls. It compiles the exact 909 DSP and checked generated drum sample header. The Drum SVG subtrees each contain one original path. The editable view replaces its entire path data and retains its container, transform and kit stroke. Open Original continues to render its own captured source frame. The exact BREAK source identity uses the same renderer in the SVG and live canvas.

All 16 focused Node cases and nine application source-event cases passed. The two drum coordinate comparisons use a 0.0002 source-unit tolerance. Every legal BREAK marker position agrees with the extracted C rectangles. The three matched glyphs use the source drawing laws. The separate 17:00 artwork approval remains open.

The 12 affected initial Sound captures are `drum909-voice01`, `drum808-voice01` and `breaks` at 1440×900, 390×844, 844×390 and 1024×640. Owner 11 Slices/Generator use Sequence, owner 18 selects the 909 bass drum and the 32 registered states use the default Chicago owner. The drum override also applies when an interactive Drums journey selects Snare.

Run from a checkout with the patch and the exact firmware source and generated sample header:

```sh
python3 glyph-f178-oracle.py "<firmware-source-root>" "<directory-containing-x0x_drum_samples.h>" "<evidence-directory>"
DNBOX_NATIVE_GLYPH_ROWS="<evidence-directory>/glyph-native.txt" node --test tests/product-remote/source-glyph-roles.test.mjs
```

The native result contains 281 rows. Its SHA-256 is `62f8db3c917acf3aa4a96cd895d0ad3ed905148b92ec2ff985513b70ca9a7717`.
