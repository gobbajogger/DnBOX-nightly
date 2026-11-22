# Paired wet firmware Remote qualification

Nightly `b0af34316dad63815fadee07863318b5310f140e` used the exact selected 909 MIX Level catalog against the firmware host compiled from `1c46c6fc8d7a550b3308515a3415ea63d86e7486` and source tree `b6d101bb3515d9a5fb29ada6214a2c91b57caaa5`. The host digest is `18acaea9d1247d613daaea1f0910b173366b8d09e7e097947b0cf9197b110d9e`.

The actual non-test Workspace module used the checked-in DOM fixture and a stdio bridge into that host. Default source made zero MIDI requests. The selected catalog completed HELLO with count 1 and CRC `ecca5979`, OPEN, stored READ 75, KEEPALIVE, Apply 76, fresh READ 76, guarded Undo to 75, fresh READ 75, and CLOSE. The actual packed TouchOSC document stayed closed by default, stopped a changed checksum at HELLO, and passed the same native flow. Both new stock packages independently passed the exact emulated USB transaction.

The latest Chromium replay is NOT_RUN. The normal sandboxed Chromium launch failed an AF_UNIX socket with EPERM, including under the approved native execution path. The pinned headless shell retrieval returned HTTP 403. The Node fixture is software transport evidence. The earlier Chromium and branch artifact approval apply to their own exact firmware package hashes, and the repository defaults remain closed. The separate Pro normal WIDE timing failure blocks the final software pair.
