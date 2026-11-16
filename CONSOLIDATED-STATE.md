# DnBOX consolidation WIP: website/Remote

Updated2026-11-16 09:50UTC. This is the website-side partial checkpoint, not a second authority or a completion claim. The single living cross-lane reference is [firmware CONSOLIDATED-STATE](https://github.com/gobbajogger/X0X37-for-Loopy-Pro/blob/lead/consolidation-20261116/CONSOLIDATED-STATE.md).

This first partial public branch retains authentic900-blob public #132 source3f22e000ad17456318cde997067c7fd45dd7e3b3 (retaining main and#131 ancestry) and adds this inventory/evidence checkpoint only. A separate LOCAL, UNPUBLISHED composition adds frozen69-file Remote and97-file Website packets:159-path union,7byte-identical overlaps,114changed paths. It is not yet published because exact source-manifest reconciliation and large-blob reuse from active lane pushes remain next. It does not contain the newer in-flight FunkyBeats port or resumed Website work. No landed merge, deployment, deletion, repo rename or all-page acceptance.

## Every active lane and merge status

| Lane | Branch / exact source | Merge status and unmerged TODO |
|---|---|---|
| Integration &Release firmware | lead/consolidation-20261116 e742be7bd0d01323c899de6e156f40b85ee451db; parent firstWIP integration/dnbox-consolidated e30f9a3175a839f2bcacf0034328877383fc17fc | WIP only.8a0ef30ca3e60e9c2c2721f1c3b7b303e12b229b +14resource +21gate; no merge. Whole combined native/audio/UI gates open. |
| Firmware UI | fix/r22-drum-glyphs base94197fc839b00aff47b98ca02f3c6396e4a6eabf +frozen24f133feb0db2fe23e26c232c64c681f739f67ecb2c5243dd9e0d33ed19289e4 overlay | New lane push pending readback; not merged. Frozen9 narrow45state geometry0findings is not current all-page acceptance. New global composer incomplete. |
| Sound | feature/sound-ports, planned authentic8a0ef30ca3e60e9c2c2721f1c3b7b303e12b229b base; firstnewWIP NOT PUSHED at snapshot | Independent DSP/assets/tests only; not merged. RealS1renderer, SJ6full64bindings/preset/runtime graph, stock-memory/timing andoriginalA-B qualification open. |
| Remote | cursor/remote-parameter-lane-bdb9 /#132 3f22e000ad17456318cde997067c7fd45dd7e3b3 | Draft, not merged. Frozen69source inventoried, NOT yet on this partial branch; newer port in-flight ownerbranch, not included. BrowserEPERM NOT_RUN remains unfulfilled, never rerouted. |
| Website | feature/website-r22, planned base3f22e000ad17456318cde997067c7fd45dd7e3b3; newbranchSHA not yet verified | Frozen37public+52tests+8shared inventoried, NOT yet on this partial branch; newlivechanges not included.19route behaviors andlocked-baseline all-page review not accepted. |
| Existing integration dependencies | #86994197fc839b00aff47b98ca02f3c6396e4a6eabf; #95137c780cdf4b18e824c863d7cc2982792882f61cb; #887/#944/#947/#948 retained in exhaustive inventory | No cleanup/merge. #947/#948 have5scheduler conflicts; preserve both. Firmware nightly2dd06b46ff037f858765ddf40275d8da02a9066c is divergent, not interchangeable. |

## Actual checks on separate unpublished composition (not this public branch)

- `node scripts/build-product-site.mjs`: first exit1, **Product source drift: breaks/index.html**. Frozen current source is newer than inherited SOURCE-MANIFEST; do not call buildPASS. Manifest reconciliation is next real action, not threshold/test relaxation.
- `node --test tests/product-site-build.test.mjs`: first exit0,13PASS/0FAIL/0SKIP. This tests builder mechanics, not currentsite acceptance.
- Browser structural/native all-page/interactive/audio qualification NOT_RUN for this composition. Original denied collector is not retried or routed through another executor.
- First failedstdout/stderr andtruePASS logs are retained under docs/integration/20261116/logs, with path-only sanitation identified andrawdigests preserved. Full rawlogs are in paired Library archive.

## Remaining integration/cleanup gates

Complete source attribution and R012/13/14/20/38/39/40/41/45/46 request coverage; preserve Chicago cache/Miami options, five actualBREAK default selections/preview andlegacy save IDs. Stock memory only, noPSRAM. Before any merge/deletion: full retained-content diff anddurable dependencies +full exact-composition localgates/no regression +independent equivalent-state render/behavior. Then exact-tip archive tag andverified recoverability before eligible retirement. All488initialrefsHOLD; branch counts357firmware/131website, PRs73/9. No main/force/protection/Actions/device operations.

Owner19:35–19:36 authorizes allnonsecret assets includingcoefficients/captures/binaries forGit+Library, retaining actualprovenance/MITnotices. Only secrets/tokens are excluded. Large-LFS transfer capability is not assumed; do not manufacture pointers without retained bytes. Everypublicsource artifact is paired with exactsame sourcebytes in an archive nameddate/lane/GitSHA.

## Source/evidence boundary

The public candidate is exactly3f22baseline pluspartial status, source-pin inventory andlogs. The logged drift failure applies to the explicitly identified unpublished local composition, NOT the unchanged3f22 product tree. No passing qualification for this branch is claimed. Full source andbefore/aftertest evidence must be refreshed after the frozen source is actually composed into this branch.
