# Nested Node test execution correction

The previous aggregate inherited NODE_TEST_CONTEXT and Node skipped nested test files. Source parity scripts and separately invoked independent tests remain separate evidence. The corrected runner removes only that internal test context from its child environment, requests TAP, requires positive test counts, and checks an intentional child assertion fails.

Producer: 25 actual nested component tests PASS, all source parity subprocesses PASS, and the intentional-failure runner regression PASS. This does not qualify browser, device, full Local, or any complete lane.
