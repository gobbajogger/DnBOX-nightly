/* SPDX-License-Identifier: GPL-3.0-only */
#define SMC_UI_MAIN retained_main
#include "smc_ui_test.c"
int main(void){unsigned count=0;for(int kit=0;kit<2;kit++)for(int voice=0;voice<11;voice++){
 setup(V_PART,kit?PART_808:PART_909);ui.sel[ui.part]=voice;build_pages();int pages=pg.n;
 for(int page=0;page<pages;page++){
 setup(V_PART,kit?PART_808:PART_909);ui.sel[ui.part]=voice;build_pages();*page_of(V_PART)=page;build_pages();ui_ease_reset();proj.set.palette=1;palette_set(1);
 CHECK(!seq.playing && ui.overlay==O_NONE && !ui.help && !ui_theme_light);memset(blit_hash,0,sizeof blit_hash);memset(cv_tile_valid,0,sizeof cv_tile_valid);ui_frame();char name[80];sprintf(name,"kit%d-voice%02d-page%02d",kit,voice,page);shot(name);
 printf("FRAME %s pages=%d\n",name,pg.n);
 dpart_t *dp=&cur_pat()->drum[ui.part];unsigned mask=0;for(int step=0;step<16;step++)if(step<dp->len&&sm_get(dp->hit[voice],step))mask|=1u<<step;printf("PATTERN %s %d %d %u\n",name,seq.ppat[ui.part],dp->len,mask);
 for(int p=0;p<pg.n;p++)for(int k=0;k<4;k++){pref_t r=pg.r[p][k];if(r.kind==R_NONE)continue;uint32_t age;float env;CHECK(!drum_live(r,&age,&env));CHECK(env==0);printf("CONTROL %d %d %d %d %d %d %d %u %.9g\n",kit,voice,page,r.a,r.b,r.c,matrix_value(r),age,(double)env);}
 count++;
 }}CHECK(count==45);printf("PASS native panels %u frames %u checks\n",count,checks);return 0;}
