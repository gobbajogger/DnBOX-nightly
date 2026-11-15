/* SPDX-License-Identifier: GPL-3.0-only */
#ifndef DNBOX_REMOTE_CORE_V2_H
#define DNBOX_REMOTE_CORE_V2_H
#include <stdint.h>
#define DNR2_MAX_HELD 67u /* 37 keys +16 pads +14 buttons; not a promise all routes exist */
#define DNR2_MAX_SERIAL 0x0fffffffu
#define DNR2_LEASE_MS 2000u
enum { DNR2_HELLO=0,DNR2_OPEN=1,DNR2_READ,DNR2_SET,DNR2_DOWN,DNR2_UP,DNR2_KEEPALIVE,DNR2_CLOSE };
enum { DNR2_OK=0,DNR2_QUEUED,DNR2_BAD,DNR2_BUSY,DNR2_STALE,DNR2_CONFLICT,DNR2_UNSUPPORTED,DNR2_FULL,DNR2_EXHAUSTED };
enum { DNR2_U32=1,DNR2_F32_BITS=2,DNR2_HELD=3 };
typedef struct {uint32_t unit_high[3];uint32_t unit,client,epoch,request,revision,value;uint16_t control,token;uint8_t version,op;} dnr2_command;
typedef struct {uint32_t unit_high[3];uint32_t unit,client,epoch,request,revision,value;uint16_t control;uint8_t status,kind;} dnr2_reply;
typedef struct {
 void *context;
 /* read validates catalog identity and returns exact source-authoritative type/value. */
 int (*read)(void*,uint16_t,uint8_t*,uint32_t*);
 /* Atomic, no mutation on failure.1=applied,2=queued. Must not silently clamp. */
 int (*set)(void*,uint16_t,uint8_t,uint32_t);
 /* Capture ORIGINAL engine/pitch/owner context in a host-owned nonzero cookie. */
 int (*down)(void*,uint16_t,uint32_t,uint32_t*);
 /* Total/idempotent original-context release; MUST NOT clear physical/other owners. */
 void (*up)(void*,uint32_t);
 uint32_t catalog_crc;uint16_t control_count;
} dnr2_host;
typedef struct {uint32_t cookie;uint16_t token,control;} dnr2_held;
typedef struct {
 dnr2_host host;uint32_t unit_high[3];uint32_t unit,client,epoch,serial,revision,deadline,last_request;
 dnr2_held held[DNR2_MAX_HELD];uint8_t active,nheld,cache_valid;
 dnr2_command cached_command;dnr2_reply cached_reply;
} dnr2_core;
/* unit is a per-boot endpoint incarnation, not authentication. Caller must supply
 * an probabilistic boot-incarnation value and source catalog pin; no cross-boot replay
 * strict uniqueness or sender authorization claim follows from this small trusted-local protocol.
 * Every physical/MIDI/project mutation must call changed(), including A->B->A.
 * Missing hooks forbid advertising write capability. Borrowed host outlives core.
 */
int dnr2_init(dnr2_core*,const dnr2_host*,uint32_t unit,const uint32_t unit_high[3]);
void dnr2_tick(dnr2_core*,uint32_t now_ms);
void dnr2_changed(dnr2_core*);
dnr2_reply dnr2_handle(dnr2_core*,const dnr2_command*,uint32_t now_ms);
#endif

