/* SPDX-License-Identifier: GPL-3.0-only */
/* Offline export only. A fresh reactor uses its real project reader, sequencer
 * and audio callbacks; temporary MIDI routing never leaves this instance. */
struct web_trace_note { uint32_t sample, packet; };
enum { WEB_TRACE_CAP = 512, WEB_TRACE_MAX_SAMPLES = 44100u * 86400u };
static struct web_trace_note web_trace_notes[WEB_TRACE_CAP];
static uint8_t web_trace_buffer[sizeof slot_img[0]];
static uint32_t web_trace_count, web_trace_origin;
static uint8_t web_trace_break_pattern;
static unsigned web_trace_state, web_trace_overflow;
static void web_trace_note(uint32_t pkt)
{
    if (web_trace_state != 1) return;
    uint32_t status = (pkt >> 8) & 0xffu, kind = status & 0xf0u;
    if (kind != 0x80u && kind != 0x90u) return;
    if ((status & 15u) >= NTRACKS || web_trace_count == WEB_TRACE_CAP) {
        web_trace_overflow = 1;
        return;
    }
    web_trace_notes[web_trace_count++] = (struct web_trace_note){
        seq.ext_now - web_trace_origin, pkt >> 8
    };
}

EXPORT uint8_t *web_trace_io(void) { return web_trace_buffer; }
EXPORT uint32_t web_trace_io_capacity(void) { return sizeof web_trace_buffer; }

EXPORT int web_trace_slot(uint32_t slot, uint32_t len)
{
    if (!started || failed || web_trace_state || now_ms || write_at ||
        slot >= SMP_USER_SLOTS || len < SMP_USER_DATA || len > sizeof web_trace_buffer ||
        len > SMP_USER_SIZE(slot)) return -1;
    memcpy(slot_img[slot], web_trace_buffer, len);
    const smp_user_hdr_t *h = smp_hdr(slot_img[slot]);
    if (h->data_len != len - SMP_USER_DATA) return -2;
    smp_user_scan(slot);
    if (!usr_nz[slot]) return -2;
    slot_is_img[slot] = 1;
    return 0;
}

EXPORT int web_trace_start(uint32_t len)
{
    int32_t silent[512];
    if (!started || failed || web_trace_state || now_ms || write_at ||
        len != PROJECT_FILE_SIZE || seq.playing || ui_project_begin()) return -1;
    memcpy(&project_stage, web_trace_buffer + PROJECT_FILE_HDR, sizeof project_stage);
    if (project_file_validate(web_trace_buffer)) {
        ui_project_end(0);
        return -2;
    }
    ui_project_end(1);
    seq.clk_src = SEQ_CLK_INT;
    seq.send_notes = 1;
    seq.send_clock = 0;
    seq.song_on = proj.arr.song.len != 0;
    for (unsigned i = 0; i < NTRACKS; ++i) seq.ch[i] = (uint8_t)i;
    /* Let restored patches settle without consuming any musical time. */
    for (unsigned n = 0; n < 256; ++n) {
        engine_render(silent, 256);
        if (!engine_bass_preset_pending(0) && !engine_bass_preset_pending(1)) break;
        if (n == 255) return -3;
    }
    web_trace_break_pattern = seq.ppat[TRK_BRK];
    web_trace_origin = seq.ext_now;
    web_trace_state = 1;
    seq_start(&seq);
    return (int)(600000000.0 / proj.set.bpm_x10 + 0.5);
}

EXPORT int web_trace_render(uint32_t n)
{
    int32_t audio[512];
    if (web_trace_state != 1 || web_trace_count || web_trace_overflow || n > 256u ||
        seq.ext_now - web_trace_origin > WEB_TRACE_MAX_SAMPLES - n) return -1;
    if (!n) seq_stop(&seq);
    engine_render(audio, n ? n : 1);
    if (seq.ppat[TRK_BRK] != web_trace_break_pattern) {
        web_trace_break_pattern = seq.ppat[TRK_BRK];
        engine_brk_loops();
    }
    engine_brk_flush();
    if (!n) web_trace_state = 2;
    return web_trace_overflow ? -2 : (int)web_trace_count;
}

EXPORT const struct web_trace_note *web_trace_events(void)
{
    web_trace_count = 0;
    return web_trace_notes;
}
