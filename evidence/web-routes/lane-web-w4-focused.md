# W4 focused Web checks

Baseline `c36ac45857d9f014ea3cc58b3f105c6d02b106b4`, PR #177. Scope comes from the [independent route review](lane-web-independent-review.md). Accepted captures for other routes still apply to their unchanged inputs.

| Route | Finding and correction | Chromium 151.0.7922.34, 844×390 |
| --- | --- | --- |
| What’s New | Opening Published project notes exposed a second H1. Removed the redundant archive heading. The release notes, headings, links and fragment IDs remain. | One named H1 with the archive closed and open. Enter opens the disclosure and exposes the first archived release heading. No horizontal page overflow in either state. |
| Samples | The preparation and preview help leaned on encoding and rate terminology. Reworded it around fitting loops, hearing what gets saved and locating loops on the keyboard. | Import heading, file picker and rate control have accessible names. The space saver has the updated description. A bundled WAV loads into the two local preview controls before connection. Device send remains disabled. Enter opens the file tips and the BREAK manual link is visible. No horizontal page overflow. |

Playwright used Chromium's normal sandbox with the locally built files served by request routing. The product build emitted 242 files. The 35 focused Node tests passed, including source manifest validation, manual and release continuity, sample previews and saved-rate workflows. Independent source review approved the two route changes and found no change to preparation, preview or transfer logic.

Rule 19 defines the current third-engine name. The current tracked-source check retains the policy definition exception for `RULES.md` and the established changelog, `docs/history/**` and `docs/scheduler-handoffs/**` exclusions. It passed on the exact baseline and the candidate. No product residue or scan change was needed.

Final combined firmware runtime and matching native oracle qualification remain with Integration. This local build and route check did not use a staged emulator runtime.
