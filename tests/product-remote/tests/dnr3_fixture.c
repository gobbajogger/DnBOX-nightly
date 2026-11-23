/* SPDX-License-Identifier: GPL-3.0-only
 * TEST ONLY: line driver for c-reference/dnr3_wire.c.
 *   enc <op> <seq> <payloadhex|->  -> frame hex      dec <framehex> -> {"op","seq","payload"} or {"error"}
 *   pack <hex> -> hex                               crc <hex> -> 8 hex digits */
#include "c-reference/dnr3_wire.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static size_t hex(uint8_t *out, size_t max, const char *s) {
    size_t n = 0;
    if (!strcmp(s, "-")) return 0;
    while (s[0] && s[1] && n < max) { char pair[3] = {s[0], s[1], 0}; out[n++] = (uint8_t)strtoul(pair, NULL, 16); s += 2; }
    return n;
}
static void dump(const uint8_t *p, size_t n) { for (size_t i = 0; i < n; i++) printf("%02x", p[i]); }
int main(void) {
    static const char *names[] = {"ok", "length", "header", "range", "crc"};
    char line[2048], arg[1024];
    uint8_t in[1024], out[1024];
    while (fgets(line, sizeof line, stdin)) {
        line[strcspn(line, "\r\n")] = 0;
        unsigned op, seq;
        if (sscanf(line, "enc %u %u %1023s", &op, &seq, arg) == 3) {
            size_t n = hex(in, sizeof in, arg), m = n > 0xFFFF ? 0 : dnr3_encode(out, (uint8_t)op, (uint16_t)seq, in, (uint16_t)n);
            if (!m) puts("error"); else { dump(out, m); puts(""); }
        } else if (sscanf(line, "dec %1023s", arg) == 1) {
            dnr3_frame f; size_t n = hex(in, sizeof in, arg); int e = dnr3_decode(&f, in, n);
            if (e) printf("{\"error\":\"%s\"}\n", names[e]);
            else { printf("{\"op\":%u,\"seq\":%u,\"payload\":\"", f.op, f.seq); dump(f.payload, f.len); puts("\"}"); }
        } else if (sscanf(line, "pack %1023s", arg) == 1) {
            size_t n = hex(in, sizeof in, arg), m = dnr3_pack7(out, in, n);
            uint8_t back[1024]; if (dnr3_unpack7(back, out, n) || memcmp(back, in, n)) { puts("error"); continue; }
            dump(out, m); puts("");
        } else if (sscanf(line, "crc %1023s", arg) == 1) {
            size_t n = hex(in, sizeof in, arg); printf("%08x\n", dnr3_crc32(in, n));
        } else puts("error");
        fflush(stdout);
    }
    return 0;
}
