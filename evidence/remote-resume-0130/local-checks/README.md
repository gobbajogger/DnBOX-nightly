# Remote resume Local and edge checks

## Rule 13 artifact gate

The expanded Local gate regression failed nine path cases against original gate blob `91530cdf9551052551de07a0dce6f6a98affa226`. It rejected two permitted `.fwsc` paths and accepted seven prohibited paths. With gate blob `f7650222f21490fe0b9e0d3033b280d719048adb` and test blob `e8a385bdd3b7864590d3010e53708e5f5b76d03d`, all six tests passed, covering 14 artifact paths and four existing gate controls. The scan recognizes case-insensitive file and plug-in bundle suffixes, including names with newlines. The wrapper parser's self-test and static browser audit passed. The audit reached 34 Chromium launch sites and caught all ten deliberately unsafe launch configurations.

Reproduce with `bash -n scripts/dnbox-gate.sh`, `python3 tests/browser-sandbox-gate-test.py`, `python3 tests/browser-sandbox-contract.py` and `bash scripts/gate.sh --self-test`.

## Checkpoint results

These results were collected in an independent detached worktree at `cd54ee5d27be20d706ebf68d1a3c959319c35a57`, with Node v24.22.3, npm 11.19.1 and Python 3.12.14. The current consolidated source at `583f622961fc9975fac746592ce6c483073c4170` is an ancestor. No tracked files were deleted. The largest Git blob was 9,521,075 bytes.

| Check | Observed outcome |
|---|---|
| `npm run build` | Exit 0, 276 source-only files. With both verified native inputs mounted, it rebuilt and byte-checked 304 files, with no tracked changes. |
| `npm run test:edge` | 564 passed, 0 failed. |
| `npm run test:workspace` | 128 passed, 0 failed, plus the four application scripts. |
| `npm run test:remote` | 239 passed, 0 failed, one original-source oracle skipped on the first invocation. |
| Pinned-source Miami test | 3 passed, including all 23,220 native C projections, after recovering firmware Git `ffd31a735acc5721d1f90a30fc1ceb283aad6fc5` and verifying its `ui.c` blob `8cb35150b9294aad0d8e1d3d78069e1802fdbf89`. |
| `node tests/qualified-catalog.test.mjs` | Exit 0, 333 synthetic rejections and the download-byte verifier. Its temp directory was an absolute physical path outside the worktree. |
| Structural fixtures | All nine expected outcomes observed in normal-sandbox Playwright Chromium 151.0.7922.34, including eight deliberate negative fixtures. The command used `--fixtures-only`. |
| First landscape traversal | Exit 1 when the source-only build reached the fixture's mounted-kernel checksum. The report could not complete, so this run supplies no landscape pass. |

