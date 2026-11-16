> Design reference only. Rules: `RULES.md` (v2) at the repo root. Status: `docs/lanes/*.md`.

# Owner baseline 18:36: "first good starting point, ~50% of the way"
The owner shared OWNER-BASELINE-1836.pdf (24 pages, Remote R19/R20 vector proposal). It is the new baseline for the Remote: keep its single panel system, big labelled glyphs (909 TUNE/ATTACK/DECAY/P.DPTH [label must become a readable word per UI-DEFECT-TESTS-SPEC check 4]/PITCH/ACCENT, Miami numbered sections), real Mix faders, clean Patterns/Song/Projects/Connect pages, and its density (no dead space).
Remaining gaps to close (Orchestrator review, about 5.5-6/10):
1. The JUNO panel uses old Juno params. Replace it with the real SuperJ6 map (2 layers with WAVE each, separate PWM width/enable, continuous SUB, 3 LFO rates Hz/tempo), named SuperJ6.
2. Chicago Sound: remove the raw parameter-name list on the right (it breaks the no-raw-lists rule and duplicates the glyphs).
3. WAVE shows % (0%, 33%). It must name a discrete wave (SAW/SQR/...) or a blend with its glyph morphing.
4. The roll keeps a Step 01 inspector panel and a Pan/zoom tool. Fix (RULES 20): no tool modes at all (no Select/Draw/Erase row); every edit, zoom and pan is a gesture; no selected-note panel; one lane of thin per-step sliders (velocity/chance/pitch/pan) under the roll, switched by tapping the lane label.
5. No playhead. No bar-vs-beat line hierarchy.
6. The phone pages (21-23) use a different, chunkier font/button style. They must match the desktop type scale and components.
7. The new improved glyphs from the 17:00 batch must stay. Unify everything on the 909/808 R22 radius and type scale.
8. Port this same system to the website and firmware in one batch.
