/* SPDX-License-Identifier: GPL-3.0-only
 * TEST ONLY: synthetic callbacks. Not the real/native catalog or a device model.
 * Exercises copied actual DNR2 core/wire unchanged with JS-encoded packets. */
#include "c-reference/remote_wire.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
static uint32_t integer=500, floating=0x43008000u, cookies=0, held=0;
static int read_value(void*x,uint16_t id,uint8_t*k,uint32_t*v){(void)x;if(id==1){*k=DNR2_U32;*v=integer;return 1;}if(id==2){*k=DNR2_F32_BITS;*v=floating;return 1;}if(id==37){*k=DNR2_HELD;*v=held;return 1;}return 0;}
static int set_value(void*x,uint16_t id,uint8_t k,uint32_t v){(void)x;if(id==1&&k==DNR2_U32&&v<=1000){integer=v;return 1;}if(id==2&&k==DNR2_F32_BITS){floating=v;return 1;}return 0;}
static int down(void*x,uint16_t id,uint32_t v,uint32_t*c){(void)x;if(id!=37||v<1||v>127)return 0;*c=++cookies;held++;return 1;}
static void up(void*x,uint32_t c){(void)x;if(c&&held)held--;}
int main(void){dnr2_core core;dnr2_host host={NULL,read_value,set_value,down,up,0x12345678u,3};if(!dnr2_init(&core,&host,42,(const uint32_t[]){0xffffffffu,0x80000000u,0x12345678u}))return 1;char line[1024];uint32_t now=0;while(fgets(line,sizeof line,stdin)){if(!strncmp(line,"tick ",5)){now=(uint32_t)strtoul(line+5,NULL,10);dnr2_tick(&core,now);printf("{\"held\":%u,\"active\":%u,\"revision\":%u}\n",held,core.active,core.revision);}else if(!strncmp(line,"change",6)){dnr2_changed(&core);printf("{\"revision\":%u}\n",core.revision);}else{uint8_t in[51],out[51];size_t n=strcspn(line,"\r\n");int valid=n==102;for(unsigned i=0;i<51&&valid;i++){char pair[3]={line[2*i],line[2*i+1],0},*end;unsigned long v=strtoul(pair,&end,16);if(*end)valid=0;in[i]=(uint8_t)v;}if(!valid||!dnr2_receive(&core,in,51,now,out)){puts("{\"invalid\":true}");}else{printf("{\"hex\":\"");for(unsigned i=0;i<51;i++)printf("%02x",out[i]);printf("\",\"held\":%u,\"active\":%u,\"revision\":%u}\n",held,core.active,core.revision);}}fflush(stdout);}return 0;}
