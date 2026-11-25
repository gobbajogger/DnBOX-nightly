#include "s1c_front.h"
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
static union { uint32_t align; uint8_t bytes[S1C_ARENA_BYTES]; } arena;
static uint16_t wap[S1C_WAP_WORDS];
static s1c st;
static float l[128],r[128];
int main(void){
 s1c_init(&st,44100.f,0);
 for(unsigned i=0;i<150;i++)s1c_front_set(&st,i,s1c_front_init(i));
 st.rv.fit[0]=.5f;st.rv.fit[1]=1.5f;st.rv.fit[2]=1.f;
 st.mono_prev=(unsigned)st.t[20] /* original MONO */;
 s1c_attach(&st,arena.bytes,wap,arena.bytes+S1C_RVB_BYTES,S1C_ARENA_BYTES-S1C_RVB_BYTES);
 for(unsigned i=0;i<2400;i++){
   if(i==15)s1c_start(&st,60,121);
   if(i==360)s1c_front_set(&st,S1C_P_DLT,.823456f);
   if(i==440)s1c_front_set(&st,S1C_P_DLON,1.f);
   if(i==441)s1c_front_set(&st,S1C_P_DLMIX,.625f);
   if(i==770)s1c_stop(&st,60);
   if(i==1000)s1c_front_set(&st,S1C_P_DLON,0.f);
   if(i==1250)s1c_front_set(&st,S1C_P_DLT,2.f);
   if(i==1300)s1c_start(&st,67,99);
   if(i==1480)s1c_front_set(&st,S1C_P_DLON,1.f);
   if(i==1900)s1c_stop(&st,67);
   s1c_render(&st,l,r,128);
   if(i==0)fprintf(stderr,"init: DLON=%g DLT=%g dd=%d lengths=%d,%d\n",st.t[S1C_P_DLON],st.t[S1C_P_DLT],st.ddec,st.dl[0].len,st.dl[3].len);
   if(fwrite(l,sizeof(l),1,stdout)!=1||fwrite(r,sizeof(r),1,stdout)!=1)abort();
 }
}
