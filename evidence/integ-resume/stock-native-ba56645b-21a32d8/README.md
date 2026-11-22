# Reviewed stock Remote software pair

Firmware `ba56645b2142b134be3aeee2236406e1c95b2bde` pairs with composed Nightly source `e3053cd718618c219918defeb78652de5992e380`, tree `9f8845e31f20a2ac6caf95125f6c3d6add3d7612`. The composition contains the live, verified Remote continuation `21a32d8fd26e102ede8a5c86638913beb058cee0`, along with all prior Integration and Web paths. The product manifest retains 277 source entries and builds 316 files. Both parents retain their complete tracked path sets. The existing closed default, Device read-only session and explicit pairing guards match the Integration parent.

| Artifact | Identity |
| --- | --- |
| Source catalog | DNR2 v2, CRC `ecca5979`, one control `909 MIX Level`, ID 1, U32, range 0–127 |
| Elite stock FWSC | `3291d76d6ee87891525be0338b58ca78acbb6050f74e1f6f4253953a9ece4053` |
| Pro stock FWSC | `d63ffc362c105d8bcb3a38fce8219c756720602943b3e7ae5ceeef159a5b6c25` |
| [Branch-only catalog module](candidate-catalog.mjs) | `77c46c43e8eb22b90008f2d9ace2411fc2c452f41c97cc22177056d9492a239e` |
| [Matching packed TouchOSC layout](../branch-scalar-54266973/reviewed-scalar-staging.tosc) | `67aad0ea99e961452db1971689e805e992d2e5bc8dd220ac583411ebc4a476c0`, root `7233710e-9497-58b9-917e-9efc2a92241c` |

The [independent declaration review](catalog-review.json) verified the actual stock packages and their USB receipts. Each returns the native catalog, stores 75 → 76 → 75 with guarded readback, closes the lease and refuses the stale write. The wire offers a boot incarnation and catalog identity. Exact FWSC identity comes from the package and receipt hashes.

The [composed Chromium receipt](composed-chromium.json) passed all eight cases against the exact production C host. The guarded path includes heartbeat, Apply, fresh readback, Undo and CLOSE. Device only sends HELLO and READ after explicit pairing. Missing and ambiguous pairs produce zero write traffic, and HELLO mismatch, timeout and revoked lease fail closed. The earlier Remote focused browser proof remains valid for its test-injected isolated page. The [matching packed Lua witness](../combined-31a92a94-ba56645b/remote-touchosc.json) carries forward with the same layout and host bytes.

The [independent runtime review](runtime-review.json) approves explicit local branch-only selection with all 114 Remote product bytes checked against source and built output. To select those exact files into an unused directory under `.output`, run:

```sh
python3 -B tools/touchosc-parameters/select_branch_runtime.py reviewed-909-mix-ba56645b
```

The [selector receipt](selector.log) checks the selected catalog, reused packed layout and review digests. Public and default activation remain held. The earlier [canonical Nightly failure](../combined-31a92a94-ba56645b/receipt.json) retains its original SHA. The combined full Local and changed-screen acceptance remain open for the final corrected release candidate.
