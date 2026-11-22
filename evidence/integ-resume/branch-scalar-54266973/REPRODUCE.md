# WIDE + #991 one-scalar software replay

The tested firmware source is `23df413621b7ce1b8a8cbf71b3e07775fcfe727d`. The measured host is `engine-native-wide` with SHA-256 `5dccda64220867a87a770ba1a669b251fff140d719b35d32de42b3084cb05793`. The Nightly patch applies to `c7b026cf86b3e153dcb3c564ced8fce25b9b3880` and has SHA-256 `e6670f6bb38ac83617880237c610d8bd937888cd26d7befc22a7a4d0052edc05`.

From the patched disposable Nightly tree, generate both staging artifacts using the existing catalog-review inputs. The one-row source and the two generated artifacts are byte-identical to the first reviewed staging packet. The newer WIDE host and USB receipts are separate requalification evidence.

```sh
nightly_proof=/tmp/dnbox-scalar-wide-recheck-fw0FxT
firmware_root=/tmp/dnbox-integration-production.BjDCyK/firmware
native_host="$firmware_root/build/host/dnr2-scratch/engine-native-wide"
replay_dir="$(mktemp -d /tmp/dnbox-wide-scalar-replay-XXXXXX)"

python3 -B tools/touchosc-parameters/production_scalar.py .qualify-inputs \
  --staging-browser-module "$replay_dir/candidate-catalog.mjs"
python3 -B tools/touchosc-parameters/pack.py --staging-review .qualify-inputs \
  --output "$replay_dir/reviewed-scalar-staging.tosc"
cmp "$replay_dir/candidate-catalog.mjs" "$nightly_proof/candidate-catalog.mjs"
cmp "$replay_dir/reviewed-scalar-staging.tosc" "$nightly_proof/reviewed-scalar-staging.tosc"

timeout 65s python3 -B "$nightly_proof/test_staging_browser.py" \
  "$replay_dir/candidate-catalog.mjs" "$native_host" "$replay_dir/staged-browser.json"
timeout 30s python3 -B "$nightly_proof/test_staging_lua.py" \
  . "$firmware_root" "$native_host" "$replay_dir/staged-lua.json"
```

Workspace confirms HELLO count/CRC, heartbeat, stored level 75 → 76, guarded Undo to 75, fresh readbacks and CLOSE. Closed, missing and ambiguous endpoints send no commands. Mismatched and silent HELLO cases never OPEN. A host-revoked lease returns STALE on the next heartbeat and disables Apply. Device requires both explicit port selections and sends only HELLO and two READs. Actual packed Lua performs checksum refusal, heartbeat, Apply, fresh readback, guarded Undo and CLOSE. Both tested FWSC packages independently reproduced the scalar round trip over emulated USB and refused a write after CLOSE.

Runtime publication and stock shipping admission remain on HOLD. This is local software evidence for the one scalar, without a physical-device or raw-serial claim.
