/* SPDX-License-Identifier: GPL-3.0-only */
/* Same native owner, with read-only CQ observations for the serialized Web
 * adapter. This translation unit replaces engine.c only in the Web build. */
#include "../../firmware/src/app/engine.c"
/* Admission uses this pinned capacity; changing the native queue must fail
 * compilation rather than reinterpret half-full as empty. */
typedef char web_cq_capacity_matches_admission[(CQ==1024u)?1:-1];
unsigned web_engine_queue_free(void){unsigned used=cq_w-cq_r;return used<=CQ?CQ-used:0;}
unsigned web_engine_queue_ticket(void){return cq_w;}
int web_engine_queue_done(unsigned ticket){return (int32_t)(cq_r-ticket)>=0;}

static struct {unsigned ticket,value,valid;} web_applied[5][5][32];
void web_engine_param_applied(unsigned t,unsigned v,unsigned p,unsigned value,unsigned ticket){
 if(t<2||t>6||v>=5||p>=32)return;
 web_applied[t-2][v][p].ticket=ticket;web_applied[t-2][v][p].value=value;web_applied[t-2][v][p].valid=1;
}
int web_engine_param_received(unsigned t,unsigned v,unsigned p,unsigned value,unsigned ticket){
 if(t<2||t>6||v>=5||p>=32)return 0;
 return web_applied[t-2][v][p].valid&&web_applied[t-2][v][p].ticket==ticket&&web_applied[t-2][v][p].value==value;
}

int web_engine_chicago_matches(unsigned v,const uint8_t *cell){
 if(v>=NBASS||!cell||original_bass[v].kind!=ORIGINAL_SOUND_CHICAGO||original_bass[v].status!=ORIGINAL_RUNTIME_OK||original_bass[v].dsp.chicago.status!=ORIGINAL_CHICAGO_BACKEND_OK)return 0;
 original_chicago_program expected;
 if(!original_sound_restore_chicago(&expected,cell))return 0;
 return !memcmp(expected.macro,original_bass[v].dsp.chicago.program.macro,20*sizeof(float));
}
