/* SPDX-License-Identifier: GPL-3.0-only */
#include <assert.h>
#include <stdio.h>
#include "fxbus.h"

int main(void) {
    static fxbus_t fx;
    const x0x_param_t *type = fxbus_param(FX_DL_TYPE);
    fxbus_set(&fx, FX_DL_WEAR, 37);
    printf("parameter=%u label=%s reset=%u max=%u\n", FX_DL_TYPE, type->name, type->def, type->max);
    const int edits[] = {1, 0, 1};
    for (int i = 0; i < 3; i++) {
        const int raw = edits[i];
        fxbus_set(&fx, FX_DL_TYPE, raw);
        assert(fx.pots[FX_DL_TYPE] == raw && fx.dl_type == raw && fx.pots[FX_DL_WEAR] == 37);
        printf("raw=%d name=%s stored=%u mode=%d wear=%u\n", raw, type->names[raw], fx.pots[FX_DL_TYPE], fx.dl_type, fx.pots[FX_DL_WEAR]);
    }
    return 0;
}
