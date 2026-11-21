# Independent downloadable installer review

**Workflow score 9/10 at 061e9521.** Clicking Connect USB and denying its permission request displays “Allow MIDI in the site settings (address bar) and press Install again.” The Install control is disabled. The user can retry with Connect USB. This English recovery instruction is inherited from both the approved original and consolidated source. It also appears in the mounted installer at `web/product-site/install/index.html:2547`. The offline source is `web/x0x_installer.html:855`.

The test opened the candidate’s actual `docs/install/index.html` file without network access, used a 240 × 240 Chromium viewport and rejected the explicit Web MIDI promise. Page load requested no permission. One Connect USB click requested SysEx once. The install button stayed disabled and the write confirmation stayed closed. The regression assertion records exit 1 for the unavailable action. The release, Samples and Projects workflows each reached their real local files at both 390 × 844 and 240 × 240.

**Four default screenshot references approved.** Each fresh file and HTTP capture matched the proposed PNG bytes, including the SHA-256. The hashes of the individually approved originals match their blobs in c8e93872. The downloaded page has both Barlow fonts, a distinct Connect USB action and readable release, checksums and fallback links. No candidate page error, horizontal overflow or offscreen active control was detected across five viewports. The 240-pixel candidate fixes the consolidated page’s 30-pixel overflow.

| Viewport | Approved original screenshot | Consolidated screenshot | Candidate screenshot |
|---|---|---|---|
| 1440 × 900 | 1440 × 2379 | 1440 × 2423 | 1440 × 2401 |
| 1024 × 640 | 1024 × 2597 | 1024 × 2656 | 1024 × 2618 |
| 844 × 390 | 844 × 2628 | 844 × 2715 | 844 × 2650 |
| 390 × 844 | 390 × 3271 | 390 × 3384 | 390 × 3291 |
| 240 × 240 | No registered reference | 270 × 4607 | 240 × 4644 |

The latest public release is shown as 0.0.26 and the fallback as 0.0.25.1. The previous build’s withdrawal is visible. Release status opens `../new/index.html` and retains the detailed verified build ID. The standalone source preview offers no bundled package or model. Its install and stock write actions remain disabled.

Candidate commit `061e95213f20126f39b51e7828eecf2c2f274289`, consolidated commit `583f622961fc9975fac746592ce6c483073c4170`. Candidate compiled file SHA-256 `15888fcf9abfff37ef8f4c66d1d253babdd443db63bc228315ac500e0cf78774`. Chromium 151.0.7922.34. Individual image hashes, complete control geometry, runtime evidence, side-by-side images and reproduction scripts are included.
