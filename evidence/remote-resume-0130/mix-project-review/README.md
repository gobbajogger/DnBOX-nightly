# Remote Mix, arrangement and files review

This review uses the published Remote source `5ee28037ebc55bad744f0c7d1f69eab22bb49f6a`. The local test export `a160e7d56732e3111702e567a81b54353a721327` has the same Git tree `721461c82f1d0580878fc117940563dbe2a36374`. The 304-file build used the pinned emulator and website firmware renderer. The registered viewports are 1440×900, 1024×640, 844×390 and 390×844.

## Owner baseline

The unified owner review retains the full-size side-by-side images. This table uses those images and their unmasked RGB threshold. The values describe the captured states, which sometimes have different active parts, values or menu states. Owner acceptance at 2% remains open for each pair below.

| Owner page | Pixels over threshold | Observed comparison |
|---|---:|---|
| 6 · Mix | 7.07% | All five real Draft faders have abbreviated part labels and Sound routes. They are shorter than the drawing. The drawing's per-part Peak, Mute and Solo controls have no admitted Remote owner. |
| 7 · Master | 5.97% | Four macros and twelve More controls are present in Draft. The pinned emulator supplies measured stereo peak and wave, plus its four admitted macros. Native More and gain reduction remain unavailable. |
| 8 · FX | 9.28% | Four Reverb and four Delay controls, ten sends, delay type and Tape Wear appear in Draft. The reference sketches larger amber glyphs. Draft TAPE is round and the Wear bar reacts to edits. Measured signal-driven reel rotation needs an active/phase observation from the engine. |
| 9 · Patterns | 6.75% | The 32-pad grid and selected-part actions are present. Firmware cue-at-wrap, copy, paste, clear and chain actions need an authoritative pattern transport. |
| 10 · Song | 8.18% | Authored local rows hold five numbered choices, five On switches and repeats. The depicted default rows and confirmed keyboard sequencing or persistence are open. |
| 12 · Projects | 7.51% | Three working cards and the local session actions are present, with smaller labels, shallow panels and unused desktop space at this revision. Backup and range actions lead to the companion tools. Stock project read and MIDI render still need their providers. |
| 13 · Connect / Review | 6.12% / 23.86% | Separate connection result and local Review match the available workflows. The drawing combines them and includes actual instrument Read/Compare/Apply controls. Stock transaction coverage is open. |
| 16 · Mix landscape | 12.03% | The Parts and Master sections are reachable. The drawing's per-part meters and mute/solo operations remain unavailable. |
| 19 · Patterns landscape | 16.40% | Both scopes and all 32 selected-part choices are present. The native pattern operations from page 9 are open. |
| 20 · Projects landscape | 10.93% | Three cards appear side by side with reachable Samples and Manual links. The disconnected export-availability link remains an explicit boundary. |
| 23 · Mix portrait | 12.91% | Five faders and the separate Master section remain in a scrollable view. The draw differences include component scale and absent native per-part operations. |

## Firmware and website

The website screen reference replay matched all 17 selected 240×240 RGB frames at firmware `61827a714ca7b240c01a55ed347b5fd7b847c7c2`. The exact runtime artifact and decoded frame hashes are in [website-firmware-frame-hashes.json](website-firmware-frame-hashes.json). The captures include both FX views, all five Mix views, both Song views and Global. The website's Firmware screen reference renders the native canvas. Its Mix shows a source-owned gain reduction region, and Global groups MIDI + Clock, Bluetooth, Audio, Keys + Screen, Project and System. Remote currently has no Settings destination. The open actions require identified firmware owners and matching transport fields.

The visual reference for shipping 0.0.26 uses source `94197fc839b00aff47b98ca02f3c6396e4a6eabf`, tree `72d28fbc741244d18fa3d18495da16ab0fcb1d24`. Its actual TAPE renderer uses `engine_tape_active()` and advances the two spokes every 80 ms while tape is active. Remote uses the shared G050 drawing, keeps reel scale isotropic on the canvas and animates the stored Wear value. Its current browser mounting path supplies no source phase. The 56 passing focused tests include circular geometry, digital threshold, distinct phase drawings, range, persistence and guarded native-provider Undo. See [family-units.tap](family-units.tap).

## Browser result and software scope

The first actual Mix journey reached the 1440×900 FX view, then failed finding the Delay type field after Redo. The earlier TAPE → DIGI edit, Draft export, Review and Undo had reached their assertions. The retained [first attempt](initial-mix-browser-failure.log.gz) contains the original error and assertion target. Browser retries and full qualification results belong to their own source identities.

Physical USB and Bluetooth, the actual TouchOSC client, connected project execution and zero unbound stock controls remain unverified. The stock host's editor identity result, closed emulator evidence and original-file Draft chains have separate coverage.

## Projects desktop repair

The final isolated CSS candidate raised the three desktop cards from roughly 78 to 185 px and the headings from 12 to 26 px. The 1440×900 initial viewport contains all 13 actions at 44 px or larger. Pointer hit tests found zero blocked enabled actions at all four viewports after ordinary scrolling. The 1024×640, 844×390 and 390×844 screens are pixel-identical before and after. At 1440×900 the owner page-12 tolerant difference fell from 7.5150% to 6.4185%. Exact RGB differences fell from 491,901 to 254,412 pixels. The earlier prototype increased the tolerant difference to 8.7389%. Its result is retained in the receipt. The remaining difference includes provider-gated actions and shared header geometry. [Four-size measurements](projects-before-after.json) · [Source and image hashes](receipt.json).

## Shipping reel witness

A portable host build of the exact 0.0.26 source captured 19 native-sized frames. The selected reel rectangle has zero changed RGB pixels between two idle frames and ten changed pixels across each pair of adjacent playing frames. The SMK board-defined host build failed to link the old source's board-only callbacks. The portable replay therefore uses host panel captions and exercises host input and DSP. The current-pair Elite evidence is separate. [Script](release-026-routes.x0x) · [Host result](release-026-host-routes.txt) · [Frame hashes](receipt.json).

## Serialized Delay type rerun

The two original Mix fixture functions passed at 1440×900 on the exact published product assets when Chromium ran in a dedicated slot. The trace records the center hits and focus of the Undo and Redo buttons and the corresponding Delay type values. There were zero page errors and zero attempts to open MIDI. The first failure is retained. This rerun covers that transition, and the separate full FunkyBeats journey covers the stock-free Mix and Projects scenarios. [Exact run trace](delay-redo-retry.json) · [Replay wrapper](delay-redo-diagnostic.py).

The supplementary panels compare the native-size Remote view with the shipping portable host, current paired Elite host and website firmware reference for the analogous state. Each pane preserves its native pixels. The Settings comparison uses the three native Global states because Remote exposes no Settings screen. Dynamic source values are identified in the captions and measurements. [Panel and input frame hashes](native-comparison-hashes.json).

The owner subsequently made qualification software-only. Physical USB/BLE, keyboard, native TouchOSC app testing and device writes are outside scope and do not hold completion. The remaining stock endpoint/catalog and producer coverage findings are software dependencies.
