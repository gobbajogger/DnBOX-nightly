# Paired firmware LCD evidence

The exact [`f1786ebe` source](https://github.com/gobbajogger/DnBOX/commit/f1786ebec2616477163b62b029c7e77405a9c3de) produced 1,700 verified 240×240 host captures. The ordinary walk covered 1,538 screens and 44,082 text masks with zero geometry findings. All 19,643 control presence checks and 249 glyph pixel checks passed. The walker observed 107 of 127 inventoried painters. Its SMK-37 configuration enables Synth One and pad calibration and disables the Miami Free Play hardware pad shortcut that the linked packages enable.

Both fresh `_900` development packages ran in `fm1-live` 0.5.1 at 360 MHz with timed LCD and JIT. All six selected Elite and Pro RGB pairs matched, covering startup, ordinary view, 909 PARA, two FX pages and GLOBE. The linked Reverb image matched all 57,600 host RGB565 pixels. Delay matched all 52,800 body pixels, with nine differences in the header. The 909 PARA body differed at 16 pixels and the linked frame showed the startup notice in the header. The strict interpreter reached its 240-second deadline on the first Elite attempt. The initial timed replay lacked an optional final PPM output directory. A clean timed replay returned all twelve selected PNGs byte for byte. [Package and build manifest](../firmware/manifest.json)

## Cross-surface findings

- The exact paired FX screens show both the status and editable values for Delay Feedback 35% and Reverb Decay 62%. The text geometry check does not detect these semantic duplicates.
- The paired source uses circular TAPE reels and an 8 px panel radius. Shipping firmware 0.0.26 at `94197fc8` draws the reels with rounded rectangles. Both implementations advance the reel spokes every 80 ms while the engine reports active tape. The observed paired Delay page shows 49% wear. [Shipping source](https://github.com/gobbajogger/DnBOX/blob/94197fc839b00aff47b98ca02f3c6396e4a6eabf/firmware/src/app/ui.c)
- Twelve of 15 named website reference states from firmware `61827a71` matched the paired host's decoded RGB hashes. These include Home, both FX pages, five Mix pages, two Song pages, the picked fader and the delay knob. Three Global states differed. The comparisons establish the named states and retain each firmware source identity. [Website frame hashes](../mix-project-review/website-firmware-frame-hashes.json)

The paired outputs are development captures. Shipping 0.0.26 qualification, an independent whole-design acceptance and physical keyboard testing remain separate.

## Evidence archive

`lane-remote-resume-0130-f1786ebec261-firmware-240x240.zip` contains 1,737 entries and is 15,626,620 bytes. The full SHA-256, sample names and RGB hashes are in the [manifest](manifest.json). The archive is staged in the recovery workspace. Project Sources delivery remains unconfirmed after the project renderer failed and both browser control paths became unavailable.
