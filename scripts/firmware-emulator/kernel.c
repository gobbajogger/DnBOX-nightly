/* SPDX-License-Identifier: GPL-3.0-only */
/* Current native host kernel; optional SMK profile uses real controller owners
 * with RAM-only input/output boundaries, not USB/BLE or calibrated hardware I/O.
 * Browser scheduling is not a device CPU or timing measurement. */
#include <stdint.h>
static void web_audio(const int32_t *, uint32_t);
#ifdef X0X_WEB_SMK
#define BOARD_SMK37 1
#define X0X_LIVE_KEY_TEST 1
#endif
#define main simulator_main
#include "../../host/x0x_host.c"
#undef main
#ifdef X0X_WEB_SMK
#include "controller-boundary.h"
#endif
#undef __attribute__
#define EXPORT __attribute__((used, visibility("default")))
/* DNR3 SysEx state (see web_sysex_in below). */
#define WEB_SYSEX_CAP 256u
#define WEB_SYSEX_RING 16u
static uint8_t web_sysex_in_buf[WEB_SYSEX_CAP],web_sysex_out_buf[WEB_SYSEX_CAP];
static uint8_t web_sysex_ring[WEB_SYSEX_RING][WEB_SYSEX_CAP];
static uint16_t web_sysex_ring_len[WEB_SYSEX_RING];
static uint32_t web_sysex_w,web_sysex_r,web_sysex_dropped;
#if __has_include("app/remote_dnr3.h")
#include "app/remote_dnr3.h"
#define WEB_DNR3 1
/* Platform hook called by the firmware for every reply/NOTIFY frame (F0..F7). */
void remote_dnr3_out(const uint8_t *frame,uint32_t n){
 if(n<2||n>WEB_SYSEX_CAP||web_sysex_w-web_sysex_r>=WEB_SYSEX_RING){web_sysex_dropped++;return;}
 memcpy(web_sysex_ring[web_sysex_w%WEB_SYSEX_RING],frame,n);web_sysex_ring_len[web_sysex_w%WEB_SYSEX_RING]=(uint16_t)n;web_sysex_w++;
}
#else
#define WEB_DNR3 0
#endif
#define RING 4096u
static int32_t audio_ring[RING*2], output[2048];
static uint32_t write_at,read_at,started,failed;
static void web_audio(const int32_t *block,uint32_t count){
 if(count>RING-(write_at-read_at)){failed=1;return;}
 for(uint32_t i=0;i<count;i++){
  uint32_t at=(write_at++%RING)*2;
  audio_ring[at]=block[i*2];audio_ring[at+1]=block[i*2+1];
 }
}
EXPORT int web_boot(void){
 if(started)return -1;
#ifdef X0X_WEB_SMK
 web_smk_initialize();
#endif
 started=1;load_force=0;boot();return 0;
}
EXPORT int web_render(uint32_t count){
 if(!started||failed||!count||count>1024)return -1;
#ifdef X0X_WEB_SMK
 if(web_smk_output_failed){failed=1;return -3;}
#endif
 unsigned limit=64;
 while(write_at-read_at<count){if(!limit--){failed=1;return -2;}run_ms(1);
#if WEB_DNR3
  remote_dnr3_tick(now_ms);
#endif
 }
#ifdef X0X_WEB_SMK
 /* A controller frame can fill the output queue during run_ms. Do not expose
  * this render as successful when its event stream was truncated. */
 if(web_smk_output_failed){failed=1;return -3;}
#endif
 for(uint32_t i=0;i<count;i++){uint32_t at=(read_at++%RING)*2;output[i*2]=audio_ring[at];output[i*2+1]=audio_ring[at+1];}
 return failed?-1:0;
}
EXPORT int32_t *web_output(void){return output;}
EXPORT uint16_t *web_framebuffer(void){return fb;}
EXPORT uint32_t web_blits(void){return blits;}
EXPORT uint32_t web_time(void){return now_ms;}
/* Serialized caller-owned observations. Numeric kinds/roles are an adapter
 * ABI, not preset banks or a fabricated native epoch. Calls never render. */
