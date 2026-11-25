/* SPDX-License-Identifier: GPL-3.0-only */
/* Included by ui.c after pref_t, actual panel routes and the original engine
 * hooks. Wire ID is original SuperJ6 Build-9 control ID; return native UI
 * detents, never a guessed use of the ID as a project-cell offset. */
static int rd_panel_sj6_ref(unsigned voice, unsigned id, pref_t *out)
{
#if X0X_SUPERJ6_BUILTIN_INIT
    if (!out || voice>=NBASS || engine_bass_bank(voice)!=ORIGINAL_SOUND_JUNO) return 0;
#define SJ6_REF(ID,KIND,SLOT) case ID: *out=PR(KIND,T_303,voice,SLOT); return 1
#define SJ6_K(ID,SLOT) SJ6_REF(ID,R_SJ6KNOB,SLOT)
    switch (id) {
    /* Bank-3 Remote extension IDs: actual standalone settings, not AU
     * automation IDs, and not alternate names for existing AU controls. */
#if X0X_SJ6_SEQ_SETTINGS_NATIVE
    case 240: /* SEQ START SNAP */
    case 241: /* SEQ LOCK */
        if (!live137(&proj.sound,voice)) return 0;
        *out=PR(R_SJ6KNOB,T_303,voice,id==240u?SJ6_SEQ_START_SNAP:SJ6_SEQ_LOCK);
        return 1;
#endif
#if defined(DNBOX_137_HOST_WITNESS) && DNBOX_TYPED_CONTROLS_NATIVE_TEST && \
    X0X_S1_KEYBOARD_HOLD && X0X_S1_SCALE_NATIVE && X0X_SJ6_SCALE_NATIVE
    case 242: /* SELECT KEY SCALE; shares actual typed scale receiver, not factory A4 */
        if (!live137(&proj.sound,voice) ||
            original_sound_sj6_factory(proj.sound.v[T_303][voice])) return 0;
        *out=PR(R_S1SCALE,T_303,voice,0);
        return 1;
#endif
#if defined(DNBOX_137_HOST_WITNESS) && X0X_SJ6_MOD_TYPED_PROBE && X0X_SJ6_VELOCITY_SETTINGS
    case 243: /* standalone MIDI velocity curve; 205 remains separate FIXED */
        if (!live137(&proj.sound,voice)) return 0;
        *out=PR(R_SJ6INPUTVEL,T_303,voice,1);
        return 1;
#endif
    SJ6_REF(7,R_ENG,2);         /* actual original panel cutoff, not layer2 */
    SJ6_REF(8,R_ENG,3);         /* actual panel resonance */
    SJ6_REF(28,R_ENG,9);        /* instrument HPF; not Room Low Cut */
    SJ6_K(36,SJ6_AMP_ATTACK);
    SJ6_K(37,SJ6_AMP_DECAY);
    SJ6_K(38,SJ6_AMP_SUSTAIN);
    SJ6_K(39,SJ6_AMP_RELEASE);
    SJ6_K(78,SJ6_PWM1);
    SJ6_K(79,SJ6_PWM2);
    SJ6_K(82,SJ6_WAVE1);
    SJ6_K(83,SJ6_WAVE2);
    SJ6_K(86,SJ6_RANGE);
    SJ6_K(116,SJ6_FILTER_LINK); /* the sole public LINK: amp into filter */
    SJ6_K(132,SJ6_FILTER_ATTACK);
    SJ6_K(133,SJ6_FILTER_DECAY);
    SJ6_K(134,SJ6_FILTER_SUSTAIN);
    SJ6_K(135,SJ6_FILTER_RELEASE);
    SJ6_K(210,SJ6_PWM1_ON);
    SJ6_K(211,SJ6_PWM2_ON);
#if X0X_SJ6_SEQ_DEST_NATIVE
    SJ6_K(146,SJ6_SEQ_DEST);
#endif
#if X0X_SJ6_NATIVE_DELAY
    SJ6_K(24,SJ6_DELAY24);
    SJ6_K(25,SJ6_DELAY25);
    SJ6_K(26,SJ6_DELAY26);
    SJ6_K(27,SJ6_DELAY27);
    SJ6_K(118,SJ6_DELAYSYNC);
#endif
/* The composed source uses the later extended slot enum, not the old
 * 16-knob envelope-only replacement. Do not compile a shadow slot list. */
#if X0X_SJ6_LFO1_WAVE_NATIVE
    SJ6_K(0,SJ6_MASTER_LEVEL);
    SJ6_K(1,SJ6_OSC1_LEVEL);
    SJ6_K(3,SJ6_OSC2_LEVEL);
    SJ6_K(40,SJ6_CHORUS_I);
    SJ6_K(41,SJ6_CHORUS_II);
    SJ6_K(72,SJ6_LAYER1_SEMI);
    SJ6_K(73,SJ6_LAYER2_SEMI);
    SJ6_K(74,SJ6_LAYER1_FINE);
    SJ6_K(75,SJ6_LAYER2_FINE);
    SJ6_K(87,SJ6_LFO1_ENABLE);
    SJ6_K(88,SJ6_LFO1_RATE);
    SJ6_K(94,SJ6_LFO1_WAVE);
    SJ6_K(96,SJ6_LFO2_RATE);
    SJ6_K(97,SJ6_LFO2_PWM_DEPTH); /* source-bound original LFO2 Amount detent */
    SJ6_K(98,SJ6_LFO2_SHAPE);
    SJ6_K(100,SJ6_LFO3_RATE);
    SJ6_K(105,SJ6_VIBRATO_DEPTH);
    SJ6_K(106,SJ6_VIBRATO_RATE);
    SJ6_K(195,SJ6_LFO1_MODE);
    SJ6_K(196,SJ6_LFO2_MODE);
    SJ6_K(197,SJ6_LFO3_MODE);
    SJ6_K(198,SJ6_LFO1_SNAPBACK);
    SJ6_K(206,SJ6_A_REFERENCE);
#endif
#if defined(DNBOX_137_HOST_WITNESS) && X0X_S1_DELAY_TRACK_TEST && X0X_SJ6_AUX_LFO_NATIVE
    SJ6_REF(95,R_SJ6AUX,0);
    SJ6_REF(99,R_SJ6AUX,1);
    SJ6_REF(101,R_SJ6AUX,2);
    SJ6_REF(102,R_SJ6AUX,3);
    SJ6_REF(93,R_SJ6AUX,4);
    SJ6_REF(185,R_SJ6AUX,5);
    SJ6_REF(187,R_SJ6AUX,6);
    SJ6_REF(189,R_SJ6AUX,7);
    SJ6_REF(191,R_SJ6AUX,8);
    SJ6_REF(181,R_SJ6AUX,14);
#if X0X_SJ6_LFO_TRIGGER_NATIVE
    SJ6_REF(192,R_SJ6AUX,9);
    SJ6_REF(193,R_SJ6AUX,10);
    SJ6_REF(194,R_SJ6AUX,11);
    SJ6_REF(199,R_SJ6AUX,12);
    SJ6_REF(200,R_SJ6AUX,13);
#endif
#endif
#if X0X_SJ6_LFO1_DELAY_PORT
    SJ6_K(91,SJ6_LFO1_DELAY);
#endif
#if X0X_SJ6_NOISE_SUB_NATIVE
    SJ6_K(201,SJ6_NOISE_LEVEL);
    SJ6_K(202,SJ6_SUB_LEVEL);
#endif
#if X0X_SJ6_ALT3_NATIVE
    SJ6_K(103,SJ6_TREM_DEPTH);
    SJ6_K(104,SJ6_TREM_RATE);
#endif
#if X0X_SJ6_VCF_PORT
    SJ6_K(89,SJ6_VCF_LFO1_AMOUNT);
    SJ6_REF(131,R_SJ6FILTER_EXTRA,0);
    SJ6_REF(136,R_SJ6FILTER_EXTRA,1);
#endif
#if X0X_SJ6_VELOCITY_PORT
    SJ6_K(137,SJ6_FILTER_VELOCITY);
#endif
#if X0X_SJ6_NATIVE_UNISON
    SJ6_REF(59,R_SJ6UNISON,0);
    SJ6_REF(62,R_SJ6UNISON,1);
    SJ6_REF(60,R_SJ6UNISON,2);
    SJ6_REF(61,R_SJ6UNISON,3);
#endif
#if X0X_SJ6_MONO32_PROBE
    SJ6_REF(32,R_SJ6MONO32,0);
    SJ6_REF(33,R_SJ6MONO32,1);
    SJ6_REF(35,R_SJ6MONO32,2);
#endif
#if defined(DNBOX_137_HOST_WITNESS) && X0X_SJ6_MOD_TYPED_PROBE
    SJ6_REF(179,R_SJ6MOD,0);
#if X0X_SJ6_VELOCITY_SETTINGS
    SJ6_REF(205,R_SJ6INPUTVEL,0);
#endif
#endif
#if defined(DNBOX_137_HOST_WITNESS) && X0X_S1_DELAY_TRACK_TEST && X0X_SJ6_PITCH_ENV_NATIVE
    SJ6_REF(138,R_SJ6PITCH,0);
    SJ6_REF(139,R_SJ6PITCH,1);
    SJ6_REF(140,R_SJ6PITCH,2);
    SJ6_REF(141,R_SJ6PITCH,3);
    SJ6_REF(57,R_SJ6PITCH,4);
#endif
#if defined(DNBOX_137_HOST_WITNESS) && DNBOX_TYPED_CONTROLS_NATIVE_TEST && X0X_SJ6_NATIVE_ROOM
    SJ6_REF(11,R_SJ6ROOM,SJ6_ROOM_ENABLE);
    SJ6_REF(12,R_SJ6ROOM,SJ6_ROOM_TYPE);
    SJ6_REF(13,R_SJ6ROOM,SJ6_ROOM_SIZE);
    SJ6_REF(14,R_SJ6ROOM,SJ6_ROOM_LOCUT);
    SJ6_REF(15,R_SJ6ROOM,SJ6_ROOM_MIX);
    SJ6_REF(16,R_SJ6ROOM,SJ6_ROOM_WIDEN);
    SJ6_REF(22,R_SJ6ROOM,SJ6_ROOM_RATE);
    SJ6_REF(23,R_SJ6ROOM,SJ6_ROOM_DEPTH);
    SJ6_REF(107,R_SJ6CRUSH,0);
    SJ6_REF(108,R_SJ6CRUSH,1);
#endif
#if defined(DNBOX_137_HOST_WITNESS) && DNBOX_TYPED_CONTROLS_NATIVE_TEST && X0X_SJ6_OTA_NATIVE
    SJ6_REF(209,R_SJ6OTA,0);
#endif
#if X0X_SJ6_NATIVE_J60
    SJ6_REF(208,R_SJ6J60,0);
    case 215: case 216: case 217:
        /* Same physical knobs, different actual original receivers. */
        if (engine_sj6_j60_get(voice,0)!=1) return 0;
        *out=PR(R_SJ6J60,T_303,voice,id-214u); return 1;
#if X0X_SJ6_NATIVE_CLASSIC
    case 42: case 43: case 44:
        if (engine_sj6_j60_get(voice,0)!=0) return 0;
        *out=PR(R_SJ6J60,T_303,voice,id-41u); return 1;
#endif
#endif
#if defined(DNBOX_137_HOST_WITNESS) && DNBOX_TYPED_CONTROLS_NATIVE_TEST && X0X_SJ6_NATIVE_LIMITER
    SJ6_REF(18,R_SJ6LIMITER,SJ6_LIM_THRESH);
    SJ6_REF(19,R_SJ6LIMITER,SJ6_LIM_HEADROOM);
    SJ6_REF(20,R_SJ6LIMITER,SJ6_LIM_ATTACK);
    SJ6_REF(21,R_SJ6LIMITER,SJ6_LIM_GAIN);
#if X0X_SJ6_ALT3_NATIVE
    SJ6_REF(17,R_SJ6LIMITER,SJ6_RAGE_SLOT);
#endif
#if X0X_SJ6_VINTAGE_NATIVE
    SJ6_REF(123,R_SJ6LIMITER,SJ6_VINTAGE_SLOT);
#endif
#endif
    default: break;
    }
#undef SJ6_K
#undef SJ6_REF
#else
    (void)voice; (void)id; (void)out;
#endif
    return 0;
}

