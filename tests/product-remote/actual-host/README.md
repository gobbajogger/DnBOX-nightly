# Actual-app host consumer diagnostics

This is source/stdio test evidence, not native admission, MIDI/browser transport,
audio-applied equivalence or execution in the TouchOSC application/VM. The exact
firmware source is pinned in `HOST-PIN.json`; the production `REVIEWED_BUNDLE`
remains null and the exported host catalog remains `admitted:false`,
`nativeAdmitted:false`, `testOnly:true`. No HELD controls are advertised.

The browser diagnostic first proves that the ordinary unadmitted catalog refuses
OPEN/SET. Its write cases then use an explicit transient, stdin-only test binding
and genuine HELLO/OPEN lease negotiation, never seeded client fields. This local
harness binding is not a production-selectable global and is not written back to
the catalog. The shipped browser client bytes are verified before use.

From a checkout containing the pinned firmware commit, materialize a separate
source tree using local Git; do not edit a shared producer checkout:

```
mkdir -p "$HOST_WORK"
git -C "$FIRMWARE_REPO" archive 1ab15cf2f684ed2aa72a82e44ce82ab506ddd0f7 | tar -x -C "$HOST_WORK"
(cd "$HOST_WORK" && X0X_TEST_JOBS=1 sh tests/run_tests.sh remote-actual-core)
export DNBOX_ACTUAL_HOST_BINARY="$HOST_WORK/build/host/remote-actual-core/test"
node tests/product-remote/actual-host/browser-consumer.mjs
python3 tests/product-remote/actual-host/lua-consumer.py
node --test tests/product-remote/actual-host/transport-timeout.test.mjs
```

Use an absolute `HOST_WORK` path. No binary is bundled or downloaded by these
runners. Missing binary or Lua library is NOT_RUN, not successful qualification.
The stdin transport has a 15-second exchange bound and child cleanup; timeout
unit cases cover silent and early-exit children. Lua uses the system Lua5.4 library,
not a claim about TouchOSC's Lua5.1/custom VM.

Browser coverage: all326 descriptors; exact32 inactive Miami descriptors in the
boot Chicago context; checked scalar SET accepted as QUEUED with one revision;
actual stored-target READ; real external pref_set conflict/refresh; close;
identical cached SET retry after external mutation forces refresh. The firmware
producer's72 inactive reads span both bank passes and are a different count.

Lua coverage: QUEUED accepted only for scalar SET, not READ; own SET requires
exactly one revision increment; a newer READ invalidates other cached controls;
actual external mutation during cached retry fails closed. The controller's
callback reports `queued:true` for stored-target acceptance, not audio application.
The old Lua source rejected actual-host QUEUED SET; removing either new revision
or cache guard makes the corresponding negative regression fail.
