# Build History phone follow-up

[Integration’s exact phone receipt](https://github.com/gobbajogger/DnBOX-nightly/blob/59ec3121b008fd853c8fdf6665c22ca3bf98606a/evidence/integ-resume/native-remote-c7b026cf/build-history-phone-capture.json) identified the 390px hidden Sounds link and inconsistent archived release copy. This change is based on `78375df89d6628d439d6464fcbfdb043c285f75d`.

The scoped CSS keeps the canonical Sounds link visible on History. Both corrected archive summaries link to the published 0.0.26 release. The release and prior nightly candidate have the same `94197fc8` source and model package hashes. The old 0.0.25.1 fallback remains `79280e76`. The withdrawn `600b3b45` record remains distinct. All 198 embedded original `pre` payloads are byte-identical to baseline and the catalog was untouched.

Sandboxed Chromium repeated the baseline and candidate at 390×844 and 844×390 in both light and dark preferences, DPR 1, touch enabled, reduced motion, en-US and UTC. Each candidate kept all eight navigation links in the viewport, the 198 records, release search and reset, and no page errors. The existing product History test includes the shared destination and archived release links.

```text
[before]
{"mode": "before", "viewport": [390, 844], "scheme": "light", "sounds_visible": false, "conflicting_archive": true, "rows": 198, "page_errors": []}
{"mode": "before", "viewport": [390, 844], "scheme": "dark", "sounds_visible": false, "conflicting_archive": true, "rows": 198, "page_errors": []}
{"mode": "before", "viewport": [844, 390], "scheme": "light", "sounds_visible": true, "conflicting_archive": true, "rows": 198, "page_errors": []}
{"mode": "before", "viewport": [844, 390], "scheme": "dark", "sounds_visible": true, "conflicting_archive": true, "rows": 198, "page_errors": []}

[after]
{"mode": "after", "viewport": [390, 844], "scheme": "light", "sounds_visible": true, "conflicting_archive": false, "rows": 198, "page_errors": []}
{"mode": "after", "viewport": [390, 844], "scheme": "dark", "sounds_visible": true, "conflicting_archive": false, "rows": 198, "page_errors": []}
{"mode": "after", "viewport": [844, 390], "scheme": "light", "sounds_visible": true, "conflicting_archive": false, "rows": 198, "page_errors": []}
{"mode": "after", "viewport": [844, 390], "scheme": "dark", "sounds_visible": true, "conflicting_archive": false, "rows": 198, "page_errors": []}

[build]
{"files":270,"output":"/tmp/dnbox-web-78375/.output/product-site","emulator":true,"published":false,"firmwareWrites":false,"catalogMutations":[]}

[history]
Chromium 151.0.7922.34
{"case": "product-embedded-1440x900", "pass": true, "total": 198, "matches": ["release-v0.0.26-94197fc8", "main-versions-0"], "restored": 198, "page_errors": [], "history_requests": []}
{"case": "product-embedded-390x844", "pass": true, "total": 198, "matches": ["release-v0.0.26-94197fc8", "main-versions-0"], "restored": 198, "page_errors": [], "history_requests": []}
{"case": "product-embedded-844x390", "pass": true, "total": 198, "matches": ["release-v0.0.26-94197fc8", "main-versions-0"], "restored": 198, "page_errors": [], "history_requests": []}
{"checks": 3, "passed": 3, "failed": 0}

[content]
✔ complete source manifest builds byte-identical local output without deployment (139.335577ms)
✔ both manual families, 197 historical records and the new release survive source integration (37.618376ms)
✔ source admission remains explicit, no original-format or remote capability fabricated (0.75957ms)
✔ R16 composed source names exact workspace and contains safe local editing endpoints only (0.384437ms)
✔ R21 captured presentation and v6 port identity remain explicit without admission (2.763457ms)
✔ entry availability distinguishes drafts, separate browser audio and unavailable device providers (9.739566ms)
✔ historical manual never presents a descriptive retirement name as a hardware label (0.422655ms)
✔ retired build branches link to the archived source and evidence commits (1.449145ms)
✔ all nineteen musician routes and both legacy entry redirects survive the build (67.79963ms)
✔ starting-breaks publication navigation uses existing live destinations without unrelated route rollout (0.571748ms)
✔ release notices identify the two tested models, the withdrawal and the fallback (3.063127ms)
✔ published release records, backup workflows and history bookmarks survive site composition (1.361443ms)
✔ Loopy clip mode names DnBOX when returning from the host grid (2.553512ms)
✔ the project guide opens the musician workflow and keeps protocol details optional (0.756846ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 358.411668

```
