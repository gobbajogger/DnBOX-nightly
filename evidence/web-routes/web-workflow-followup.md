# Web workflow and shared timing follow-up

Baseline `39cc665d0704ac960992b5c1d7f4d1ff665fbf7f`. No previous visual captures were regenerated.

- Direct-file Samples and Installer brand links opened directories. Their standalone builds now route to the local Installer firmware task while hosted navigation is preserved. Independent sandboxed Chromium verified Installer → Samples → Installer and the Installer logo. WAV audition and portable project inspection also passed independently.
- Build History could fail or hide real rows after a successful but stale sidecar response. It now filters the records embedded in the visible archive. Chromium selected Main and Pro, searched the shipping short SHA, then cleared the filters at all three requested sizes. Each restored all 198 rows without requesting the stale sidecar or logging a page error.
- The shared SEQ state matrix drives the existing Remote component at 125 BPM (44,100 Hz, 84,672 samples per bar, 5,292 per step). Both kits passed empty and on-grid pulse cases. The mounted Draft remains pinned to 120 BPM. No Remote product control or fixture was changed.
- The 269-file runtime-backed build, focused LCD check, preview source parity, and content tests passed. The cross-source layout comparisons remain open under the previous disposition.

```text
[build]

> x0x37-nightly-installer-preview@0.0.0-dev build
> node scripts/build-preview.mjs && npm run build:product

BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files

> x0x37-nightly-installer-preview@0.0.0-dev build:product
> node scripts/build-product-site.mjs

{"files":269,"output":"/tmp/dnbox-web-39cc665d/.output/product-site","emulator":true,"published":false,"firmwareWrites":false,"catalogMutations":[]}

[offline-home]
PASS file-open installer → Samples → installer, including local home links

[history-data]
Chromium 151.0.7922.34
{"case": "product-embedded-1440x900", "pass": true, "total": 198, "matches": ["release-v0.0.26-94197fc8", "main-versions-0"], "restored": 198, "page_errors": [], "history_requests": []}
{"case": "product-embedded-390x844", "pass": true, "total": 198, "matches": ["release-v0.0.26-94197fc8", "main-versions-0"], "restored": 198, "page_errors": [], "history_requests": []}
{"case": "product-embedded-844x390", "pass": true, "total": 198, "matches": ["release-v0.0.26-94197fc8", "main-versions-0"], "restored": 198, "page_errors": [], "history_requests": []}
{"checks": 3, "passed": 3, "failed": 0}

[seq-timing]
✔ ported upstream sequencer renders all typed drum cells with safe, stable identities (18.254248ms)
✔ shipped app binds every typed step without a tool mode and edits remain undoable (2.284699ms)
✔ near-grid hit toggles the displayed event rather than adding a duplicate (5.044371ms)
✔ both drum grids use the shared SEQ matrix timing at 125 BPM (10.37958ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 121.727461

[route-unit]
✔ full rendered installer vs live gh-pages differs only by allowlisted hunks (4694.055897ms)
✔ exact Restore allowance rejects lost padding, forced full headers and unrelated changes (173.421551ms)
✔ approved release diff rejects drift in the restart handshake and report bindings (77.489828ms)
✔ publicCatalog keeps display_version so 0.0.25.1 stays 0.0.25.1 (10.441586ms)
BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files
BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files
BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files
BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files
BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files
BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files
BUILD PASS — self-contained nightly installer, samples, projects and empty catalog; no firmware files
✔ current source-generated pages retain all nine published versions and pass read-only parity (187.283235ms)
✔ sample preparation moved above the installer is refused even with current libraries and catalog (56.035526ms)
✔ stale generated docs cannot hide changed Breaks and Projects source (52.071076ms)
✔ self-consistent empty preview pages cannot replace a retained catalog (128.311958ms)
✔ coherently altered package metadata still fails retained-catalog comparison (257.081049ms)
✔ renumbered assignments and stale history are reported by their exact paths (66.929351ms)
✔ a missing staged page is a failing path instead of a partial pass (47.196394ms)
✔ complete source manifest builds byte-identical local output without deployment (285.359923ms)
✔ both manual families, 197 historical records and the new release survive source integration (41.310551ms)
✔ source admission remains explicit, no original-format or remote capability fabricated (0.953931ms)
✔ R16 composed source names exact workspace and contains safe local editing endpoints only (0.614543ms)
✔ R21 captured presentation and v6 port identity remain explicit without admission (3.410299ms)
✔ entry availability distinguishes drafts, separate browser audio and unavailable device providers (12.497037ms)
✔ historical manual never presents a descriptive retirement name as a hardware label (0.73941ms)
✔ retired build branches link to the archived source and evidence commits (2.07885ms)
✔ all nineteen musician routes and both legacy entry redirects survive the build (176.497301ms)
✔ starting-breaks publication navigation uses existing live destinations without unrelated route rollout (0.622875ms)
✔ release notices identify the two tested models, the withdrawal and the fallback (5.259234ms)
✔ published release records, backup workflows and history bookmarks survive site composition (1.563026ms)
✔ Loopy clip mode names DnBOX when returning from the host grid (3.761275ms)
✔ the project guide opens the musician workflow and keeps protocol details optional (1.382064ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5068.890892

[final-content]
✔ complete source manifest builds byte-identical local output without deployment (148.96113ms)
✔ both manual families, 197 historical records and the new release survive source integration (39.006085ms)
✔ source admission remains explicit, no original-format or remote capability fabricated (0.958509ms)
✔ R16 composed source names exact workspace and contains safe local editing endpoints only (0.422003ms)
✔ R21 captured presentation and v6 port identity remain explicit without admission (3.526082ms)
✔ entry availability distinguishes drafts, separate browser audio and unavailable device providers (10.461192ms)
✔ historical manual never presents a descriptive retirement name as a hardware label (0.371748ms)
✔ retired build branches link to the archived source and evidence commits (1.383997ms)
✔ all nineteen musician routes and both legacy entry redirects survive the build (68.267605ms)
✔ starting-breaks publication navigation uses existing live destinations without unrelated route rollout (0.535755ms)
✔ release notices identify the two tested models, the withdrawal and the fallback (3.814415ms)
✔ published release records, backup workflows and history bookmarks survive site composition (1.559111ms)
✔ Loopy clip mode names DnBOX when returning from the host grid (2.454865ms)
✔ the project guide opens the musician workflow and keeps protocol details optional (0.720562ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 386.036632

[seq-site]
PASS two SEQ states, three sources, three viewport sizes, exact 240×240 RGB and native return
PASS late native worker error leaves the archive visible and Current can recover

```
