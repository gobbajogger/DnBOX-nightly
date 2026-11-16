## License

MIT License

Copyright (c) 2026 FunkyBeats Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


## DnBOX source port provenance

Upstream: https://github.com/pepperonas/funkybeats at commit `809e1e78407f7bf315eee8655387eca8b7ac465b`, `app.js` Git blob `f31a9a5b4fa10bfcf4ee634360f1d9320ef3a4d7`. The complete MIT notice above is taken from the upstream README license section.

`vendor/funkybeats-core.mjs` ports SequencerState, the DOM helper, sequencer and performance-grid builders, native-domain parameter-slider builder, and duration/velocity expressions. Configuration and typed DnBOX source adapters are explicit; sequencer step divs become accessible buttons. The upstream AudioEngine, scheduler, MIDI/network/AI integrations, browser bootstrap and Actions workflow are not imported. Local editing does not qualify device transport or a native pattern schema.
