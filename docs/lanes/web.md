Move: M4 (website runtime donor split)   PR: #135   Head: parent 9024d1ec
LEFT items PASS: 0/5; failing: L29 L30 L31 L32 L33
Gate at head: NOT_RUN (full gate and browser review pending)
ETA merge: 2026-11-19 22:00 VLAT

## Requested scope split, 2026-11-17
Owner: web; branch: lane/web-v2; base: START-NT bc3ed20d.
#135 contains only the original R22 token and wave-display runtime dependency restoration, associated tests/build manifest, and the owner's completed Synth One legacy-slot adoption. The broader website and Remote work is retained in the stacked follow-up, not discarded. All history is preserved without a force-push; the historical commit count is not reduced.

The owner-approved slot adoption comes from 9024d1ec. The original codecs and test are reused, with the unchanged documentation substitutions resolved onto START-NT. Normal build, product, workspace, Remote and preset suites passed for this split; this is not a full Local gate or independent visual Review. Browser/environment repairs remain M0 inputs. Both this donor and its follow-up remain draft and must not be merged wholesale as M4.

## Next
M4 consumes the website feature changes and completes L29-L33. M3 owns the Remote portions; M0 owns environment repairs. Full Local gate and independent Review remain required before any integration. Existing dirty M4 worktree was not changed by this split.
