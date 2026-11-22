# Actual f178 all-switchable 808 owner oracle

Extends the independent actual-C Clap proof to all switchable tracks 2–6. The wrapper includes the original unmodified drum808.c and links the original x0x_param.c. All source/header hashes equal the earlier f178 receipt. No mocks, browser, firmware build, device writes or uploads.

Actual factory Decay pairs: LT/LC 68/58; MT/MC 56/36; HT/HC 53/34; RS/CL 40/64; CP/MA 64/51. Tune defaults to 64 in every owner. Active source-screen controls Tune p1 and Decay p2 are K_POT and need separate local values for both owners in every pair. Tracks 2–5 Sound p3 is K_SWITCH; track 6 has fixed Maracas Attack p3, then Sound p4. Factory Attack is 32 and remains Maracas-owned.

All 46 engine parameter mappings record actual defaults under both selections, descriptor defaults, K_POT/K_FIXED/K_SWITCH/K_PAN kinds, pot slot and unit enum. All 35 K_POT controls (including engine Level and FX controls beyond the active source screen) passed edit owner 0 to 30, switch to owner 1 and read its untouched factory value, edit owner 1 to 80, then switch back and read 30/80 independently. Distortion uses its bounded values 2/4. Each case asserts all other track selectors stay unchanged.

Pan belongs to the track and stays shared within each owner pair (five tests). Accent identity 1:1:11:1 belongs to the kit, so no owner split: set raw 42 and switch every paired track; Accent stays 42. The three Tom selectors each use their own sw[track] despite a misleading shared-descriptor comment; there is no shared selector storage in actual set/get.

Actual SI accessor units: Tune is semitones; Tom/Conga Decay seconds; Rim/Clave and Clap/Maracas Decay percentages. The source-screen displayed field order does not change parameter identity. New owner IDs must preserve raw values rather than serializing these derived display units.
