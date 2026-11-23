/* SPDX-License-Identifier: GPL-3.0-only
 * DNR3 framing reference (REMOTE-FW-PROTOCOL.md section 3). Byte-exact against
 * tests/product-remote/dnr3-vectors.json and web/product-site/remote/dnr3.mjs.
 * Freestanding C11: no malloc, no stdio. FW Core may copy it into firmware/src/app/. */
#ifndef DNBOX_DNR3_WIRE_H
#define DNBOX_DNR3_WIRE_H
#include <stddef.h>
#include <stdint.h>
#define DNR3_MAX_FRAME 256u
#define DNR3_OVERHEAD 16u
#define DNR3_MAX_PAYLOAD (DNR3_MAX_FRAME - DNR3_OVERHEAD)
enum { DNR3_OK = 0, DNR3_E_LENGTH = 1, DNR3_E_HEADER = 2, DNR3_E_RANGE = 3, DNR3_E_CRC = 4 };
typedef struct { uint8_t op; uint16_t seq; uint16_t len; const uint8_t *payload; } dnr3_frame;
uint32_t dnr3_crc32(const uint8_t *p, size_t n);
/* 7-bit groups, low first. width = 1 (u7), 2 (u14), 3 (u21), 4 (u28), 5 (u32). Returns bytes written/read. */
size_t dnr3_put(uint8_t *out, uint32_t v, unsigned width);
uint32_t dnr3_get(const uint8_t *in, unsigned width);
/* ed_put7 packing: per 7 raw bytes, one high-bit byte (bit j = bit 7 of byte j) then the low 7 bits. */
size_t dnr3_pack7(uint8_t *out, const uint8_t *raw, size_t n);
int dnr3_unpack7(uint8_t *raw, const uint8_t *wire, size_t n); /* n raw bytes; reads n + ceil(n/7) */
/* Full frame F0..F7. Returns frame length, or 0 if op/seq/len out of range. */
size_t dnr3_encode(uint8_t out[DNR3_MAX_FRAME], uint8_t op, uint16_t seq, const uint8_t *payload, uint16_t len);
/* Validates header, 7-bit bytes, length and CRC. f->payload points into the frame. Returns DNR3_OK or DNR3_E_*. */
int dnr3_decode(dnr3_frame *f, const uint8_t *frame, size_t n);
#endif
