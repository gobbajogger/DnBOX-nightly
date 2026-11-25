# Native smoke targets for the DNR3 donor

The exact recovered adf3eee source patch (SHA256 in replay-local.sh) was
applied without fuzz to the 73749f55d17a firmware checkout in isolation.
JieLi 20260730.1 and the existing AC79 SDK were used. No device writes,
publication or branch merge. Build commands only enabled X0X_REMOTE_DNR3=1
above the donor's standard profile, not the newer all-controls experiment.

Elite and Pro both linked and packaged. Free XIP was 76 and 88 bytes,
respectively; pool margin over reserve 512 bytes on each. This is not
headroom for assuming the remaining control exports fit. Host transport
and these isolated native links are separate tests: no Chromium against
the paired native/wasm image, heavy timing gate, or physical USB was run.
Packages are intentionally not included or released.

Repro: copy the full firmware checkout, apply the same exact source
patch without fuzz. Point JIELI_TOOLCHAIN and AC79_SDK at the authorized
inputs; set X0X_REMOTE_DNR3=1 and X0X_GEN_CACHE to a writable location.
Run MODEL=elite sh build.sh and MODEL=pro sh build.sh.
