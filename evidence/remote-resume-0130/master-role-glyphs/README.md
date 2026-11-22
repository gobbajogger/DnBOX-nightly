# Replay the Master and Reverb glyph comparison

Run from the Remote checkout with Python 3, Git, a C compiler, and Node.js.

```sh
python3 .output/mix-shared-role-review/master-role-drift/run.py ../remote-input-recovery/firmware .
```

The two arguments name the firmware checkout and the Remote checkout under test. They may be absolute paths. The firmware must be at `f1786ebec2616477163b62b029c7e77405a9c3de`. The runner verifies the required local source files against their Git objects and confirms all five C drawing bodies in `oracle.c` are byte-for-byte copies of the pinned functions or branches. It compiles the oracle and writes its raw results in temporary storage. The comparator loads the specified Remote modules and prints a JSON receipt with source hashes, tested module hashes, and results.

Expected result is 384 exact normalized amount drawings across 128 positions each for Master Drive, Reverb Decay, and Master Pump. The compressor proof exhausts all 128 Threshold values, 10 Ratio choices, and 128 Blend values. Its 163,840 transfer states each match all 37 ordinates and the fixed reference stroke. The focused Node regression covers every amount position and all thresholds and ratios at four exact Blend values. The exhaustive replay runs independently of the Node test suite.

The normalized curves are stock parameter schematics and reflect the supplied control inputs. The COMP card uses actual Draft detail values. Native Mix does not expose the applied Threshold, Ratio, or Blend, so its existing generic shape remains separate. This proof covers idle geometry and fixed guides using shared stroke rendering. Browser pixels and live gain reduction are outside its claims.
