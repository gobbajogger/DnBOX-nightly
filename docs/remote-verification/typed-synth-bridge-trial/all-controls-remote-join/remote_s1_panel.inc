/* SPDX-License-Identifier: GPL-3.0-only
 * Included at the DNR3 adapter in ui.c, not as a standalone translation unit.
 * Stable original Synth One IDs are distinct from local preferences/storage.
 */
static int rd_panel_s1_ref(unsigned voice, unsigned id, pref_t *out)
{
    unsigned kind = R_S1PATCH, a = T_303, c = 0;
    if (voice >= NBASS || engine_bass_bank(voice) != ORIGINAL_SOUND_SYNTHONE)
        return 0;
#if X0X_ARP_HOOKS
    static const uint8_t arp_fields[] = {
        ARP_F_MODE, ARP_F_INTERVAL, ARP_F_ON, ARP_F_RANGE,
        ARP_F_SOURCE_RATE, ARP_F_SEQ_ENABLE, ARP_F_LENGTH
    };
    if (id >= 60u && id <= 66u) {
        kind = R_ARP; a = arp_fields[id - 60u]; goto done;
    }
#endif
    if (id >= 116u && id <= 119u) {
        kind = R_S1PHASER; c = id - 116u; goto done;
    }
    if (id >= 122u && id <= 135u) {
        kind = R_S1CMP; c = id - 122u; goto done;
    }
    switch (id) {
    case 18: case 31: case 33: case 140: case 145:
        /* Unused, internal multiplier, deprecated, or the physical live bend. */
        return 0;
    case 34: kind = R_ENG; c = ORIGINAL_SYNTHONE_CRUSH; break;
    case 35: case 36: kind = R_S1PAN; c = id - 35u; break;
    case 38: kind = R_S1RVFB; break;
    case 42: kind = R_S1DLFB; break;
    case 43: kind = R_S1DLYTIME; break;
    case 56: kind = R_S1ENVLFO; break;
    case 58: kind = R_S1CRUSH; break;
    case 136: kind = R_S1CWG; break;
    case 137: kind = R_S1DICT; break;
    case 138: kind = R_S1DLYRES; break;
    case 143: kind = R_S1A4; break;
    case 144: kind = R_S1HALF; break;
    case 146: kind = R_S1AA; break;
#if X0X_ARP_HOOKS
    case 147: kind = R_ARP; a = ARP_F_SOURCE_FACTOR; break;
#endif
    case 148: kind = R_S1TRANS; break;
    case 240: kind = R_S1KEY_HOLD; break;
    case 241: kind = R_S1WHITEKEYS; break;
    case 242: kind = R_S1MIDIVEL; break;
    case 243: kind = R_S1MICROKEYS; break;
    case 244: kind = R_S1SCALE; break;
    case 245: kind = R_S1A4RESET; break;
    case 246: kind = R_S1MODWHEEL; break;
    case 255: kind = R_S1LINK; break;
    default: {
        /* Base/extended editor table (OSC, FILTER, ADSR, FX, LFO,
         * routing, output, tempo sync, bend ranges, tracking). No raw DSP
         * write escape hatch: this is the same owner-bound panel slot. */
        if (id > 149 || (id >= 67 && id <= 114))
            return 0;
        int slot = s1_patch_slot(id);
        if (slot < 0) return 0;
        c = (unsigned)slot; break;
    }
    }
done:
    *out = (pref_t){(uint8_t)kind, (uint8_t)a, (uint8_t)voice, (uint8_t)c};
    return 1;
}

static int rd_panel_s1_extra(unsigned voice, unsigned id, int set, int v,
                             const x0x_param_t **dp, int *queued)
{
#if X0X_ARP_HOOKS
    if (voice >= NBASS || engine_bass_bank(voice) != ORIGINAL_SOUND_SYNTHONE)
        return -1;
    if (id < 67u || id > 114u)
        return -1;
    static const x0x_param_t step_pitch = {"PITCH", 24, 12, 0};
    static const x0x_param_t step_oct = {"OCTAVE", 1, 0, 0};
    static const x0x_param_t step_gate = {"ENABLED", 1, 1, 0};
    unsigned field, step;
    engine_arp_steps s;
    if (!engine_arp_steps_read(voice, &s)) return -1;
    if (id < 83u) {
        field = ARP_S_OFFSET; step = id - 67u; *dp = &step_pitch;
    } else if (id < 99u) {
        field = ARP_S_OCT; step = id - 83u; *dp = &step_oct;
    } else {
        field = ARP_S_ON; step = id - 99u; *dp = &step_gate;
    }
    int old = field == ARP_S_OFFSET ? (int)s.offset[step] + 12 :
              (int)(((field == ARP_S_OCT ? s.oct_mask : s.on_mask) >> step) & 1u);
    if (old < 0 || old > (*dp)->max) return -1;
    if (!set || v == old) return old;
    if (v < 0 || v > (*dp)->max) return -1;
    int q = engine_arp_step_set(voice, s.revision, step, field,
                                field == ARP_S_OFFSET ? v - 12 : v);
    if (q != S1_EDIT_QUEUED) return -1;
    *queued = 1;
    mark_dirty();
    return v;
#else
    (void)voice; (void)id; (void)set; (void)v; (void)dp; (void)queued;
    return -1;
#endif
}
