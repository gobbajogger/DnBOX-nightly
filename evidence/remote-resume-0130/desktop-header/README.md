# Desktop owner header comparison

The locked PDF's pages 1, 2, 12 and 13 share the same native 1440×900 header metrics. The brand is 34 px at x=30 with baseline y=54, the first two tabs use 22 px at x=30 and x=253 with baseline y=119, and the first two engine labels use 19 px at x=71 and x=230 with baseline y=181. The divider spans x=30–1410 at y=87. At 1440×900 the approved page-01 PNG and the locked PDF agree within 1.10–1.57% in each of three header bands. `visual_gate.py` compares the approved image after scaling to 1024 px in the registered 1024×640 case.

The isolated Chromium 151.0.7922.34 run served the built Remote app and substituted the exact current narrow/Projects CSS or that CSS plus one wide-desktop prototype. The app and HTML served match the corresponding Git files from `183207ed2b7dd7b346ca5871408b292df4fb0ae2`. The prototype starts at 1340×820, uses the same shared header HTML on all views and preserves its right-side Undo, Redo and More row. The owner drawing positions transport at the right edge where a rendering of those additional actions would have to go. Each mode exercised 48 measurements across eight sizes with actual navigation, engine selection in Patterns, More and Motion. Available header controls had reachable centers, no measured header intersections or overflow, and zero page errors. The three other registered sizes had zero pixels above the 25.5-channel tolerance. These bounded checks do not cover every possible native or imported title.

| Owner comparison at 1440×900 | Current | Prototype |
| --- | ---: | ---: |
| Page 1, first 200 px | 9.565% | 5.567% |
| Page 1, full frame | 9.152% | 8.429% |
| Page 12, first 200 px | 9.033% | 5.606% |
| Page 12, full frame | 6.432% | 7.641% |
| Page 12, Projects actions within initial viewport | 13/13 | 7/13 |

The candidate header expands from 147 px to 201 px. On Projects it pushes Samples, Manual, Open DAW guide, Save draft, Open draft and Review changes below the initial view. Keep the current header and Projects geometry. A future desktop design needs to pair header scale with body density across the affected screens, while retaining history and transport control access. The 2% owner target remains open. The area measurements, screenshots and prototype diff explain the decision. Neither the prototype nor its screenshots are final candidate inputs.
