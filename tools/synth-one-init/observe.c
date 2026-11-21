// SPDX-License-Identifier: GPL-3.0-only
// Measure the production INIT values and envelopes over a 200 ms held note.
#include "s1_dry_voice.h"
#include <assert.h>
#include <stdio.h>

static void print_adsr(const s1_dry_adsr *a)
{
    printf("[%.9g,%.9g,%.9g,%.9g]", a->attack_s, a->decay_s, a->sustain, a->release_s);
}

int main(void)
{
    s1_dry_controls params;
    s1_dry_voice voice;
    s1_dry_frozen_controls(&params);
    s1_dry_reset(&voice);
    assert(s1_dry_configure(&voice, &params) == S1_DRY_OK);
    assert(s1_dry_start(&voice, 440.0f, 100, 0.0f) == S1_DRY_OK);
    printf("{\"amp\":");
    print_adsr(&params.amp);
    printf(",\"filter\":");
    print_adsr(&params.filter);
    printf(",\"cutoffHz\":%.9g,\"resonance\":%.9g,\"filterDepth\":%.9g,"
           "\"oscillator1Level\":%.9g,\"balance\":%.9g,"
           "\"sampleRate\":%u,\"gateOffSample\":8820,\"intervalSamples\":441,\"points\":[",
           params.cutoff_hz, params.resonance, params.filter_depth, params.oscillator1_level,
           params.balance, (unsigned)S1_DRY_SAMPLE_RATE);
    for (unsigned sample = 0; sample <= 35280; ++sample) {
        if (sample % 64 == 0) s1_dry_begin_block(&voice);
        if (sample == 8820) assert(s1_dry_note_off(&voice) == S1_DRY_OK);
        (void)s1_dry_sample(&voice);
        if (sample % 441 == 0)
            printf("%s[%.8g,%.8g]", sample ? "," : "", voice.amp.level, voice.filter.level);
    }
    puts("]}");
}
