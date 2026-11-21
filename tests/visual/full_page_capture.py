# SPDX-License-Identifier: GPL-3.0-only
"""Capture long Builds and archived Manual pages without allocating one giant Chromium surface."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import struct
import time
import zlib

import numpy as np
from PIL import Image
from PIL.PngImagePlugin import putchunk


BAND_ROWS = 24_576
SINGLE_CAPTURE_PIXELS = 32 * 1024 * 1024
GEOMETRY = """() => {
  const elements = [document.documentElement, document.body];
  const size = axis => Math.max(...elements.flatMap(e =>
    ['client', 'scroll', 'offset'].map(key => e[key + axis])));
  return [size('Width'), size('Height'), scrollX, scrollY, innerWidth, innerHeight, devicePixelRatio];
}"""

# The archived Manual uses the body's solid color as the document canvas.
# Require that exact CSS case before accepting first-paint rounding below the native clip.
MANUAL_BACKGROUND = r"""() => {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  if (root.backgroundImage !== 'none' || root.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
      body.backgroundImage !== 'none') return null;
  const rgb = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(body.backgroundColor);
  return rgb ? rgb.slice(1).map(Number) : null;
}"""
MANUAL_MAX_PAINT_GROWTH = 16
MANUAL_BAND_ROWS = 2048


def remaining_ms(deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError('Complete full-page screenshot exceeded 30 seconds')
    return max(1, int(1_000 * remaining))


def verify_png(png):
    # A decoder can recover pixels from a corrupt IDAT checksum or absent IEND.
    # Walk the actual chunk boundaries so trailing data cannot hide after IEND.
    if not png.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Expected PNG screenshot')
    data = memoryview(png)
    offset = 8
    while offset + 12 <= len(data):
        size, kind = struct.unpack_from('>I4s', data, offset)
        end = offset + 8 + size
        if end + 4 > len(data) or zlib.crc32(data[offset + 4:end]) != struct.unpack_from('>I', data, end)[0]:
            raise ValueError('Invalid PNG screenshot chunk')
        offset = end + 4
        if kind == b'IEND':
            if size == 0 and offset == len(data):
                return
            break
    raise ValueError('Incomplete or invalid PNG screenshot end chunk')


def capture_full_page(page, route, name):
    try:
        short_manual = route in ('manual/projects-guide.html', 'manual/protocol.html')
        if not short_manual and route not in ('builds/index.html', 'manual/original/index.html', 'manual/legacy.html'):
            return page.screenshot(full_page=True)
        deadline = time.monotonic() + 30
        geometry = page.evaluate(GEOMETRY)
        width, height = geometry[:2]
        long_archive = route == 'manual/legacy.html'
        needs_bands = geometry[-1] == 1 and height > BAND_ROWS and (long_archive or width * height > SINGLE_CAPTURE_PIXELS)
        if short_manual or needs_bands:
            # Chromium can finish fractional layout on its first compositor capture.
            # Paint one pixel first, then size and check every stored band on the settled page.
            page.screenshot(full_page=True, clip=dict(x=0, y=0, width=1, height=1), timeout=remaining_ms(deadline))
            painted = page.evaluate(GEOMETRY)
            if painted[0] != width or painted[2:] != geometry[2:]:
                raise ValueError('Document viewport changed before the full-page capture')
            if short_manual:
                # On the phone Protocol page the first paint moves the final link below
                # the initial capture height. Require every pixel of the stable document.
                data = page.screenshot(full_page=True, timeout=remaining_ms(deadline))
                verify_png(data)
                with Image.open(BytesIO(data), formats=['PNG']) as image:
                    if list(image.size) != painted[:2]:
                        raise ValueError('Screenshot extent differs from the painted document')
                    image.load()
                if page.evaluate(GEOMETRY) != painted:
                    raise ValueError('Document changed during the full-page capture')
                remaining_ms(deadline)
                return data
            if route == 'manual/original/index.html':
                if not 0 <= painted[1] - height <= MANUAL_MAX_PAINT_GROWTH:
                    raise ValueError('Original Manual height changed beyond first-paint rounding')
                # Playwright chooses the native full-page clip from the initial document size.
                return capture_bands(page, painted, deadline, native_height=height)
            if long_archive:
                # The SMK manual reflows by up to several text rows on first paint.
                # Its reference covers the entire settled document, including the footer.
                rows = MANUAL_BAND_ROWS
                if width <= 480 and painted[4] < painted[5]:
                    # A narrow portrait tile stays under 16 MiB decoded at DPR 1.
                    # Fewer native captures avoid repeating the compositor setup.
                    rows = min(rows * 4, (4 * 1024 * 1024) // width)
                return capture_bands(page, painted, deadline, band_rows=min(BAND_ROWS, rows))
            return capture_bands(page, painted, deadline)
        data = page.screenshot(full_page=True, timeout=remaining_ms(deadline))
        verify_png(data)
        with Image.open(BytesIO(data), formats=['PNG']) as image:
            image.load()
        remaining_ms(deadline)
        return data
    except Exception as error:
        raise RuntimeError(f'{name} full-page capture failed: {error}') from error


def capture_bands(page, geometry, deadline, *, native_height=None, band_rows=None):
    width, painted_height = geometry[:2]
    height = painted_height if native_height is None else native_height
    output = BytesIO()
    encoder = zlib.compressobj(1)
    mode = None
    last_row = None
    written_rows = 0

    def append_band(png, rows, overlap):
        nonlocal mode, last_row, written_rows
        verify_png(png)
        with Image.open(BytesIO(png)) as tile:
            if tile.format != 'PNG' or tile.mode not in ('RGB', 'RGBA') or tile.size != (width, rows + overlap):
                raise ValueError(f'Unexpected screenshot band {tile.format} {tile.mode} {tile.size}')
            if mode is None:
                mode = tile.mode
                output.write(b'\x89PNG\r\n\x1a\n')
                color_type = 2 if mode == 'RGB' else 6
                putchunk(output, b'IHDR', struct.pack('>IIBBBBB', width, height, 8, color_type, 0, 0, 0))
            if mode != tile.mode or (overlap and tile.crop((0, 0, width, 1)).tobytes() != last_row):
                raise ValueError('Screenshot bands disagree at the seam')
            for top in range(overlap, tile.height, 128):
                bottom = min(tile.height, top + 128)
                pixels = np.asarray(tile.crop((0, top, width, bottom))).reshape(bottom - top, -1)
                # PNG scanlines each begin with their filter byte. Zero preserves every channel as captured.
                scanlines = np.empty((len(pixels), pixels.shape[1] + 1), dtype=np.uint8)
                scanlines[:, 0] = 0
                scanlines[:, 1:] = pixels
                chunk = encoder.compress(scanlines)
                if chunk:
                    putchunk(output, b'IDAT', chunk)
            last_row = tile.crop((0, tile.height - 1, width, tile.height)).tobytes()
            written_rows += rows

    if band_rows is None:
        band_rows = BAND_ROWS if native_height is None else min(BAND_ROWS, MANUAL_BAND_ROWS)
    # Only compression overlaps the next read. Chromium captures in order on the original viewport.
    with ThreadPoolExecutor(max_workers=1) as worker:
        pending = None
        for y in range(0, height, band_rows):
            rows = min(band_rows, height - y)
            overlap = int(y > 0)
            clip = dict(x=0, y=y - overlap, width=width, height=rows + overlap)
            png = page.screenshot(full_page=True, clip=clip, timeout=remaining_ms(deadline))
            if pending is not None:
                pending.result()
            pending = worker.submit(append_band, png, rows, overlap)
        pending.result()
    if native_height is not None and native_height != painted_height:
        # Capture the shared seam and every pixel below the native rectangle. Reject
        # even one content-bearing pixel, including a uniform foreground-colored strip.
        background = page.evaluate(MANUAL_BACKGROUND)
        if background is None:
            raise ValueError('Original Manual canvas background is not a solid opaque color')
        clip = dict(x=0, y=height - 1, width=width, height=painted_height - height + 1)
        strip = page.screenshot(full_page=True, clip=clip, timeout=remaining_ms(deadline))
        verify_png(strip)
        with Image.open(BytesIO(strip), formats=['PNG']) as tail:
            color = tuple(background) + ((255,) if mode == 'RGBA' else ())
            if (tail.size != (width, clip['height']) or tail.mode != mode or
                    tail.crop((0, 0, width, 1)).tobytes() != last_row or
                    tail.getextrema() != tuple((channel, channel) for channel in color)):
                raise ValueError('Original Manual gained visible content below its native rectangle')
        if page.evaluate(MANUAL_BACKGROUND) != background:
            raise ValueError('Original Manual canvas background changed during capture')
    if written_rows != height or page.evaluate(GEOMETRY) != geometry:
        raise ValueError('Document geometry changed during the full-page capture')
    putchunk(output, b'IDAT', encoder.flush())
    putchunk(output, b'IEND', b'')
    data = output.getvalue()
    remaining_ms(deadline)
    return data
