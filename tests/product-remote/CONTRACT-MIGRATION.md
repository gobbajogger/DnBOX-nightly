# Remote browser contract migration (owner #206)

The DNR2 fixture and historical AudioWorklet tests below are retained as acceptance
oracles. They are not silently waived or automatically counted as passes on #206.
Run the original programs from the matching source/runtime when evaluating old behavior;
run the named Web MIDI programs against the exact qualified native firmware for changes
to #206. A positive product assertion may not be replaced by demonstrating that the old
selector is absent.

| Retained oracle | Current honest equivalence and remaining checks |
| --- | --- |
| `tests/product-remote/firmware-browser.py` | Historical copied DNR2 C scalar/float/Apply/lease fixture. #206 intentionally exposes only DNR3 over Web MIDI and has no Apply mode. The exact Web MIDI runtime covers actual HELLO/OPEN/WATCH/CLOSE, no mock core replies, independent voice and Record. Do not claim DNR2 mode or apply equivalence. |
| `tests/product-remote/firmware-e2e-browser.py` | Historical visible-control discovery and per-action mutation/independent reflection. Current exact suites cover 160 native cues, both 64-step drum kits, both bass step editors, Chicago, Mix and BREAK scopes, Motion and transport/VOICE. Global route/pointer/width coverage and unsupported song, bass pitch/gate/chance, and native chord handling are not implied. |
| `tests/product-remote/local-miami/browser.py` | Historical actual AudioWorklet MIAMI Carrier scalar read/edit/Undo/restore. Live MIAMI Carrier motion point is a distinct persistence target; its exact SET/readback must not substitute for preset scalar Sound or Undo. |
| `tests/product-remote/native-mix-browser.py` | Historical 29-control AudioWorklet read/edit/Undo plus failure and source isolation at all three sizes. Real DNR3 now proves all 33 Mix, Master and FX controls with independent readback, accessible output and confirmed Undo at 844×390. Three-size parity, stale error/in-flight casing, and equivalent alternate Tape gesture behavior remain open. |
| `tests/product-remote/native-sound-browser.py` | Historical audio owner/Chicago 40 plus max-11, native Undo16, stale request, busy retry, scoped reads, cancellation, saved Draft bytes and native display. Current exact DNR3 proves Chicago 40, actual engine admission, guarded writes, external reflection and wrong-bank rejection. Firmware labels/values also match the rendered controls at 844×390. Browser-initiated 16-deep guarded inverses now read back in both slots and refuse outside changes; they are not whole-project Undo. Both remaining viewports, full Draft-byte parity and asynchronous lifecycle remain open. |

No connection or data fixture is permission to edit a physical instrument. The current
runtime adapter feeds the exact local native WASM handler; it does not author DNR3
replies. The historical contracts remain in the tree even when an intentional UX
change makes their historical connection selectors unavailable on the new page.
