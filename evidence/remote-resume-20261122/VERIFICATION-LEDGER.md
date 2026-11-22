# Remote resume verification ledger

This ledger records evidence at the source/test head `2e4b3e05df40d08d95e4faf7e5a6519c3377b1cd` on `lane/remote-resume`, descended from original start `913120550b2634abae684390a05057cc9d9b3ee8`. This document adds no product behavior. Published commit SHAs are evidence boundaries, **not** proof of a passing complete Remote gate.

## Exact source and Git ancestry

| Item | Value | Verification |
|---|---|---|
| Source and browser-fixture commit | `2e4b3e05df40d08d95e4faf7e5a6519c3377b1cd` | Live GitHub branch fetch before evidence-only commit |
| Corrected renderer blob | `dbe162c5f2c7ce4ad8fa8ce7f93159b286e8d57d` | Local `git hash-object` matches GitHub blob |
| Node fixture blob | `0c961f87a2ef0be2a083e86ad276388a30ce8e10` | Local `git hash-object` matches GitHub blob |
| Browser runner blob | `5aabb8f8858f667e7917e5b90d14625a45ca23c7` | Local `git hash-object` matches GitHub blob |
| Browser HTML fixture blob | `5e5608a1bd60c00b7adcbbca0ad5193f2db4c02e` | Local `git hash-object` matches GitHub blob |
| Integration base | `583f622961fc9975fac746592ce6c483073c4170` | GitHub compare: `ahead_by=93`, `behind_by=0`, `status=ahead` at tested source head |
| GitHub CI at source head | No checks/workflow runs returned | Absence of checks is **not PASS** |

## Focused results on affected source

| Check | Before | After | Scope |
|---|---:|---:|---|
| `node --test tests/product-workspace/grid-collapse.test.mjs` | 1 pass, 1 fail | 2 pass, 0 fail | Original vs corrected exact grid module, positive source widths incl. 0.1, and normal 16/316/762/1342 coordinates |
| Exact Git blob Node rerun | — | 2 pass, 0 fail | Local isolated copies of the SHA-identical two Git blobs |
| `python3 tests/product-workspace/grid-collapse-browser.py` | — | 2 / 2 viewports pass | Chromium 144, *grid-only fixture*: 844×390 and 390×844, zero page errors and neither document axis exceeding viewport |

Raw logs are under `logs/` in this evidence directory, with individually verified byte-identical Git blob IDs from the captured outputs. The Chromium harness uses `page.set_content` because 127.0.0.1 was administratively blocked in this worker; it inlines the exact source module after removing only the `export` token. These tests do not launch the complete Remote application.

## Current lane status (not the historical pass column)

| Item | At tested source head | Required evidence |
|---|---|---|
| C1 full gate | **NOT_RUN** | Fresh Local + edge + browser gate of complete checkout, with status and log at final head |
| C2 ancestry/no-loss | **PASS — API compare only** | Base `583f6229`, ahead 93/behind 0; complete no-loss gate not run |
| C3 independent owner review | **PARTIAL** | Only focused SVG comparison; current whole-page/approved-glyph visual approval missing |
| C4 size/limits | **NOT_RUN** | Exact final firmware/website limits gate |
| C5 whole lane | **OPEN** | R1/R5/R6 and hardware/native contracts remain |
| C6 delivery | **OPEN** | All output builds, verified full gate, owner review and approved integration |
| R1 owner page/control parity | **OPEN** | Owner PDF has 24 pages/996 indexed controls; previous screenshot coverage is at older SHAs; page 15 6×16 owner cells versus 3×11 fully exposed in prior landscape run; approved 17:00 glyph set unidentified |
| R2–R4 existing FunkyBeats/lanes | **HISTORICAL PASS / NOT_RERUN** | Earlier passing scopes in main lane ledger; unchanged by the grid edit, not checked as a whole at present head |
| R5 viewport/accessibility | **PARTIAL** | Grid-only 2 viewport PASS; all actual Remote pages and affected glyphs not captured or approved at this head |
| R6 native stock keyboard | **OPEN** | Archived engine fixture at `246ea371` proves stored read/SET(QUEUED)/fresh read/Undo/fresh read for Chicago Cutoff 32→33→32 using a test MIDI bridge, **not physical**. Stock firmware f1786ebe INFO reported X0X DEV but DNR2 HELLO returned zero bytes. No live keyboard connected here |
| R7 combined browser | **NOT_RUN** | Full product browser, edge and Local gate of complete exact checkout |
| SuperJ6 build 9 literal LFO labels | **OPEN** | Source-derived 18 tempo periods rendered at 90/120/180 BPM; native original executable was **not** run to verify literal UI names. Do not treat musical period names as exact UI strings |
| Stock `.fwsc`, `.img` | **NOT_BUILT** | Current source checkout and authorized SDK bytes absent in this worker; do not republish old firmware as new |

## Original source and limitation provenance

- Owner PDF: `docs/design/OWNER-BASELINE-1836.pdf`, SHA256 `db826c9cbeb84971f2d030c847043a21749ad4172e30739773494df0c9acca17`; owner notes supersede obsolete JUNO/raw-list/tool-row proposals.
- Historical owner crosswalk: `evidence/remote-owner-pages-20261121/owner-control-crosswalk/README.md` and its 996-control table.
- Historical simulator-only keyboard trace: `evidence/remote-protocol/pilot-246ea371/browser-undo/README.md`. Stock limitation: `evidence/remote-protocol/stock-f1786ebe/README.md`.
- Conductor-derived musical measurements (not original app literal names): `evidence/remote-synth-files/tempo-periods/README.md`.
- User's project bootstrap is an old X0X37 checkout, **not** the matching DnBOX-nightly tree. Shared inputs archive declares `source_trees_embedded=false` and `sdk_embedded=false`; the 309,800,121-byte SDK Library file cannot be raw-byte materialized by this worker (authorization failure), so firmware builds cannot be verified here.
- No original SuperJ6 AU executable, physical keyboard, or full current Remote checkout was accessible; do not infer omitted requirements.

## Large output location

All of the following were actually uploaded to personal Library folder `/LoopyX0X37/Project Sources`. Personal Library storage is not proof of attachment to ChatGPT Project Files:

| File | SHA256 | Contents |
|---|---|---|
| `remote-resume-4d12b644-focused-grid-and-owner-reference.zip` | `65799eee9ee8dee7dc92492b4bada6fc4aa60c2fd9770378452d6a712a2e2dab` | Node red/green/exact-blob logs and owner PDF reference renders for pages 15/18/21/22/23; **owner source only** |
| `remote-resume-4d12b644-grid-browser-844x390-390x844.zip` | `f0650fd79e4a87ba5eda9568ec4cfb6b2c4b05fe4211243d2d6c033ce8eda418` | Actual grid-only Chromium PNG captures, source HTML/Python, standard output, and SHA manifest |

The narrow and landscape **complete Remote product** captures and per-control owner comparisons remain to be done; neither archive includes them. Preserve all historical failed gate logs as failures. This is a WORKING ledger, not DONE.
