# Remote design review

The original PR #170 candidate at 061e95213f20126f39b51e7828eecf2c2f274289 was compared with be65ec9c43b33d5a04133b267c675d070ede0d8f using Chromium 151.0.7922.34. Eight Workspace states plus Device ran at all four registered viewports on both revisions. Every pair had equal dimensions. Twenty-six pairs were pixel-identical. All 36 candidate states had zero page errors and zero horizontal overflow. Four Sequence views were captured again after all 16 steps mounted.

| Owner PDF | Remaining finding in #170 |
|---|---|
| Pages 1 and 3 | Bass A is gray on unselected notes. The expression bars fill most of each cell. |
| Page 4 | Chicago splits the oscillator and envelope controls across separate cards. |
| Pages 6 and 16 | The five mixer strips have no Mute, Solo or Part controls. |
| Pages 9 and 19 | All 160 patterns appear. The selected part needs 32 choices and a pattern operations panel. |
| Pages 12 and 20 | Backup, preset and MIDI actions appear as links to other tools. The reference places the actions on Projects. |

Independent captures matched the four approved inactive Device images at b6c3ea4d. Actual MIDI controls remained disabled in that state. A stock protocol check answered ED_INFO and returned zero bytes to DNR2 HELLO. At separate Remote PR #169 head 1f6d7602, 20 focused tests passed and nine desktop states rendered without page errors. Some owner findings are addressed there. [Remote PR qualification](https://github.com/gobbajogger/DnBOX-nightly/pull/169#issuecomment-7062541508)
