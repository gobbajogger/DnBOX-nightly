/* SPDX-License-Identifier: GPL-3.0-only */
#ifndef DNBOX_REMOTE_WIRE_V2_H
#define DNBOX_REMOTE_WIRE_V2_H
#include <stddef.h>
#include "remote_core.h"
#define DNR2_FRAME_BYTES 51u
int dnr2_decode(dnr2_command*,const uint8_t*,size_t);
int dnr2_encode_command(uint8_t out[DNR2_FRAME_BYTES],const dnr2_command*);
int dnr2_encode_reply(uint8_t out[DNR2_FRAME_BYTES],unsigned op,const dnr2_reply*);
int dnr2_receive(dnr2_core*,const uint8_t*,size_t,uint32_t,uint8_t reply[DNR2_FRAME_BYTES]);
#endif

