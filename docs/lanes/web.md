# Lane: web   (copy to docs/lanes/web.md; update in every push)
Owner agent: <name>   Branch: lane/web-<topic>   Draft PR: #<n>   Head: <sha8>   Updated: <YYYY-MM-DD HH:MM VLAT>

## Checklist (from CHECKLISTS.md)
| ID | Check | Status (PASS/FAIL) | Evidence (SHA + log path or PR comment link) |
|---|---|---|---|
| C1 | Local gate at head | FAIL | |
| <S1…> | | FAIL | |

## Now / next
- Now: <item, riskiest first>
- Next: <item>

## Blockers (each with its fix and the route being tried; never "waiting")
- <blocker> → <fix> (since HH:MM)

## Top 3 risks for the next hour
1.
2.
3.

## Deletes (files this lane removes on purpose, with reason; the gate's no-loss step reads this)
- <path> — <reason>

## Conflicts noted (RULES 23)
- <conflict> → reading used: <…>

## Existing slot-2 removal extraction checkpoint
Owner: remote/integ integration worker. Base: consolidated 548e56799e1a1f0fc3c273cd6f9702cdf8efad4d. Donor commit: 9024d1ec0fb4a4589f405387a57b39eb3184afd3.
Reuses donor codecs and compatibility fixture/test, active preset selector and policy labels. No renderer implementation, R22 redesign, visual baseline regeneration, or native lab copies. Preserves current repository URLs and all untouched tree entries. Original donor retained; #135 overlaps and must be reconciled before later integration.
Checks: 17/17 preset tests PASS. Independent source review pending. Local gate status: FAIL (required steps NOT_RUN). Full Local gate/browser/combined manifest qualification NOT_RUN; draft only, not delivered or merge-qualified. Historical manual substitutions excluded because they incorrectly describe Synth One as present in source94197fc8 and assign former-engine STRING/BRIGHTNESS controls. Review and resolve documentation separately without falsifying history.
Next: source review, exact combined browser/full-gate qualification, then normal integration.

Independent review caught inherited donor omission: canonical synthone filenames lost their explicit Elite/Pro hint. Added the token to both identical codec regexes and regression for both models. Reproduced RED2/2 before fix; preset suite PASS17/17 after fix. Final independent source recheck PASS: reviewer reran17/17 tests and verified3 changed manifest entries; Local gate remains FAIL, required combined checks NOT_RUN.

Review also corrected README: Synth One is a development slot/init migration with playable renderer pending M1, not a released playable/chord-recording engine. Historical Juno0.0.26 qualification retained.

- 2026-11-17: item 1 merged in #152 as `7a2ed1842e7773e249f0e46ac3da156945964626` after the exact-head `dnbox-gate` success; current-source retired-name scan is clear.

- 2026-11-18: Merge consolidated #160 and retain its starting-breaks navigation assertion alongside Web item 2 route, redirect and historical label assertions.

### 2026-11-18 phone layout and route coverage

Chromium reproduced horizontal page overflow on 13 of 19 routes at 390×844 and on Remote connection at 844×390 at 7681fabe. Wrap the narrow site navigation and build identifiers and stack the narrow installer header. The scoped rerun loaded all 19 routes at 390×844, 844×390 and 1440×900 with HTTP 200 and zero page overflow. The visual gate now checks page width and includes all three previously omitted manual pages. Product checks passed locally. Independent full gate, comparative review, firmware screen parity and Pages qualification remain open.

Independent review found stale manual source hashes. Nine entries (three manuals and six Remote files) differed from their checked-in sources. Refreshed their exact identities and made the product build reject size or SHA256 drift before creating output. The product suite passed with a same-size substitution regression.

The build history page now links 0.0.24 and 0.0.24.1 to the immutable commits preserved by the corresponding archive tags. Both former branch destinations returned HTTP 404 and both replacements returned HTTP 200. The 0.0.24.1 evidence directory is at c20943a7. The underlying historical records retain their original provenance. The new per-record destination regression failed before this repair.
