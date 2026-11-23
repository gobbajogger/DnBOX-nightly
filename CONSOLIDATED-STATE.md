# Consolidated source ledger

Inherited consolidated baseline: `9165adb92fcdaab756c4e59e3d4a8ee22437ca5a`.
This tree contains the supplied RULES.md v2 start-file/removal payload for PR #136. The eventual normal merge SHA is recorded by GitHub on that PR; no complete lane, full Local gate, product release or Pages publication is asserted here.

Broad unmerged work is retained at `backup/integ-before-start-split-20261116`, exact tip `b39e99c4197544037896fd4ed463a338a5d423c3`. Gate/environment corrections move to an independent follow-up; other product work remains in the backup and its original lane branches. No unique history is deleted.

## Machine-readable roadmap state

Generated views: `docs/roadmap/{Complete,Working,Pending}.md` via `python3 tools/generate_roadmap.py --integration-sha <consolidated SHA>`.

```json
{
  "items": [
    {
      "id": "M3",
      "title": "Remote",
      "move": "M3",
      "status": "working",
      "merge_sha": "",
      "owner": "remote",
      "dependencies": [],
      "next_action": "Baseline within 2% of OWNER-BASELINE-1836, 844x390 fit, Remote/TouchOSC 0 unbound (FINAL-GOAL row 12)"
    },
    {
      "id": "M3-R1",
      "title": "FunkyBeats R22 roll, step sequencer, mixer, clip launcher and synth editor",
      "move": "M3",
      "status": "merged",
      "merge_sha": "5840d8aa2dbe60d5d2aaa5dc2be6742d9d49eb21",
      "owner": "remote",
      "dependencies": [],
      "next_action": "Kept by funkybeats tests"
    },
    {
      "id": "M3-R2",
      "title": "Modeless touch gestures, no tool row",
      "move": "M3",
      "status": "merged",
      "merge_sha": "45d98696646fb50e08de12858edd2e13eaae1a32",
      "owner": "remote",
      "dependencies": [
        "M3-R1"
      ],
      "next_action": "Kept by gesture tests"
    },
    {
      "id": "M3-R3",
      "title": "Thin per-step slider lanes",
      "move": "M3",
      "status": "merged",
      "merge_sha": "dfdca35dc6aec44c74552c74e2d27e3a3ec8cd0c",
      "owner": "remote",
      "dependencies": [
        "M3-R1"
      ],
      "next_action": "Kept by step-lane tests"
    },
    {
      "id": "M4",
      "title": "Website",
      "move": "M4",
      "status": "working",
      "merge_sha": "",
      "owner": "web",
      "dependencies": [],
      "next_action": "19 routes, browser tests, HTML UI within 1% of firmware at 240x240, #120 vote (FINAL-GOAL row 13)"
    },
    {
      "id": "M4-W1",
      "title": "Retired engine removed from the website",
      "move": "M4",
      "status": "merged",
      "merge_sha": "7a2ed1842e7773e249f0e46ac3da156945964626",
      "owner": "web",
      "dependencies": [],
      "next_action": "None"
    },
    {
      "id": "M5",
      "title": "BREAK samples and /private-audio/ URLs",
      "move": "M5",
      "status": "working",
      "merge_sha": "",
      "owner": "integ",
      "dependencies": [],
      "next_action": "Live /private-audio/ URLs return 200 (FINAL-GOAL row 3)"
    },
    {
      "id": "M5-C1",
      "title": "Retired engine name removed from the rules (repo grep 0)",
      "move": "M5",
      "status": "merged",
      "merge_sha": "626a5229e68fd46f59fb2677b7d375df23d9ac4a",
      "owner": "integ",
      "dependencies": [],
      "next_action": "None"
    },
    {
      "id": "M5-C2",
      "title": "Evidence-only files removed from Git",
      "move": "M5",
      "status": "merged",
      "merge_sha": "6d3d746b2007290eca67c417a4da2e5ee19e9157",
      "owner": "integ",
      "dependencies": [],
      "next_action": "None; .gitignore keeps evidence/ and docs/*evidence* out"
    },
    {
      "id": "M6",
      "title": "Combined qualification and delivery",
      "move": "M6",
      "status": "pending",
      "merge_sha": "",
      "owner": "integ",
      "dependencies": [
        "M3",
        "M4",
        "M5"
      ],
      "next_action": "Green gate on the consolidated tip, then consolidated-to-main PR"
    }
  ]
}
```
