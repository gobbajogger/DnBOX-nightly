# R039: repository rename preparation

## Scope and decisions

Prepare the existing repositories for a possible rename. No Settings, protection, access, default-branch, Pages or DNS change is included. No redirect repository is created. Final names are **proposed, not verified owner decisions**:

| Existing repository | Proposed name |
| --- | --- |
| gobbajogger/X0X37-for-Loopy-Pro | DnBOX |
| gobbajogger/x0x37-for-Loopy-Pro_nightly | DnBOX-nightly |

The existing name-compatibility implementation is pinned at [addc3e518c4374895f23448b484462afc9100a4a](https://github.com/gobbajogger/x0x37-for-Loopy-Pro_nightly/commit/addc3e518c4374895f23448b484462afc9100a4a). It accepts only the explicit old/proposed names in the existing identity checks. It does not reserve names or authorize the rename. Current URLs remain canonical until the owner performs and verifies the change. Historical receipts, license notices, build history and hashes are not rewritten.

## Separate source and delivery identities

| Repository | Role/ref | Verified snapshot head |
| --- | --- | --- |
| X0X37-for-Loopy-Pro | production main | 035026fe70059af35e25c7c121b40f318b732fe3 |
| X0X37-for-Loopy-Pro | maintained development nightly | 2dd06b46ff037f858765ddf40275d8da02a9066c |
| X0X37-for-Loopy-Pro | active #869 integration lane | 94197fc839b00aff47b98ca02f3c6396e4a6eabf |
| X0X37-for-Loopy-Pro | published website gh-pages | cd345c949da096ee093dfd70bfadc6b185f6e2ed |
| x0x37-for-Loopy-Pro_nightly | browser source main | 8af48f83c21e76bc7ebac2ddbdb7c5e3ff0a81ea |
| x0x37-for-Loopy-Pro_nightly | published website gh-pages | 241196130538b5e6da7738f0c2ebbbdc57fce02e |

These are a dated snapshot, not interchangeable trees or qualification evidence. The R039 branches retain their existing bases: firmware production main and nightly browser-source main. They must not be merged as a substitute for firmware integration or a Pages publication. Current implementation owners retain their lanes; the project lead owns roadmap updates. The repository steward owns this preparation, not firmware, sound or website source integration.

## URL/cutover checklist

- GitHub repository, issue, PR and commit routes must be checked after rename. Do not create another repository at the old name, which can break GitHub redirects.
- GitHub project Pages URLs are **not automatically redirected** on repository rename. The current project paths are /X0X37-for-Loopy-Pro/ and /x0x37-for-Loopy-Pro_nightly/. Proposed paths /DnBOX/ and /DnBOX-nightly/ are not live destinations promised by this preparation.
- Before an owner rename, the website owner must prepare and locally verify live navigation, absolute asset paths, installer/catalog discovery, release-download routes, manual, breaks, projects, Remote/emulator routes and internal links for the agreed paths. Preserve existing firmware catalogs/packages byte-for-byte. Do not rewrite sealed source/evidence/history.
- Re-read source and deployed heads immediately before cutover. Record exact qualified website input, Pages ref and HTTP byte results separately. A repository redirect is not proof of a working installer or site.
- Keep local remote configuration changes separate and owner-authorized. Project transport remains the GitHub connector/API, never network Git. This document does not instruct a clone, fetch or push.
- No custom domain, redirect host, new repository or protection change is part of this preparation. No workflow is created, edited or run. The firmware preparation removes the two inherited workflow files `.github/workflows/pages.yml` and `.github/workflows/smc-host-regressions.yml` under the current no-Actions rule; the nightly source has no workflow files. If the old Pages address must remain usable, agree a separately authorized routing plan before rename.

GitHub documents repository redirects, the Pages exception and the Settings rename procedure in [Renaming a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

## Exact owner Settings steps, after readiness is satisfied

1. Confirm the final names and the Pages cutover/recovery plan. Do not proceed merely because the preparation PR exists.
2. Open [x0x37-for-Loopy-Pro_nightly Settings](https://github.com/gobbajogger/x0x37-for-Loopy-Pro_nightly/settings). In General, find Repository name. If the proposed name is accepted, replace **x0x37-for-Loopy-Pro_nightly** with **DnBOX-nightly** and click **Rename**.
3. Separately open [X0X37-for-Loopy-Pro Settings](https://github.com/gobbajogger/X0X37-for-Loopy-Pro/settings). Only if its name and cutover are accepted, replace **X0X37-for-Loopy-Pro** with **DnBOX** and click **Rename**.
4. Do not change default branches, branch protections, access or Pages configuration as a side effect. Record actual resulting repository URLs/IDs, read back source heads, then let the existing website publisher verify the agreed live routes without a device write.
5. If a route or identity fails, stop the cutover and preserve the exact failure and pre-change heads. Any reversal of a rename or hosting change is a separate owner action, not an automated retry.

The owner has not performed these steps as part of this work. Name availability, final name approval, cutover HTTP results and recovery behavior remain unverified.

