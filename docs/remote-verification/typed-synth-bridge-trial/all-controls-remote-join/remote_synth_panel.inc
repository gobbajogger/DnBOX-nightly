/* SPDX-License-Identifier: GPL-3.0-only
 * Included after the panel preference functions under X0X_REMOTE_TYPED_SYNTH.
 * The device's own panel is the authority on bounds, owner and persistence.
 */
#include "remote_s1_panel.inc"
#include "remote_sj6_panel.inc"

int ui_remote_synth(unsigned bank, unsigned voice, unsigned id, int set, int value,
                    const x0x_param_t **dp, int *queued)
{
    pref_t r;
    if (!dp || !queued || voice >= NBASS ||
        engine_bass_bank(voice) != (int)bank || engine_bass_preset_pending(voice))
        return -1;
    *dp = 0;
    *queued = 0;
    switch (bank) {
    case ORIGINAL_SOUND_SYNTHONE:
        if (!rd_panel_s1_ref(voice, id, &r))
            return rd_panel_s1_extra(voice, id, set, value, dp, queued);
        break;
    case ORIGINAL_SOUND_JUNO:
        if (!rd_panel_sj6_ref(voice, id, &r))
            return rd_panel_sj6_extra(voice, id, set, value, dp, queued);
        break;
    default:
        return -1;
    }

    /* S1 patch state is published only at the audio boundary. Reuse the real
     * renderer's revisioned receiver rather than guessing an async success
     * based on (or before) a panel redraw. */
    if (bank == ORIGINAL_SOUND_SYNTHONE &&
        (r.kind == R_S1PATCH || r.kind == R_S1LINK)) {
        s1_patch_value s;
        const x0x_param_t *d = pref_desc(r);
        if (!d || !engine_s1_patch_read(voice, id, &s) || s.position > d->max)
            return -1;
        *dp = d;
        if (!set || s.position == value) return s.position;
        if (value < 0 || value > d->max || pref_read_only(r)) return -1;
        if (engine_s1_patch_set(voice, s.revision, id, (unsigned)value) != S1_EDIT_QUEUED)
            return -1;
        *queued = 1;
        mark_dirty();
        return value;
    }

    const x0x_param_t *d = pref_desc(r);
    if (!d) return -1;
    const int max = d->max, old = pref_get(r);
    if (old < 0 || old > max) return -1;
    *dp = d;
    if (!set) return old;
    if (value < 0 || value > max || pref_read_only(r)) return -1;

    if (bank == ORIGINAL_SOUND_SYNTHONE && id == 245u) {
        if (value != 1) return -1;
        pref_t a4, scale;
        if (!rd_panel_s1_ref(voice, 143, &a4) || !rd_panel_s1_ref(voice, 244, &scale))
            return -1;
        const x0x_param_t *a4d = pref_desc(a4), *scaled = pref_desc(scale);
        if (!a4d || !scaled) return -1;
        const int a4init = a4d->def, scaleinit = scaled->def;
        pref_set_impl(r, 1, 0);
        if (pref_get(a4) != a4init || pref_get(scale) != scaleinit) return -1;
        return 1; /* action ack; a new GET still correctly returns 0 */
    }
    if (old == value) return old;
#if X0X_ARP_HOOKS
    if (bank == ORIGINAL_SOUND_SYNTHONE && r.kind == R_ARP &&
        r.a != ARP_F_SOURCE_RATE && r.a != ARP_F_SOURCE_FACTOR) {
        engine_arp_settings s;
        if (!engine_arp_settings_read(voice, &s)) return -1;
        int actual = value + (r.a == ARP_F_RANGE || r.a == ARP_F_LENGTH);
        if (engine_arp_set(voice, s.revision, r.a, actual) != S1_EDIT_QUEUED)
            return -1;
        *queued = 1;
        mark_dirty();
        return value;
    }
#endif
    pref_set_impl(r, value, 0);
    return pref_get(r) == value ? value : -1;
}
