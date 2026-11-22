# Actual f178 Clap/Maracas owner oracle

`run.sh <clean-f178-source>` compiles unmodified `drum808.c` and `x0x_param.c` with a small assertion/report wrapper. `receipt.json` pins every source/header byte, compiler and result. `trace.json` contains all sixteen factory owner pot arrays, a fourteen-event read/edit/switch sequence and 512 nonmutating curve preview cases. No engine behavior is stubbed or reproduced in the wrapper.

Track 6 (parameter identity engine 1, bank 1, voice 6) has p2 `K_POT` Decay, p3 `K_FIXED` Maracas Attack, p4 Sound CLAP/MARAC. Actual init defaults are Clap Decay 64 and Maracas Decay 51; descriptor default 64 alone does not specify Maracas. Attack defaults to 32 and remains Maracas-owned under either selector.

Sequence PASS: select Clap, edit Decay 30; switch Maracas, read 51; edit Decay 80; switch Clap, read 30; switch Maracas, read 80. Editing Attack 45 while Clap is selected changes Maracas X1 only, then Maracas reads 45. Tom selectors are individually stored; changing LT to Conga leaves MT/HT unchanged, and changing MT/HT preserves LT. Low Tom Decay 31 and Low Conga Decay 77 survive switches; Mid/High Conga remain 36/34 and Maracas remains 80.

Both Decay UI units are percent (`raw*100/127`) from the actual SI accessor. Their target curves have different physical time laws; curve fields are milliseconds. Clap raw64: delay 27.9818611, rise tau 2.99999666, rise end 11.7360563, fall tau 38.4263573, window 650. Maracas raw51: rise tau 1.20000005, rise end 5.52620411, fall tau 7.2334919, window 350. Fixed Attack raw32 has SI target 5.52620411ms under either selection. Full curves include independent rise, fall and live level; fall is not a generic whole-envelope duration.

All 128 raw positions × both selector targets × Decay/Attack returned the correct owner (`CP+1=12`, `MA+1=11`) and left the entire engine struct byte-identical. This checks the read-only preview target path; it makes no live audio, browser, physical-device or full-gate claim. Root remains sole branch writer. No uploads were attempted.