The current and previous emulator closures contain ten files each. The firmware reference has seven renderers. Each file came from the immutable Nightly Pages tree and matched the repo pin by byte length and SHA-256. The compiled browser emulator remains distinct from a physical keyboard. [Immutable Pages input tree](https://github.com/gobbajogger/DnBOX-nightly/tree/3fbf130166733143b2996354c7731822cc2f8f91)

## Log identity

Full outputs are in the worker's `remote-checks-cd54ee5/logs` directory. The table identifies the log bytes for attachment to the project sources.

| Log | SHA-256 |
|---|---|
| `gate-regression-red.log` | `4bce52a9075999f865834083ed7fc929df3527b8926f8d26b34e9d65ad819297` |
| `gate-regression-green.log` | `57aeb3198b69f0e2ccf74b4bd68d656f2d262a124798a76d12ff719e709ec072` |
| `gate-parser-selftest.log` | `9eb940545423d0c4152cba24634bd3817e213bb59403976ebcee0fde24050d57` |
| `browser-sandbox-contract.log` | `4176eac475edfd5f679befdbec1b639271032b3e08533e4d5f339c427537f713` |
| `build.log` | `d1316976829308e402b28bb3bd5122151ac23eaf93dc61335d941d773653497b` |
| `build-mounted.log` | `b608d07ef226afea496dcbd5fa9bd35c46e223bd43478adad9a7561e54a0dfe5` |
| `edge.tap.log` | `45ff0ccda7740f709995b2aa65748b9a1e2b95c2fe4646de1ed1dfebf841383f` |
| `remote.tap.log` | `ed6b35fba3c9461aef756798ce567ade9723cf73b88964729cd8ababecc5bdbf` |
| `miami-oracle.log` | `a008ffa964c640433a8fe997450f55cf01550882dba2133aa72f918659f189cc` |
| `workspace.tap.log` | `a311956624f4b1762e28d554839b62debba3cae00b22722b19c8b5efaa1a74cb` |
| `qualified-catalog.log` | `5c704c1a64e96ec35d33298ce3d4f473476bf61358a667bf8f19a9ef707eaa52` |
| `web-structural.json` | `e9f43cea91cf798f1fa27efffc886977c93fab79b59b92366297f7cc76894356` |
| `landscape.log` | `2039cf1bbea624f0d2388d936997c85086afd02397af340f530ca4c28e6616be` |
| `pinned-runtimes.log` | `8d60795526eb086ff244ecfda6afb07784bcded8500ad7407a07de61dbe4fe83` |

## Published candidate

A second clean, detached worktree ran the checks at published commit `5ee28037ebc55bad744f0c7d1f69eab22bb49f6a` with Git tree `721461c82f1d0580878fc117940563dbe2a36374`. The pre-publish commit `a160e7d56732e3111702e567a81b54353a721327` has the same tree. [Machine-readable exact-commit results](5ee28037-results.json)

| Command or check | Outcome |
|---|---|
| Local gate functions `clean`, `setup`, `no_loss`, `limits` | All passed. No deletions from the verified integration ancestor. |
| Gate regression, parser self-test and browser sandbox audit | Six tests passed. The parser self-test passed. 35 gate-reachable Chromium launch sites, 10 negative controls and zero findings. |
| `npm run build` and `node scripts/build-product-site.mjs --check` | Both passed. All 304 mounted outputs have independent inodes. The tracked tree stayed clean. |
| `npm run test:edge` | 564 passed, 0 failed or skipped. |
| `npm run test:workspace` | 128 passed, 0 failed or skipped, plus the four application scripts. |
| `npm run test:remote` | 241 passed, 0 failed or skipped, including the 23,220-projection Miami C oracle. |
| `node tests/qualified-catalog.test.mjs` | 333 synthetic rejections and the download-byte verifier passed with the physical temp path outside the worktree. |
| Product, sample discovery, presets and origin suites | Product passed 57 Node and 6 Python cases. Sample discovery passed 7, presets passed 35 and origin passed 4. |
| `tests/visual/fixtures/web-structural/browser_fixtures.py --fixtures-only` | All nine expected outcomes passed in ordinarily sandboxed Chromium 151.0.7922.34. |
| `tests/product-remote/landscape-browser.py --site .output/product-site` | All 131 states completed at 844×390. All 5,873 enabled presentations were reachable. No geometry findings or page errors. Uses pinned native simulator and synthetic SuperJ6 import inputs. |
| `tests/product-remote/test_funkybeats_route.py` | Pass. |

The checkpoint's first mounted landscape traversal crashed in Chromium when navigating to the device page during concurrent reviews. It supplies no complete result. The published-commit traversal completed with browser workloads serialized. The full Local gate has no result at this commit. The tests above supply focused checks and fixture-level browser evidence.

The exact-commit logs and landscape PNGs are retained in the worker's `remote-checks-5ee28037/logs` directory for project-source attachment.

## FunkyBeats and grid fixture

The first exact-commit FunkyBeats run passed Review discard and bass step fields. It exited 1 when Chromium reported a renderer crash during the Pattern Locks case. The log retains the precise exception and last completed case. An unchanged retry with other heavy browser suites stopped passed all 26 cases on the same exact commit. The retry covers the five ported surfaces, modeless creation, movement, resizing, deletion, zoom and pan, all four thin step-lane modes, Draft Undo and Redo, both drum kits, Projects and Motion. The no-loss, Local limits, Edge, workspace, Remote source, landscape and structural results above come from separate successful invocations.

The grid fixture now runs in the normal bundled Chromium sandbox and participates in `npm run test:browser`. Its ordinary sandbox audit reached 36 launch sites with zero findings. The changed fixture observed the exact grid module `dbe162c5f2c7ce4ad8fa8ce7f93159b286e8d57d` at 844×390 and 390×844. Both viewports passed nine SVG widths, zero page errors, and full document bounds. Both focused Node grid tests passed. This browser receipt covers the grid only.

Each FunkyBeats journey now closes its bundled, normally sandboxed Chromium process before the next case starts. The lifecycle change preserves all 26 journey declarations, operations and assertions. An AST comparison verified this mechanically. A process-lifecycle stub exercised 26 ordered closes and a deliberate failure at case 10, where the harness closed the active browser and propagated the failure. This stub covers cleanup only.

## Committed firmware packages

At `183207ed2b7dd7b346ca5871408b292df4fb0ae2` the clean-tree, setup, no-loss and revised limits checks passed from an independently detached checkout with the committed Elite and Pro `.fwsc` packages present in its Git index. The raw check is `remote-checks-183207e/logs/gate-with-committed-fwsc.log`. This exercises the Local limits code on the branch's actual deliverables.
## Project-source archive

The branch-and-commit archive `lane-remote-resume-0130-5ee28037-local-edge-browser.tar.gz` is staged in the worker's `remote-local-delivery` directory. SHA-256 `a38a2687344323581d76fbc4e8f00c6a8f0f089e798036bba47295091e925809`, 4,696,205 bytes. It contains the exact-commit raw logs, both FunkyBeats attempts, the follow-up harness receipts and 131 verified 844×390 PNGs. The archive has a local staging location. Project Sources upload is unverified.
