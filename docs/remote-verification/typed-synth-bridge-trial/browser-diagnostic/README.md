# DnBOX Remote #206 browser-to-host proof

Use the staged exact #206 b77e49a0a2d288c9dc3a1e93191857377a9406ae site at
`../remote206-audit/web/web/product-site`, overlay from
`../remote206-typed/remote` (canonical typed-synth-206.patch), and verified
native C host executable `../remote206-typed/typed-cable`. No MIDI hardware.

`fixture.mjs` binds only 127.0.0.1:9224. The only exact-mode HTML change is
including a Web MIDI loopback prelude at the navigator boundary. Production
JS and CSS are otherwise byte-for-byte; firmware reply bytes come exclusively
from the compiled C process. `dom.mjs` uses actual pointer and keyboard events
and checks rendered fields and the independent decoded wire journal. Its JS
evaluation observes DOM only, except for a repeat diagnostic import if exact
startup failed. No original service, repo, branch, USB or internet writes.

The provisioned cloud Chrome does not share the runner's loopback: it reported
ERR_CONNECTION_REFUSED. No modern executable was present in the runner.
The local QtChromium diagnostic uses experimental top-level-await and (with
LEGACY_SYNTAX=1 only) 10 narrow JS operator substitutions, one JSON import
syntax replacement, and explicit missing runtime APIs. Results from this
path are diagnostic, not exact production compatibility/e2e evidence.

Run `CHROMIUM_BIN=/path/to/modern/chromium bash run.sh` locally with Node 22+
and exact prerequisites. Leave LEGACY_SYNTAX unset for exact application
modules. On this runner diagnostic only: `LEGACY_SYNTAX=1 bash run.sh`.

Observed diagnostic: Connected after 20 actual host requests, then Bass A
showed precisely 13 writable Synth One rows and Cutoff 115. The old hidden
renderer did not complete pointer/keyboard confirmation; therefore no
browser edit/restore or Bass B DOM claim. Real host wire writes to both
engines are separately covered by the previous typed wire receipt.
The diagnostic executable at run time hashed
1d074bb7f447bb0ed37334a304bab879306bbd6fc15ed5978dae4ea50ba90029;
set CABLE_BIN to an independently pinned equivalent if the symlink changes.