typedef struct {float adsr[4],level;int state;} web_chicago_amp;
typedef struct {float eg,depth;} web_chicago_filter;
static union {
 juno6_envelope_snapshot juno;
 drum909_amp_snapshot drum;
 web_chicago_amp chicago;
 web_chicago_filter filter;
 uint8_t bytes[64];
} web_envelope;
typedef char web_observer_juno_size[(sizeof(juno6_envelope_snapshot)==40)?1:-1];
typedef char web_observer_drum_size[(sizeof(drum909_amp_snapshot)==52)?1:-1];
typedef char web_observer_chicago_size[(sizeof(web_chicago_amp)==24)?1:-1];
EXPORT const void *web_envelope_data(void){return &web_envelope;}
EXPORT int web_envelope_read(unsigned kind,unsigned slot,unsigned role){
 memset(&web_envelope,0,sizeof web_envelope);
 if(!started||failed)return 0;
 int ok=0;
 if(kind==1 && slot<NBASS){
  if(role==1)ok=engine_bass_env_view((int)slot,web_envelope.chicago.adsr,&web_envelope.chicago.level,&web_envelope.chicago.state);
  else if(role==2)ok=engine_bass_filter_view((int)slot,&web_envelope.filter.eg,&web_envelope.filter.depth);
 }else if(kind==2 && slot<NBASS && role==3){
  ok=engine_juno_envelope_view((int)slot,&web_envelope.juno);
 }else if(kind==3 && slot<DR_NUM && role==1){
  ok=engine_drum909_amp_view((int)slot,&web_envelope.drum);
 }
 if(!ok)memset(&web_envelope,0,sizeof web_envelope);
 return !!ok;
}
EXPORT uint32_t web_playing(void){return seq.playing;}
EXPORT uint32_t web_keys_lit(void){return lit_keys;}
EXPORT uint32_t web_keys_dim(void){return dim_keys & ~lit_keys;}
EXPORT uint32_t web_buttons_lit(void){return lit_btn;}
EXPORT int web_buttons(uint32_t bits){if(!started||failed||bits>>NB)return -1;held_btn=bits;return 0;}
EXPORT int web_keys(uint32_t bits){if(!started||failed||bits>>NKEYS)return -1;held_keys=bits;return 0;}
EXPORT int web_turn(int role,int delta){
 if(!started||failed||role<0||role>=NE||delta < -64||delta>64)return -1;
 const int64_t pending=(int64_t)enc_acc[role]+delta;
 if(pending < -1024 || pending > 1024)return -2; /* explicit caller backpressure */
 enc_acc[role]=(int32_t)pending;return 0;
}
/* One MIDI message from the page, as the USB MIDI input would deliver it (source 0).
 * Channel messages and the realtime/song-position bytes the sequencer reads
 * (seq_clk_take/seq_midi_rt). SysEx goes through web_sysex_in. */
EXPORT int web_midi(uint32_t status,uint32_t first,uint32_t second){
 if(!started||failed||status<0x80||status>0xFF||first>127||second>127)return -1;
 uint32_t cin=status>>4;
 if(status>=0xF0){
  if(status==0xF2)cin=0x3;
  else if(status==0xF8||status==0xFA||status==0xFB||status==0xFC){if(first||second)return -1;cin=0xF;}
  else return -1;
 }
 if(mi_w-mi_r>=MQ)return -2; /* leave every unread event, including note-off, intact */
 host_midi_put(cin|(status<<8)|(first<<16)|(second<<24));return 0;
}

/* DNR3 SysEx (REMOTE-FW-PROTOCOL.md sections 3 and 6). The handler is firmware code
 * (app/remote_dnr3.c, FW Core). Without it this build answers -3 and reports no
 * DNR3 capability: the page must not pretend a firmware path exists. */
/* bit 0: realtime MIDI accepted, bit 1: DNR3 handler linked. */
EXPORT uint32_t web_remote_caps(void){return 1u|(WEB_DNR3?2u:0u);}
EXPORT uint8_t *web_sysex_buffer(void){return web_sysex_in_buf;}
EXPORT uint8_t *web_sysex_out(void){return web_sysex_out_buf;}
EXPORT uint32_t web_sysex_dropped_count(void){return web_sysex_dropped;}
EXPORT int web_sysex_in(uint32_t len){
 if(!started||failed||len<2||len>WEB_SYSEX_CAP||web_sysex_in_buf[0]!=0xF0||web_sysex_in_buf[len-1]!=0xF7)return -1;
 for(uint32_t i=1;i+1<len;i++)if(web_sysex_in_buf[i]&0x80u)return -1;
#if WEB_DNR3
 return remote_dnr3_frame(web_sysex_in_buf+1,len-2);
#else
 return -3;
#endif
}
EXPORT int web_sysex_out_take(void){
 if(web_sysex_r==web_sysex_w)return 0;
 uint32_t at=web_sysex_r++%WEB_SYSEX_RING,n=web_sysex_ring_len[at];
 memcpy(web_sysex_out_buf,web_sysex_ring[at],n);return (int)n;
}

/* Local emulator store envelope, not a hardware project/slot file. Imports are
 * admitted only into a fresh, unadvanced instance which the caller can discard.
 * The actual firmware parser validates every stored project before it boots. */
