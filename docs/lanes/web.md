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
