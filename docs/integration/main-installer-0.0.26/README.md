# MAIN installer release selection

This patch targets the published tree in `gobbajogger/DnBOX` at `gh-pages` commit `5a4520f4e4cbb8ee1784bd7d47229da5f8b351a3`. It updates the landing page, the installer with its embedded catalog, and the standalone `versions.json`. The Web draft carries the patch for cross-repository review. Applying the patch locally prepares the three files for the MAIN Pages owner to review.

| Picker entry | Firmware source | Verified release assets |
| --- | --- | --- |
| 0.0.26 · Latest | `94197fc839b00aff47b98ca02f3c6396e4a6eabf` | [v0.0.26 Elite and Pro](https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.26) |
| 0.0.25.1 · Fallback | `79280e763341d03ba43266d3e25dad66f12de860` | [v0.0.25.1 Elite and Pro](https://github.com/gobbajogger/DnBOX/releases/tag/v0.0.25.1) |

The owner reports successful startup and restart on Elite and Pro at 0.0.26. The 0.0.25.1 release records an Elite test without a confirmed package hash. Pro has no recorded device test at that version. The fallback firmware reports 0.0.25 and GIT 79280e76.

## Apply in an isolated, offline checkout

Set `handoff` to this directory in the Web draft. Set `pages` to a clean, detached local checkout of the specified MAIN Pages commit.

```sh
test "$(git -C "$pages" rev-parse HEAD)" = 5a4520f4e4cbb8ee1784bd7d47229da5f8b351a3
git -C "$pages" apply --check --index "$handoff/main-pages.patch"
git -C "$pages" apply --index "$handoff/main-pages.patch"
```

The deployed installer includes MAIN-specific admission checks and update safeguards from direct Pages commits. Its source is `install/index.html` on this Pages branch. The firmware source tree also has a generic `web/x0x_installer.html` template and `tools/make_pages.py` generator. Regenerating the entire site from that generic template would replace the MAIN-specific installer.

## Reproduce the browser check

Download both original `.fwsc` assets from each tagged release above into `$assets/v0.0.26/` and `$assets/v0.0.25.1/`, retaining the published filenames. Use Python with Playwright and the matching sandboxed Chromium installed.

```sh
python "$handoff/main_installer_release_browser.py" "$pages" "$assets"
```

The check opens the patched landing page, follows the installer link, checks the default and fallback, selects both models, downloads all four verified Blobs and compares their sizes, CRC32s and SHA-256s against the release manifests. It verifies the bundled controller and acknowledgement gates, opens each model-specific write confirmation and cancels there. A same-length corrupted package is rejected, and changing the approved source removes the entry from the picker. All requests in this replay use local files.

On 2026-11-21, all six browser cases passed. The four content-addressed URLs under `https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/` also returned HTTP 200 directly with the official sizes and SHA-256s. The URLs and original package filenames for 0.0.25.1 are retained. This verification covers the patched website and downloaded packages. A hardware update was outside its scope.
