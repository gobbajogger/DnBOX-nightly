# Installer startup, restart and public reports

After the installed application answers with the exact selected device identity, the installer keeps the responding input and output pair and the displayed port name. It shows the startup check after the sample restoration and post-install scan have completed. The user can then unplug and reconnect the keyboard to the same USB port.

Restart confirmation requires both original endpoints to disconnect, followed by a new scan of the matching input and output IDs, with a single eligible keyboard and the exact application identity. A renamed or cached port can still answer the device check. The version matches only when its DnBOX version token and model match the selected package. If the browser assigns different endpoint IDs, it displays **Restart unconfirmed**. WebMIDI does not expose a hardware serial through this protocol.

The receipt includes the build ID, displayed version, source commit, package SHA-256, keyboard model, application identity, MIDI port name, browser, UTC time and observed checks. The user can inspect it before choosing **Report this install**. That button opens the GitHub issue editor for review and submission.

## Public issue form and counts

Both installers use the firmware repository's `.github/ISSUE_TEMPLATE/install-report.yml`. Its input IDs are `build_id`, `model`, `sha256`, `port_name`, `startup_ok`, `restart_ok`, `browser` and `notes`. The Notes field contains the complete JSON receipt. The generated title starts with `[Install report]`. Anyone can complete the form manually. Its published labels and dropdown values are covered by the rendered-form fixture in `tests/fixtures/install-report-rendered.md`.

The installer queries public issues with matching titles, considers open and closed issues and deduplicates issue numbers. An incomplete GitHub search or a search over 1,000 results triggers full issue pagination. The displayed count requires the selected build, model, SHA, successful startup and restart, and a matching reported port version. A live API failure displays an unavailable status. Owner hardware evidence remains in `hardware-tests.json`.

## MAIN and nightly composition

`web/product-site/install-reports.mjs` supplies the receipt tracker, public form and counter. Nightly's preview and qualified renderers inline this same source. The product installer embeds it as well. The MAIN integration patch carries the same module and the corresponding hooks in its standalone installer.

The application snapshot is created in `Updater.finishApplication` after the exact product marker succeeds. The selected package supplies `installBuild` at the admitted write entry point. After the post-write scan, the shared tracker observes the physical disconnect. The usual installer scan takes a ticket before querying the keyboard and returns the responding pair for comparison. No additional firmware transaction is needed for the restart check.

An admin view can call `loadInstallReports()` once, then use `countInstallReports(reports, installBuild(version, pkg, model))` for each known package identity. Including the version and source commit verifies ordinary reports entered with a tag, full commit, short SHA, or the form's example tag-and-commit notation.

Run the Node regression with `node --test tests/edge-install-reports.test.mjs`. For the actual browser flow, run `python3 tests/install-report-browser.py --site SITE --elite-package FWSC` with the built site directory and the original v0.0.26 Elite package. That test uses the real package verifier and application readback with virtual WebMIDI ports. It opens a local issue-form preview and submits nothing.
