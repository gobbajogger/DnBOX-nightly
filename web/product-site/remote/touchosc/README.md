# TouchOSC DNR2 wire foundation

`dnr2-codec.lua` is a Lua 5.1-compatible byte codec for the same 51-byte DNR2 contract as the browser and pinned C host core. It does not send MIDI, create a lease, admit a device, or map controls.

TouchOSC's documented `sendMIDI` and `onReceiveMIDI` interfaces use lists of message bytes. Any later adapter must choose an explicit connection mask because omitting it broadcasts to configured connections. See [official TouchOSC scripting API](https://downloads.hexler.net/touchosc/scripting-api.html).

Remaining before R6 can pass: TouchOSC document/runtime integration, reviewed native catalog, complete incarnation and request correlation, lease lifecycle, typed float conversion, conflict handling, explicit user connect/apply actions, and a real TouchOSC-to-host test. Testing this codec with system Lua and the host C fixture is not a TouchOSC runtime or hardware test. Never emit messages merely by loading this file.
