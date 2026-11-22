# Remote owner control witnesses

The branch change starts from `708fdb2ec320171f9fdff2e0458c4c4ef6608b07`. The browser compares the changed controls with the retained `133fe8f0f917eb8d390ca0788cd9710a076aee97` product build, whose served modules also match `ca5e7eebb7a258379c00fb5abcce2404c33334ec`. The intervening P01 fill had its own [page 9 witness](../pattern-selection-page09/README.md). The focused browser gate compares the existing action, note and fader targets and uses P07 to exercise status formatting.

| Owner pages | Matching control and correction | Focused Chromium 151 check |
| --- | --- | --- |
| 1, 14, 21 | Keep the pitch seam visible at the start of each shaded black-key row. | Six sampled seams per viewport and identical note bounds at 1440×900 and 844×390. |
| 2, 15, 22 | Use the full kit voice name in the Sound heading beside the compact drum grid. | 909 Bass drum and Snare, 808 Cowbell, 176 unchanged pad boxes per viewport and drum edit/Undo at 1440×900 and 844×390. The 22 kit/voice names were independently checked against the grid's existing accessibility names. |
| 6, 16, 23 | Use the neutral cap and narrow rail shown for the Levels faders. | All five Level values, bindings, ranges and hit boxes match at 1440×900, 844×390 and 390×844. First-fader keyboard and touch edits and Undo preserve the exact raw behavior. This witness uses Chromium. |
| 9, 10, 19 | Use the existing primary action colors for Song arrangement and Review, the part colors on the Song headings and the shared two-digit local pattern label. | Original control bounds, P07 with the unloaded status, one authored row, independent mute switch, Review and exact Draft readback/Undo at 1440×900, 844×390 and 390×844. |
| 11 | Reflect the local five-asset preview selection in the existing All and None actions. | Desktop five→zero→one→five selection, pressed states, unchanged action bounds and exact Draft equality. The focused host test also remounts a partial selection. |

This comparison covers shared control roles and known states. Historical tool rows and inspectors, unspecified fixture values and unavailable Instrument controls still limit whole-page comparisons. The retained 26 whole-page diagnostics exceed 2%. The 32 registered views still have no approved matching baseline. The full image sets and verified delivery ZIP preserve their existing byte identities. The three focused browser exports supplement the original sets.

## Reproduce

Use the retained product build and pinned emulator/reference inputs listed in the [existing delivery inventory](../final-browser-133fe8f0/visual-delivery.json). Set `DNBOX_EMULATOR_RUNTIME` and `DNBOX_FWUI_RUNTIME` to those inputs before building. Run from the candidate checkout. `RETAINED_SITE` points to the static output from the retained source above. The Python runner uses Playwright, Pillow and Chromium with its normal sandbox.

```bash
out=.output/remaining-owner-witnesses
site=.output/remaining-witness-site
evidence=evidence/remote-resume-0130/remaining-owner-controls-708fdb2
node --test tests/product-break-preview-failure.test.mjs tests/product-workspace/song.test.mjs tests/product-workspace/drum-strip.test.mjs
node tests/product-workspace/app-regression.mjs
node scripts/build-product-site.mjs --output "$site"
python3 "$evidence/gate.py" . "$RETAINED_SITE" "$site" "$out"
```

The 308-file build, 12 focused host tests, Workspace application runner and four focused browser groups passed. Independent review verified the five served candidate hashes and corresponding manifest entries. The replay found no page errors, unexpected MIDI or outer overflow within its checked views. The [browser receipt](receipt.json) records actual geometry, values and source hashes. The [host](node.log), [build](build.log) and [browser](browser.log) outputs accompany the receipt.

| Focused export | SHA-256 |
| --- | --- |
| `10-song.png` | `9c14bec050b5a451d8b5e650576020db0ac64ad190340e68ae8db2f63fccc5b8` |
| `11-slices.png` | `e94aee3333897a4616d70c414379fda580d708f97f7c570273436a2a855f3ff2` |
| `14-notes.png` | `3d8ec1eafd564394d118d9614879ee2a96d9e39cbf5370e7fd4cc8c3def56e8b` |

The [prior archived app-core proof](../final-browser-133fe8f0/production-boundary.md) and [packed TouchOSC Lua/C proof](../touchosc-parameters/README.md) still apply at their recorded inputs. The supported paths were audited independently and needed no correction in this patch. The final Integration runtime, reviewed stock catalog and matching-state owner acceptance remain open. Qualification is software-only.
