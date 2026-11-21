// SPDX-License-Identifier: GPL-3.0-only
// Observe owning-port traffic without retaining native pixel buffers.
window.soundPackets = [];
window.soundErrors = [];
window.soundRequests = [];
window.nativePackets = [];
window.nativeFrames = [];
window.nativeNodes = [];
window.midiCalls = 0;
navigator.requestMIDIAccess = () => { midiCalls++; throw Error('No devices'); };

const AW = AudioWorkletNode;
window.AudioWorkletNode = class extends AW {
  constructor(...args) {
    super(...args);
    nativeNodes.push(this);
    window.nativeContext = args[0];
    window.nativeFrames = [];
    window.nativePackets = [];
    const post = this.port.postMessage.bind(this.port);
    this.port.postMessage = (message, ...rest) => {
      if (message?.type === 'sound-controls') soundRequests.push(structuredClone(message));
      return post(message, ...rest);
    };
    this.port.addEventListener('message', ({data: message}) => {
      if (message?.type === 'sound-result') soundPackets.push(message);
      if (message?.type === 'sound-error') soundErrors.push(message);
      if (this !== nativeNodes.at(-1)) return;
      if (message?.type === 'envelopes') {
        // Chicago checks the latest five complete envelope packets.
        if (nativePackets.length === 5) nativePackets.shift();
        nativePackets.push(message);
      }
      if (message?.type === 'frame') {
        // Only the playing fixture checks the count and fields of every frame.
        if (!window.recordNativeFrameHistory) nativeFrames.length = 0;
        nativeFrames.push({playing: message.playing, time: message.time,
                           framebufferLength: message.framebuffer?.length});
      }
    });
    this.port.start();
  }
};
