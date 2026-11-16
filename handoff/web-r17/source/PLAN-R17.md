# R17 implementation plan

1. Reproduce overlapping chord lane from shipped app. Add grouping/render tests and actual app tone-choice→direct edit→Undo/Redo/cancel tests. Implement only onset grouping and tone identity routing, then run regression suite.
2. Validate current source tempo map and derive reversible sample↔quarter positions. Add tempo-boundary/ruler/snap/default-length tests before wiring. Keep samples authoritative, meter unspecified and existing raw precision available. Test draw/move/length/group bounds and exact unchanged imported notes.
3. Test current narrow-header action containment, then move secondary controls into a bounded File drawer and make portrait inspector flow within the editor. Preserve IDs/tool routes/native disabled gate and keyboard operation. Source/structure tests are not a browser layout test.
4. Run complete module/Python/app suites, compose an isolated full-site/repository successor, build from empty output and run full npm test. Freeze exact inputs before affected independent review. Preserve reports and recoverable artifacts; do not mutate old freezes or infer delivery from them.
