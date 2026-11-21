# SPDX-License-Identifier: GPL-3.0-only
"""Compare tall screenshots without allocating a full-height difference array."""
import io
import struct
import zlib

import numpy as np
from PIL import Image
from PIL.PngImagePlugin import putchunk

from full_page_capture import verify_png


def _inflated_strips(data, stride, height, rows_per_strip):
    """Yield complete filtered scanlines and verify the exact zlib output length."""
    decoder = zlib.decompressobj()
    output = bytearray()
    remaining = height
    view = memoryview(data)
    offset = 8
    while offset < len(view):
        size, kind = struct.unpack_from('>I4s', view, offset)
        start = offset + 8
        end = start + size
        offset = end + 4
        if kind != b'IDAT':
            continue
        for pos in range(start, end, 65536):
            # PNG 11.2.3 permits unused trailing bytes after the final zlib stream.
            if decoder.eof:
                break
            compressed = view[pos:min(pos + 65536, end)]
            while compressed and not decoder.eof:
                rows = min(remaining, rows_per_strip)
                want = rows * stride - len(output) if remaining else 1
                try:
                    raw = decoder.decompress(compressed, want)
                except zlib.error as error:
                    raise OSError('Invalid compressed PNG scanlines') from error
                if not remaining and raw:
                    raise OSError('Extra data after PNG scanlines')
                output.extend(raw)
                compressed = decoder.unconsumed_tail
                if remaining and len(output) == rows * stride:
                    yield output
                    remaining -= rows
                    output = bytearray()
    if remaining or output or not decoder.eof:
        raise OSError('Incomplete PNG scanlines')


class Screenshot:
    def __init__(self, encoded):
        self.encoded = encoded
        with Image.open(io.BytesIO(encoded), formats=['PNG']) as image:
            self.size = image.size
            self.mode = image.mode
            # The packed layout is used only for noninterlaced, 8-bit truecolor PNG.
            header = encoded[24:29]
            self.packed = (header in (b'\x08\x02\0\0\0', b'\x08\x06\0\0\0')
                           and not image.is_animated)
            image.verify()
        verify_png(encoded)

    def rgb_strips(self):
        width, height = self.size
        rows_per_strip = max(1, min(128, (1 << 20) // (4 * width)))
        if not self.packed:
            # Preserve Pillow's palette, grayscale, interlace and conversion semantics.
            # Even in this fallback only the current strip becomes an RGB/NumPy array.
            with Image.open(io.BytesIO(self.encoded), formats=['PNG']) as image:
                for y in range(0, height, rows_per_strip):
                    strip = image.crop((0, y, width, min(y + rows_per_strip, height)))
                    yield np.asarray(strip.convert('RGB'))
            return

        channels = 4 if self.mode == 'RGBA' else 3
        stride = width * channels + 1
        previous = bytes(stride - 1)
        for raw in _inflated_strips(self.encoded, stride, height, rows_per_strip):
            filtered = np.frombuffer(raw, dtype=np.uint8).reshape(-1, stride)
            rows = len(filtered)
            if not filtered[:, 0].any():
                pixels = filtered[:, 1:].reshape(rows, width, channels)
                previous = pixels[-1].tobytes()
                yield pixels[:, :, :3]
            else:
                # The first decoded row supplies the previous-row context for Up,
                # Average and Paeth. Pillow's native PNG decoder applies every filter.
                packed = zlib.compress(b'\0' + previous + raw, 0)
                with Image.frombytes(self.mode, (width, rows + 1), packed, 'zip', self.mode) as image:
                    previous = image.crop((0, rows, width, rows + 1)).tobytes()
                    yield np.asarray(image.crop((0, 1, width, rows + 1)).convert('RGB'))

    def validate_pixels(self):
        # Ordinary byte-identical references need a single native decode and no arrays.
        if self.size[0] * self.size[1] <= 8 * 1024 * 1024 or not self.packed:
            with Image.open(io.BytesIO(self.encoded), formats=['PNG']) as image:
                image.load()
            return
        for _ in self.rgb_strips():
            pass


def compared_strips(actual, reference, pixel_threshold):
    for sample, expected in zip(actual.rgb_strips(), reference.rgb_strips(), strict=True):
        delta = np.asarray(sample, dtype=np.int16) - np.asarray(expected, dtype=np.int16)
        mask = np.abs(delta).max(axis=2) > pixel_threshold
        yield expected, mask


def write_diff(output, actual, reference, pixel_threshold):
    width, height = reference.size
    output.write(b'\x89PNG\r\n\x1a\n')
    putchunk(output, b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    encoder = zlib.compressobj(1)
    for expected, mask in compared_strips(actual, reference, pixel_threshold):
        pixels = (expected * 0.3).astype(np.uint8)
        pixels[mask] = [255, 0, 255]
        rows = np.empty((len(pixels), width * 3 + 1), dtype=np.uint8)
        rows[:, 0] = 0
        rows[:, 1:] = pixels.reshape(len(pixels), -1)
        compressed = encoder.compress(rows)
        if compressed:
            putchunk(output, b'IDAT', compressed)
    putchunk(output, b'IDAT', encoder.flush())
    putchunk(output, b'IEND', b'')
