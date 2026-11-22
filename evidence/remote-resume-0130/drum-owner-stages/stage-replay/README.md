# Replay the 808 idle stage comparison

Run with Python 3, Git, a C compiler, and Node.js. The wrapper accepts absolute or working-directory-relative paths.

```sh
python3 /path/to/clap-stage-replay/run.py /path/to/trace.json /path/to/clean-f178-firmware /path/to/Remote
```

Generate a fresh input with the separate actual owner C oracle. Its `run.sh` takes the firmware checkout as its sole argument and writes `trace.json` in its own directory. To keep the original witness intact, copy that runner and its sibling `oracle.c` to a temporary directory before invoking the runner.

The stage wrapper requires a clean tracked firmware checkout at f1786ebec2616477163b62b029c7e77405a9c3de. It compares the required working files with the corresponding Git objects, extracts eight original C functions byte-for-byte, compiles a host adapter, and feeds it the validated 512 owner/parameter rows. It loads the specified Remote's projection module by file URL and emits one JSON receipt. Computation and generated files stay in a temporary directory. `--cc` and `--node` select executable paths.

The expected result is 512 exact readout cases, 768 curves, 25,600 coordinate pairs, and identical 1/16-pixel digests. The receipt identifies the Remote head and working module bytes, the input trace, the function bodies, and the actual compiler input. This checks idle curve geometry and readouts. The host adapter supplies the page's role routing and captures drawing calls.
