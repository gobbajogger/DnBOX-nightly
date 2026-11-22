/* SPDX-License-Identifier: GPL-3.0-only
 * Compile against unmodified actual f178 drum808.c and x0x_param.c.
 * No engine functions or state behavior are substituted. */
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "drum808.c"
static drum808_t d,before;
static int comma;
static void curve_json(drum_curve_t *c) {
 printf("{\"delay\":%.9g,\"rise_tau\":%.9g,\"rise_end\":%.9g,\"hold\":%.9g,\"fall\":%.9g,\"peak\":%.9g,\"window\":%.9g,\"elapsed\":%.9g,\"level\":%.9g,\"linear\":%u}", (double)c->delay,(double)c->rise_tau,(double)c->rise_end,(double)c->hold,(double)c->fall,(double)c->peak,(double)c->window,(double)c->elapsed,(double)c->level,c->linear);
}
static void event(const char *name) {
 drum_curve_t c;float unit=0;int owner=drum808_param_curve(&d,D8_CP,2,&c);int u=drum808_param_si(D8_CP,2,drum808_get(&d,D8_CP,2),&unit);
 printf("%s{\"event\":\"%s\",\"selector\":%d,\"selectedDecay\":%d,\"fixedAttack\":%d,\"clapDecay\":%d,\"maracDecay\":%d,\"uiUnit\":%d,\"uiValue\":%.9g,\"ownerPlusOne\":%d,\"curveMs\":",comma?",\n":"",name,drum808_get(&d,D8_CP,4),drum808_get(&d,D8_CP,2),drum808_get(&d,D8_CP,3),d.pot[D8S_CP][D8P_DECAY],d.pot[D8S_MA][D8P_DECAY],u,(double)unit,owner);curve_json(&c);printf(",\"tomSwitches\":[%d,%d,%d],\"tomDecays\":[%d,%d,%d]}",drum808_get(&d,D8_LT,3),drum808_get(&d,D8_MT,3),drum808_get(&d,D8_HT,3),drum808_get(&d,D8_LT,2),drum808_get(&d,D8_MT,2),drum808_get(&d,D8_HT,2));comma=1;
}
int main(void) {
 drum808_init(&d);
 printf("{\"engine\":\"actual unmodified drum808.c f1786ebec2616477163b62b029c7e77405a9c3de\",\"units\":{\"percent\":%d,\"milliseconds\":%d},\"factoryOwners\":[",X0X_U_PCT,X0X_U_MS);
 for(int s=0;s<D8S_NUM;s++){printf("%s{\"owner\":%d,\"rawPots\":[",s?",":"",s);for(int p=0;p<D8P_NUM;p++)printf("%s%d",p?",":"",d.pot[s][p]);printf("],\"engineeredPots\":[");for(int p=0;p<D8P_NUM;p++)printf("%s%.9g",p?",":"",(double)d.potv[s][p]);printf("]}");}
 assert(drum808_get(&d,D8_CP,2)==64);assert(drum808_get(&d,D8_CP,3)==32);
 printf("],\"sequence\":[");event("factoryCLAP");drum808_set(&d,D8_CP,4,1);assert(drum808_get(&d,D8_CP,2)==51);event("factoryMARAC");drum808_set(&d,D8_CP,4,0);
 drum808_set(&d,D8_CP,2,30);assert(drum808_get(&d,D8_CP,2)==30);event("setCLAPDecay30");drum808_set(&d,D8_CP,4,1);assert(drum808_get(&d,D8_CP,2)==51);event("switchMARACretains51");drum808_set(&d,D8_CP,2,80);event("setMARACDecay80");drum808_set(&d,D8_CP,4,0);assert(drum808_get(&d,D8_CP,2)==30);event("switchCLAPreads30");drum808_set(&d,D8_CP,4,1);assert(drum808_get(&d,D8_CP,2)==80);event("switchMARACreads80");
 drum808_set(&d,D8_CP,4,0);drum808_set(&d,D8_CP,3,45);assert(d.pot[D8S_MA][D8P_X1]==45&&d.pot[D8S_CP][D8P_X1]==0);event("CLAPselectedSetAttack45WritesMARAC");drum808_set(&d,D8_CP,4,1);assert(drum808_get(&d,D8_CP,3)==45);event("MARACselectedReadsSameAttack45");
 drum808_set(&d,D8_LT,3,1);assert(drum808_get(&d,D8_LT,2)==58&&drum808_get(&d,D8_MT,3)==0&&drum808_get(&d,D8_HT,3)==0);event("LTcongaOnly");drum808_set(&d,D8_MT,3,1);assert(drum808_get(&d,D8_LT,3)==1&&drum808_get(&d,D8_HT,3)==0);event("MTcongaIndependent");drum808_set(&d,D8_HT,3,1);event("HTcongaIndependent");drum808_set(&d,D8_LT,2,77);drum808_set(&d,D8_LT,3,0);drum808_set(&d,D8_LT,2,31);drum808_set(&d,D8_LT,3,1);assert(drum808_get(&d,D8_LT,2)==77);event("LCretains77AfterLT31");drum808_set(&d,D8_LT,3,0);assert(drum808_get(&d,D8_LT,2)==31);assert(drum808_get(&d,D8_MT,2)==36&&drum808_get(&d,D8_HT,2)==34&&drum808_get(&d,D8_CP,2)==80);event("LTretains31OtherOwnersUnchanged");
 printf("],\"previewSweep\":[");comma=0;drum808_init(&d);before=d;
 for(int selection=0;selection<2;selection++)for(int param=2;param<=3;param++)for(int raw=0;raw<128;raw++){
 drum_curve_t c;float value=0;int owner=drum808_param_curve_preview(&d,D8_CP,param,selection,raw,&c);int expected=(param==3||selection?D8S_MA:D8S_CP)+1;assert(owner==expected);assert(memcmp(&d,&before,sizeof d)==0);int unit=drum808_param_si(D8_CP,param,raw,&value);
 printf("%s{\"selection\":%d,\"param\":%d,\"raw\":%d,\"ownerPlusOne\":%d,\"uiUnit\":%d,\"uiValue\":%.9g,\"curveMs\":",comma?",\n":"",selection,param,raw,owner,unit,(double)value);curve_json(&c);printf("}");comma=1;
 }
 printf("],\"previewStateUnchanged\":true,\"assertions\":\"PASS actual init/get/set; independent owner retention; fixed attack; independent tom switches/pots; all512 previews nonmutating and correct owner\"}\n");return 0;
}
