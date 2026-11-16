# Working

Verified consolidated source remains firmware `e742be7bd0d01323c899de6e156f40b85ee451db` and nightly `9165adb92fcdaab756c4e59e3d4a8ee22437ca5a`. No v2 lane is merged into those targets. Latest observed integration drafts are firmware `fef9b94d93fb2fc495d18e5da960197e786caf26` and nightly `4c9db78a617971588ae56b03faefd224c93bfbca`; these are not delivered sources.

| Owner | Current outcome and bounded evidence |
|---|---|
| sound | Source-faithful original engines, full factory/control/FX comparisons and stock-device fit remain unfinished. The 7972-byte Synth One pre-FX owner excludes tuning, sustain bookkeeping, full FX and stack. |
| fwui | Reviewed SONG status-only correction95bb is composed in fef9; genuine screen/glyph/text fixtures have bounded acceptance, not complete screen Review10/10 or F1–F7 PASS. |
| integ | Exact fef9 Elite/Pro default native builds pass: XIP free3268/3276B, RAM1096B, pool margin836B above8192 reserve. This is not extra PADCAL, hardware, or a full Local result. Original/derived protocol differential and default managed sanitizer pass in bounded scope; native endpoint still unadmitted. |
| remote | Actual-source scalar stdin fixture exercises unchanged BrowserClient and typed Lua guards; no native endpoint/HELD admission or complete R1–R7 qualification. |
| web | Current4c9 contains reviewed browser/TouchOSC sources,241 product paths and bounded actual browser observations. Complete Local, viewport review and Pages publication remain open. |
| test-and-merge | Independently verified596 firmware and4c9 nightly containment/limits, and scoped source/host/native evidence. Current fef9 native resource check passes; no full Local or Review10/10. |

Integration owns shared runtime/build interfaces and these queues. Detailed source pins, evidence exclusions and failures remain in each lane file. Older queue pins are preserved in Git history, not current status or instruction. Each lane retains its existing draft PR.