#define WEB_STORE_CAP (8u+OBJ_NOBJ*(4u+PLAT_STORE_MAX))
static uint8_t web_store[WEB_STORE_CAP];
static uint32_t web_store_restored;
static uint32_t web_get32(const uint8_t *p){return (uint32_t)p[0]|((uint32_t)p[1]<<8)|((uint32_t)p[2]<<16)|((uint32_t)p[3]<<24);}
static void web_put32(uint8_t *p,uint32_t v){for(unsigned i=0;i<4;i++)p[i]=(uint8_t)(v>>(i*8));}
EXPORT uint8_t *web_store_buffer(void){return web_store;}
EXPORT uint32_t web_store_capacity(void){return WEB_STORE_CAP;}
EXPORT int web_snapshot(void){
 if(!started||failed)return -1;
 int rc=project_save();if(rc)return rc;
 memcpy(web_store,"DBX1",4);web_put32(web_store+4,OBJ_NOBJ);uint32_t at=8;
 for(unsigned o=0;o<OBJ_NOBJ;o++){
  int n=store_len[o];if(n < -1 || n > (int)PLAT_STORE_MAX)return -1;
  web_put32(web_store+at,(uint32_t)n);at+=4;
  if(n>=0){memcpy(web_store+at,store[o],(size_t)n);at+=(uint32_t)n;}
 }
 return (int)at;
}
EXPORT int web_restore_store(uint32_t len){
 if(!started||failed||web_store_restored||now_ms||write_at||read_at||held_btn||held_keys||mi_w!=mi_r)return -1;
 for(unsigned r=0;r<NE;r++)if(enc_acc[r])return -1;
#ifdef X0X_WEB_SMK
 if(fm1_in.keys||fm1_in.buttons||fm1_in.pnotes||smk_extq_w!=smk_extq_r||
    web_smk_output_w!=web_smk_output_r)return -1;
 for(unsigned r=0;r<FM1_NENC;r++)if(fm1_in.enc_steps[r])return -1;
#endif
 if(len<8||len>WEB_STORE_CAP||memcmp(web_store,"DBX1",4)||web_get32(web_store+4)!=OBJ_NOBJ)return -1;
 uint32_t at=8;
 for(unsigned o=0;o<OBJ_NOBJ;o++){
  if(at>len-4)return -1;uint32_t n=web_get32(web_store+at);at+=4;
  if(n==UINT32_MAX)continue;
  if(n>PLAT_STORE_MAX||n>len-at)return -1;at+=n;
 }
 if(at!=len)return -1;
 web_store_restored=1;at=8;
 for(unsigned o=0;o<OBJ_NOBJ;o++){
  uint32_t n=web_get32(web_store+at);at+=4;store_previous_len[o]=-1;stored_known[o]=0;
  store_len[o]=n==UINT32_MAX?-1:(int)n;
  if(n!=UINT32_MAX){memcpy(store[o],web_store+at,n);at+=n;}
 }
 if(project_load_stage()!=0){failed=1;return -2;} /* discard this candidate instance */
 boot();return 0;
}

#ifdef X0X_WEB_SMK
/* Explicit physical events; do not pretend the existing logical-key bitmap is37keys. */
EXPORT int web_physical_key(uint32_t key,uint32_t velocity){
 if(!started||failed||key>=FM1_NKEY||velocity>127)return -1;
 /* Reject before the real owner mutates held keys or velocity. The caller can
  * render/drain and retry the identical event, including a note-off. */
 if((key<SMK_KEY_F3||key>=SMK_KEY_F3+27u) &&
    (uint8_t)((smk_extq_w+1u)%SMK_EXTQ)==smk_extq_r)return -2;
 smk__key_event(key,velocity);return 0;
}
EXPORT int web_physical_pad(uint32_t pad,uint32_t velocity){
 if(!started||failed||pad>=SMK_NPAD||velocity>127)return -1;
 smk__padq(pad,velocity);return 0;
}
EXPORT int web_physical_button(uint32_t button,uint32_t down){
 if(!started||failed||button>=FM1_NBTN||down>1)return -1;
 if(down)fm1_in.buttons|=1u<<button;else fm1_in.buttons&=~(1u<<button);return 0;
}
EXPORT int web_physical_encoder(uint32_t encoder,int delta){
 if(!started||failed||encoder>=FM1_NENC||delta < -64||delta>64)return -1;
 int pending=(int)fm1_in.enc_steps[encoder]+delta;
 if(pending < -1024||pending>1024)return -2;
 fm1_in.enc_steps[encoder]=(int16_t)pending;return 0;
}
EXPORT uint32_t web_controller_midi_count(void){return web_smk_output_w-web_smk_output_r;}
EXPORT uint32_t web_controller_midi_take(void){
 if(web_smk_output_r==web_smk_output_w)return 0;
 return web_smk_output_ring[web_smk_output_r++%1024];
}
#endif

#include "mix-transaction.h"

#include "sound-transaction.h"
