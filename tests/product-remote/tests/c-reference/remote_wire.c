/* SPDX-License-Identifier: GPL-3.0-only */
#include "remote_wire.h"
#include <string.h>
static uint32_t u7(const uint8_t*p,unsigned n){uint32_t v=0;for(unsigned i=0;i<n;i++)v|=(uint32_t)p[i]<<(7*i);return v;}
static void p7(uint8_t*p,unsigned n,uint32_t v){for(unsigned i=0;i<n;i++){p[i]=(uint8_t)(v&127);v>>=7;}}
int dnr2_decode(dnr2_command*out,const uint8_t*b,size_t n){
 if(!out||!b||n!=51||b[0]!=240||b[1]!=125||b[2]!=68||b[3]!=78||b[4]!=2||b[5]>DNR2_CLOSE||b[50]!=247)return 0;
 for(unsigned i=1;i<50;i++)if(b[i]>127)return 0;
 if(b[34]>15||b[39]>15||b[44]>15||b[49]>15)return 0;
 dnr2_command c={0};c.version=2;c.op=b[5];c.unit=u7(b+6,4);c.client=u7(b+10,4);c.epoch=u7(b+14,4);c.request=u7(b+18,4);c.revision=u7(b+22,4);c.control=(uint16_t)u7(b+26,2);c.token=(uint16_t)u7(b+28,2);c.value=u7(b+30,5);
 for(unsigned i=0;i<3;i++)c.unit_high[i]=u7(b+35+5*i,5);
 *out=c;return 1;
}
int dnr2_encode_command(uint8_t out[51],const dnr2_command*c){
 if(!out||!c||c->version!=2||c->op>DNR2_CLOSE||c->unit>DNR2_MAX_SERIAL||c->client>DNR2_MAX_SERIAL||c->epoch>DNR2_MAX_SERIAL||c->request>DNR2_MAX_SERIAL||c->revision>DNR2_MAX_SERIAL||c->control>16383||c->token>16383)return 0;
 uint8_t b[51]={240,125,68,78,2,0};b[5]=c->op;p7(b+6,4,c->unit);p7(b+10,4,c->client);p7(b+14,4,c->epoch);p7(b+18,4,c->request);p7(b+22,4,c->revision);p7(b+26,2,c->control);p7(b+28,2,c->token);p7(b+30,5,c->value);for(unsigned i=0;i<3;i++)p7(b+35+5*i,5,c->unit_high[i]);b[50]=247;memcpy(out,b,51);return 1;
}
int dnr2_encode_reply(uint8_t out[51],unsigned op,const dnr2_reply*r){
 if(!out||!r||op>DNR2_CLOSE||r->status>127||r->kind>127||r->control>16383||r->unit>DNR2_MAX_SERIAL||r->client>DNR2_MAX_SERIAL||r->epoch>DNR2_MAX_SERIAL||r->request>DNR2_MAX_SERIAL||r->revision>DNR2_MAX_SERIAL)return 0;
 uint8_t b[51]={240,125,68,78,2,0};b[5]=(uint8_t)(op|64);b[6]=r->status;b[7]=r->kind;p7(b+8,4,r->unit);p7(b+12,4,r->client);p7(b+16,4,r->epoch);p7(b+20,4,r->request);p7(b+24,4,r->revision);p7(b+28,2,r->control);p7(b+30,5,r->value);for(unsigned i=0;i<3;i++)p7(b+35+5*i,5,r->unit_high[i]);b[50]=247;memcpy(out,b,51);return 1;
}
int dnr2_receive(dnr2_core*s,const uint8_t*b,size_t n,uint32_t now,uint8_t reply[51]){
 dnr2_command c;if(!dnr2_decode(&c,b,n))return 0;dnr2_reply r=dnr2_handle(s,&c,now);return dnr2_encode_reply(reply,c.op,&r);
}

