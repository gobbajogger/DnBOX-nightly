# Exact fixed-point control-smoother follow-up

Apply to the guarded typed native donor with the previous 16-word ring
fold already in place. For the no-internal-sequencer profile, each control
with constant target contributes the same rounded c1*target throughout a
render call. Precompute the rounded product once. Skip updates only if
the next computed binary32 value is already word-identical to current.
Other profiles, which can change target during a render, keep the old path.

Strict Elite/Pro native smoke with the same held note and Remote cutoff
edit both now has 0 raw late and 0 xruns. Worst measured halves are
11,418 / 11,412 microseconds (still 509/503 above the 10,909 project
target). Elite/Pro XIP free 4,456/4,468 B and POOL margin 512 B.
This is a targeted played-note USB smoke with the historical donor
and complete owner-generation guard, not a release timing pass.

One offset-0 load diagnostic used the exact 922-event fixture plus the
same early USB selection request. It rendered 648 halves, zero late or
xruns, 10,929/11,118 us. But the hardware-shaped fixture changed active
bank A back to 1 (Miami) before the loaded run, as the real PARAM_GET at
2,372 ms and unsupported S1 cutoff GET at 2,477 ms confirmed. This is
not a loaded Synth One result and is not a substitute for the full gate.
