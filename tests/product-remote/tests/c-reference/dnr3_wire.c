/* SPDX-License-Identifier: GPL-3.0-only */
#include "dnr3_wire.h"
static const uint8_t head[5] = {0xF0, 0x7D, 0x44, 0x4E, 0x03};
uint32_t dnr3_crc32(const uint8_t *p, size_t n) {
    uint32_t c = 0xFFFFFFFFu;
    while (n--) { c ^= *p++; for (unsigned k = 0; k < 8; k++) c = (c & 1u) ? 0xEDB88320u ^ (c >> 1) : c >> 1; }
    return ~c;
}
size_t dnr3_put(uint8_t *out, uint32_t v, unsigned width) {
    for (unsigned i = 0; i < width; i++) { out[i] = (uint8_t)(v & 0x7Fu); v >>= 7; }
    return width;
}
uint32_t dnr3_get(const uint8_t *in, unsigned width) {
    uint32_t v = 0;
    for (unsigned i = width; i-- > 0;) v = (v << 7) | (in[i] & 0x7Fu);
    return v;
}
size_t dnr3_pack7(uint8_t *out, const uint8_t *raw, size_t n) {
    size_t o = 0;
    for (size_t k = 0; k < n; k += 7) {
        size_t m = o++, count = n - k < 7 ? n - k : 7;
        out[m] = 0;
        for (size_t j = 0; j < count; j++) { out[m] |= (uint8_t)((raw[k + j] >> 7) << j); out[o++] = raw[k + j] & 0x7Fu; }
    }
    return o;
}
int dnr3_unpack7(uint8_t *raw, const uint8_t *wire, size_t n) {
    size_t at = 0;
    for (size_t k = 0; k < n; k += 7) {
        size_t count = n - k < 7 ? n - k : 7;
        uint8_t m = wire[at++];
        if (m >> count) return DNR3_E_RANGE;
        for (size_t j = 0; j < count; j++) {
            if (wire[at] & 0x80u) return DNR3_E_RANGE;
            raw[k + j] = (uint8_t)(wire[at++] | (((m >> j) & 1u) << 7));
        }
    }
    return DNR3_OK;
}
size_t dnr3_encode(uint8_t out[DNR3_MAX_FRAME], uint8_t op, uint16_t seq, const uint8_t *payload, uint16_t len) {
    if (op > 0x7F || seq > 0x3FFF || len > DNR3_MAX_PAYLOAD) return 0;
    size_t o = 0;
    for (unsigned i = 0; i < 5; i++) out[o++] = head[i];
    out[o++] = op;
    o += dnr3_put(out + o, seq, 2);
    o += dnr3_put(out + o, len, 2);
    for (uint16_t i = 0; i < len; i++) { if (payload[i] & 0x80u) return 0; out[o++] = payload[i]; }
    o += dnr3_put(out + o, dnr3_crc32(out + 5, o - 5), 5);
    out[o++] = 0xF7;
    return o;
}
int dnr3_decode(dnr3_frame *f, const uint8_t *frame, size_t n) {
    if (n < DNR3_OVERHEAD || n > DNR3_MAX_FRAME) return DNR3_E_LENGTH;
    for (unsigned i = 0; i < 5; i++) if (frame[i] != head[i]) return DNR3_E_HEADER;
    if (frame[n - 1] != 0xF7) return DNR3_E_HEADER;
    for (size_t i = 1; i < n - 1; i++) if (frame[i] & 0x80u) return DNR3_E_RANGE;
    uint16_t len = (uint16_t)dnr3_get(frame + 8, 2);
    if ((size_t)len != n - DNR3_OVERHEAD) return DNR3_E_LENGTH;
    if (dnr3_get(frame + 10 + len, 5) != dnr3_crc32(frame + 5, 5u + len)) return DNR3_E_CRC;
    f->op = frame[5];
    f->seq = (uint16_t)dnr3_get(frame + 6, 2);
    f->len = len;
    f->payload = frame + 10;
    return DNR3_OK;
}
