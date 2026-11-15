# Connection implementation contract

These are separate routes, not interchangeable API names. Nothing here requests a permission, pairs a device, or qualifies firmware.

* Web MIDI exposes system input/output ports. Request SysEx only from an explicit Connect action over HTTPS, explain its purpose, and handle refusal without another prompt. It does not itself pair BLE devices. [W3C Web MIDI](https://www.w3.org/TR/webmidi/)
* Direct Web Bluetooth is GATT access. Chrome documents a secure context and a user gesture; its supported desktop/Android route is not universal. Do not enable browser flags or infer that installing a PWA adds an API. [Chrome Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth)
* Chrome on iPhone/iPad does not connect websites directly to BLE. Do not promise that the Android/desktop flow works there. [Chrome iOS help](https://support.google.com/chrome/answer/6362090?co=GENIE.Platform%3DiOS&hl=en)
* Android's native `openBluetoothDevice()` makes a BLE MIDI device available to other native MIDI clients while kept open. Whether a particular browser backend exposes it must be tested, not assumed. [Android MidiManager](https://developer.android.com/reference/android/media/midi/MidiManager)
* CoreMIDI has a native BLE route and documented reconnect behavior for pairing-capable devices. This is a possible legitimate host/bridge architecture, not evidence of a Web MIDI implementation in an iOS browser. [Apple CoreMIDI](https://developer.apple.com/documentation/coremidi/midi-bluetooth)

The current firmware already has BLE MIDI timestamp and fragmented SysEx handling. Its remote namespace still needs explicit routing and transport/session isolation. Existing APC/inquiry acceptance is not DNR2 admission. Do not advertise remote Bluetooth today. OS-paired BLE appearing as a system MIDI port is a possibility requiring actual platform/firmware verification, not a proven product route.

## Usable flow

1. Connect opens a concise choice: system MIDI port, or direct Bluetooth only when both API and reviewed firmware route permit it. Native-host setup is linked only if an actual supported host exists.
2. System MIDI requests SysEx, lists actual inputs/outputs, preserves the selected pair, and probes only that pair. Never broadcast a write or guess a device from a name. Direct BLE uses a service-scoped user chooser and source-backed BLE MIDI framing.
3. Verify the complete boot incarnation, exact protocol/catalog, transport and caller lease. A link being connected is not a matching firmware endpoint or confirmed state.
4. Read coherent current state before admitting edits. Show stored target, local draft, pending and confirmed distinctly. Pause writes on revision conflict, transport replacement, suspension or disconnect; retain the local draft.
5. Reconnect never replays an uncertain mutation automatically. Obtain a fresh endpoint/session/snapshot, compare the retained draft and require a purposeful apply decision. Owner-scoped close must finish audio cleanup or remain visibly unconfirmed; cleanup cannot affect physical/MIDI/other clients.
6. Verify same-port and cross-transport clients, partial packets, realtime interleave, rapid disconnect/reconnect, lost acknowledgments, device restart and lease expiry. Real USB and BLE on target hardware plus representative desktop/Android/iOS-host routes remain required; pure API tests are not that proof.

The feature probe is deliberately pure and conservative. `canRequest` concerns a permission route; `canControl` remains false until a real endpoint/session verification layer supplies authority. No UA sniffing or name-based Bluetooth assertion.
