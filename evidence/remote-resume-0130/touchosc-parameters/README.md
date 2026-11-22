# TouchOSC parameter companion

The [default layout](dnbox-parameters-unavailable.tosc) displays **Parameter binding unavailable** and has zero parameter buttons. The separate [archived host layout](dnbox-parameters-archived-host.tosc) is marked **Archived host · test only**. Its parameter-only controls select a source descriptor, show its role, raw range and stored value, and offer Read, Apply, guarded Undo and Close. It uses MIDI connection 1 and has no note or held-control bindings. The existing musical layout remains separate.

The generator reads all 326 explicit archived C descriptors from `246ea3718c6c72ba80bbd1aafcd5356f871c78c8`, checks their identities and recalculates catalog CRC `eec38bc1` over the source fields and labels. The original role ordering comes from the exact firmware engine, kit enums and selected bass banks. SysEx follows the same 51-byte DNR2 contract as the browser. The [TouchOSC script API](https://hexler.net/touchosc/manual/script-functions-global#script-functions-global-message-functions-midi-messages) defines the MIDI byte list and connection routing used by the callbacks.

The client checks the HELLO count and CRC before OPEN, then serializes requests using client, request, unit incarnation and lease epoch. READ snapshots accept source-supported descriptors at one revision. SET uses revision comparison and reads all stored values again after acknowledgement. Undo requires a fresh matching revision and value before it submits the inverse. Changes to related controls withhold scalar Undo. KEEPALIVE maintains the open lease during longer reads. CLOSE confirms release, and a lost reply clears editable state.

[Wire evidence](wire.json) and the [test log](test.log) come from executing the actual Lua extracted from the zipped layout against the real archived editor, project and engine over stdio. The first snapshot reads every descriptor in order. The archived startup exposes 294 controls and reports 32 unavailable descriptors in inactive banks. The Chicago Cutoff read/edit/Undo returned `32 → 33 → 32` with fresh readbacks. A real intervening source mutation withheld subsequent Undo. COMP changed Threshold and withheld scalar Undo. A changed CRC stopped before OPEN. The archived layout's HELLO got zero reply bytes from the compiled stock `f1786ebe` dispatcher. The default layout emitted zero MIDI frames. This is software evidence from the Lua callback boundary and the C host.

## Reproduce

Build the archived C pilot using its `tests/host/remote_actual_core_test.sh`. The stock firmware checkout needs its normal generated drum headers. Run from the Nightly root.

```sh
python3 tools/touchosc-parameters/pack.py --output /tmp/dnbox-parameters-unavailable.tosc
python3 tools/touchosc-parameters/pack.py --archived-host /path/to/archived-firmware --output /tmp/dnbox-parameters-archived-host.tosc
python3 tests/product-remote/touchosc-parameters-host.py /path/to/archived-firmware /path/to/stock-f1786ebe --json /tmp/touchosc-parameters-wire.json
```

## Production dependency

Integration owns the stock dispatcher and reviewed production catalog. Its producer needs to supply the versioned explicit descriptor IDs, roles, labels, units, legal ranges, count and CRC tied to the reviewed source. Its dispatcher needs to answer DNR2 HELLO, return a boot incarnation, bind OPEN to a lease epoch, return source-owned reads and compare revisions on writes. Physical, MIDI and project edits need to advance that same revision, including changes that restore a previous value. A `QUEUED` reply denotes a stored target. Full production parameter coverage and native TouchOSC application execution remain unverified.
