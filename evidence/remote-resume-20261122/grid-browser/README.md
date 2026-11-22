# Grid-only Chromium viewport witness

Starting source head: `4d12b644a4c13723c512cdc5f45b200d77aed27d`. This fixture imports its exact `web/product-site/remote/grid.mjs` module, removes only the ESM `export` token to inline it into a stand-alone browser page, and paints nine extreme/normal width cases. It is deliberately **not the complete Remote**.

Run with `python3 tests/product-workspace/grid-collapse-browser.py` (Python Playwright, Chromium). In the restricted cloud runtime a local HTTP request to 127.0.0.1 was blocked by administrator policy; the committed harness uses `page.set_content` instead, with the exact module inlined. No network source was substituted.

Observed Chromium 144.0.7559.96:

```text
PASS grid-only 844x390 rows=9 document=844x390 viewport=844x390 overflow=0 pageerrors=0
PASS grid-only 390x844 rows=9 document=390x844 viewport=390x844 overflow=0 pageerrors=0
PASS 2/2 grid-only browser viewports (not complete Remote page acceptance)
```

Source blob SHA: `web/product-site/remote/grid.mjs` `dbe162c5f2c7ce4ad8fa8ce7f93159b286e8d57d`. The JavaScript source and test input file bytes were verified against that Git blob before the browser run.

The two PNG screenshots, complete standard output, fixture files and SHA-256 manifest are saved in personal Library `/LoopyX0X37/Project Sources/remote-resume-4d12b644-grid-browser-844x390-390x844.zip` (archive SHA-256 `f0650fd79e4a87ba5eda9568ec4cfb6b2c4b05fe4211243d2d6c033ce8eda418`).

**Scope boundary:** this proves only zero viewport overflow/page errors in the isolated nine-case SVG renderer fixture. It does **not** resolve the owner PDF drum grid 6×16 density, source glyph parity, real Remote landscape scroll/overflow, original SuperJ6 AU literal names, stock hardware read/edit/undo/read-back, or the full Local/edge/Remote gate.