static int rd_panel_sj6_extra(unsigned voice,unsigned id,int set,int v,
                              const x0x_param_t **dp,int *queued)
{
    if (queued) *queued=0;
#if X0X_SUPERJ6_BUILTIN_INIT && X0X_SJ6_ARP_ADAPTER_NATIVE && X0X_ARP_ENGINE
    static const x0x_param_t step_pitch={"STEP PITCH",48,24,NULL};
    static const x0x_param_t step_on={"STEP ON",1,1,ONOFF_N};
    engine_arp_steps state;
    const int enable=id>=163u;
    unsigned index,field;
    int old;
    if (!dp || voice>=NBASS || engine_bass_bank(voice)!=ORIGINAL_SOUND_JUNO ||
        !live137(&proj.sound,voice)) return -1;
    switch(id) {
    case 63: field=ARP_F_ON;break;
    case 64: field=ARP_F_MODE;break;
    case 65: field=ARP_F_RANGE;break;
    case 66: field=ARP_F_INTERVAL;break;
    case 142: field=ARP_F_SEQ_ENABLE;break;
    case 143: field=ARP_F_SPEED;break; /* same original 13 stops as physical ARP SPEED */
    case 144: field=ARP_F_GATE;break;
    case 145: field=ARP_F_LENGTH;break;
    default: field=ARP_NF;break;
    }
    if (field!=ARP_NF) {
        engine_arp_settings settings;
        int physical;
        *dp=arp_desc(field,voice);
        if (!*dp || !engine_arp_settings_read(voice,&settings)) return -1;
        old=arp_get(voice,field);
        if (!set || old==v) return old;
        if (!queued || v<0 || (unsigned)v>(*dp)->max) return -1;
        physical=v;
        if (field==ARP_F_RANGE || field==ARP_F_LENGTH) ++physical;
        else if (field==ARP_F_MODE && v>=ARP_SEQ) ++physical;
        else if (field==ARP_F_GATE) {
#if X0X_SJ6_NATIVE_ZERO_GATE || X0X_SJ6_ZERO_GATE_PROBE
            if (!s1_typed_tuple_editable()) return -1;
#else
            ++physical;
#endif
        }
        if (engine_arp_set(voice,settings.revision,field,physical)!=S1_EDIT_QUEUED)
            return -1;
        mark_dirty();
        *queued=1;
        return v;
    }
    if (id<147u || id>178u || !engine_arp_steps_read(voice,&state)) return -1;
    index=id-(enable?163u:147u);
    field=enable?ARP_S_ON:ARP_S_OFFSET;
    *dp=enable?&step_on:&step_pitch;
    old=enable?((state.on_mask>>index)&1u):state.offset[index]+24;
    if (!set || old==v) return old;
    if (!queued || v<0 || (unsigned)v>(*dp)->max) return -1;
    if (engine_arp_step_set(voice,state.revision,index,field,enable?v:v-24)!=S1_EDIT_QUEUED)
        return -1;
    mark_dirty();
    *queued=1;
    return v;
#else
    (void)voice; (void)id; (void)set; (void)v; (void)dp;
    return -1;
#endif
}
