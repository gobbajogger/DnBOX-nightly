// SPDX-License-Identifier: GPL-3.0-only
// Read the same two panel-order bytes as the native LCD. The reference PNG
// exporter uses integer division when expanding the 5/6-bit color channels.
export function paintFrame(context, bytes) {
  if (bytes.byteLength !== 240 * 240 * 2) throw new Error('Invalid LCD frame size');
  const frame = context.createImageData(240, 240);
  for (let pixel = 0; pixel < 240 * 240; pixel++) {
    const color = bytes[2 * pixel] * 256 + bytes[2 * pixel + 1];
    const offset = 4 * pixel;
    frame.data[offset] = Math.floor((color >> 11) * 255 / 31);
    frame.data[offset + 1] = Math.floor((color >> 5 & 63) * 255 / 63);
    frame.data[offset + 2] = Math.floor((color & 31) * 255 / 31);
    frame.data[offset + 3] = 255;
  }
  context.putImageData(frame, 0, 0);
}
