# SMK-37 development packages for the Remote lane

Both packages were freshly built from the clean paired firmware branch `integration/dnbox-consolidated` at [`f1786ebec2616477163b62b029c7e77405a9c3de`](https://github.com/gobbajogger/DnBOX/commit/f1786ebec2616477163b62b029c7e77405a9c3de), tree `a4876790880cae769298f6701e8ab5db1d970b30`. These are stock firmware development packages accompanying the Remote checkout. They retain the stock ED_INFO path. The [stock DNR2 probe](../../remote-protocol/stock-f1786ebe/README.md) recorded zero reply bytes to HELLO. Physical keyboard verification remains open.

| Model | Package size | CRC32 | XIP free | Pool margin above 8 KiB |
|---|---:|---|---:|---:|
| Elite | 651,732 | `4f0ac8ea` | 1,228 B | 832 B |
| Pro | 651,730 | `29443b7e` | 1,236 B | 832 B |

Use JieLi Linux toolchains 20260730.1 and AC79 SDK 1.2.14 dated 2026-10-13. The [manifest](manifest.json) identifies their archives, the three verified SDK inputs, both package SHA-256 digests, and the original log digests. Set the paths to the extracted inputs and build the clean firmware checkout.

```sh
AC79_SDK=/path/to/pinned-sdk JIELI_TOOLCHAIN=/path/to/pinned-toolchain X0X_DEV_PADCAL=1 MODEL=elite bash build.sh
AC79_SDK=/path/to/pinned-sdk JIELI_TOOLCHAIN=/path/to/pinned-toolchain X0X_DEV_PADCAL=1 MODEL=pro bash build.sh
```

Both builds exited zero. The SDK pin test accepted the recovered members and rejected a deliberately wrong SDK. The flash map passed. The source package inspector checked product identity, loader marker, and archive CRCs. Repacking the compiled app and loader reproduced both complete packages byte for byte and matched their three-slot map. Each build meets the 1,024 B XIP and 512 B pool-margin thresholds. These packages use the unversioned model `_900` identities. Compilation produced app `.bin` files and `.fwsc` packages. The execution record contains no physical transactions.
