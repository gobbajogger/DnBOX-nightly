# Remote Library input and recovery index

These are the exact inputs consumed for the 2026-11-18 Remote continuation and the persistent evidence checkpoint. Source and tests are versioned on `lane/remote`; this index does not substitute for exact-head gates. Check the Space checkpoint for the latest evidence version and delivery status: https://chatgpt.com/space/page_d663ea30f1b48191acd9762ff4732a33.

| File / recorded version | Bytes | SHA256 | Library |
|---|---:|---|---|
| classic-remote-transfer.tar.gz | 12450151 | `d673a99b3707ce7bdcba518b9c07a4ba90dc21a831da208833d339d1329a2e71` | [Transfer](https://chatgpt.com/library?file_id=libfile_fde3_f-595f93dfe7008191bc2a8f71bc081c23_2021479872048191acbfdca1f870a539&account_id=personal) |
| mix-257-qualified.tar.gz | 548452 | `480f9881faf68042d0476ba932f248c094a146da3549058a8b95a3e7e09551e2` | [Runtime257](https://chatgpt.com/library?file_id=libfile_fde3_f-7a9d38c739e4819192bdc994bc25cac8_2021479872048191acbfdca1f870a539&account_id=personal) |
| sound-4758-qualified.tar.gz | 553226 | `d8cd114c2dfcb31614ff75a01db8d27b8899c6ba213055af034fe187b2b7b9dd` | [Runtime4758](https://chatgpt.com/library?file_id=libfile_fde3_f-0f0a4e6ba8a081918a58910f1e1a9420_2021479872048191acbfdca1f870a539&account_id=personal) |
| dnbox-remote-recovery-20261118.tar.gz, version1 | 109178 | `e2f1f0d080e7b61bb43d51bda333fe4093ae58281c01a18dbde7d82c799fc6e7` | [Evidence and recovery](https://chatgpt.com/library?file_id=libfile_fde3_f-d20a3c0ebb648191b347810a3e331499_2021479872048191acbfdca1f870a539&account_id=personal) |

## Recovery

1. Download the required version, verify the recorded SHA256 and extract outside a source checkout. The transfer's inner source archive must hash to `133370824ef7478610254480aee9cd27c3ed232a2c57a8964b80c88be59d833a`; its original Git tree is `bedda11cd05a8b50fb061fe8fb4ff18caa50a132` at fd6bcf8.
2. Read `HANDOFF.md` and `CONSUMER-4758-NEXT.md` in the transfer, then `RECOVERY.md` and `MANIFEST.sha256` in the evidence archive. Recheck the live lane, consolidated ref, PR and exact statuses before writing. Dot Remote remains frozen.
3. Use the runtime matching the candidate's `scripts/emulator-runtime-pin.json`; verify all ten files. Runtime257 WASM is `f289da826f6c2cf270a257c19e506cc0701cb00c27b7215e7f428475de27eb11`; runtime4758 WASM is `09d6be238be42c540a202aa962f3848d0a0bff79c4a02fc6e7c8aa76bdaaf30b`, from producer4758a9573e0a2a95e73cb054a74e0aad39d5741e. Set `DNBOX_EMULATOR_RUNTIME` to the verified runtime directory without copying it into source.
4. The qualified cloud/browser/environment paths and command are recorded in `RECOVERY.md`. Keep HOME unchanged, use a real non-symlink temporary directory, append loopback proxy exclusions, and run the unmodified `scripts/gate.sh remote --post` with normally sandboxed bundled Chromium. Preserve the complete output, exact exit and genuine status readback. Never manufacture PASS, substitute runtime bytes or weaken tests.
5. The recorded evidence version contains footer9fab's full gate, failures, focused regressions and independent review. Later versions may add native and post-merge receipts under the same Library identity; compare their own manifest/hash and the Space checkpoint rather than treating this historical version's size/hash as current.

No main writes, force-push, physical devices, Codex, Actions or gh-pages publication are authorized by this checkpoint. Credentials are reused only in their existing cloud configuration and are never copied into source or recovery artifacts.

## Integration visual proposals

`DnBOX-nightly-914d68e8-visual-proposals.tar.gz` contains 104 PNGs from the exact consolidated branch and their manifest. The archive is 71,107,155 bytes. SHA-256 is `2eaff64e56a4d67e7ae86a3038da7aa03cb59d83db3a6fa3e325ff144cb53b0a`. Download it, verify that digest, and extract to a scratch directory. The lane record identifies reviewed references and open defects. [Download visual proposals](https://chatgpt.com/library?file_id=libfile_fde3_f-820d699ca0148191b3eaafedefc33c4d_2021479872048191acbfdca1f870a539&account_id=personal).
