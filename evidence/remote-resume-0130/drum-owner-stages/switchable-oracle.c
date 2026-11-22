/* SPDX-License-Identifier: GPL-3.0-only
 * Extend the actual f178 owner oracle to all switchable 808 tracks. */
#include <stdio.h>
#include <assert.h>
#include "drum808.c"
static drum808_t d;
static const char *kindnames[]={"K_POT","K_FIXED","K_SWITCH","K_KIT","K_PAN"};
int main(void){
 printf("{\"source\":\"f1786ebec2616477163b62b029c7e77405a9c3de\",\"mappings\":[");int comma=0,potchecks=0;
 for(int track=2;track<=6;track++){
  const int sw=track==6?4:3;
  for(int p=0;p<drum808_nparams(track);p++){
   drum808_init(&d);const x0x_param_t *spec=drum808_param(track,p);d8_pmap_t m=d8_pmap_at(track,p);
   int values[2],owners[2];for(int selection=0;selection<=1;selection++){drum808_set(&d,track,sw,selection);owners[selection]=track_sound(&d,track);values[selection]=drum808_get(&d,track,p);}
   float si=0;int unit=drum808_param_si(track,p,values[0],&si);
   printf("%s{\"track\":%d,\"parameter\":%d,\"name\":\"%s\",\"kind\":\"%s\",\"slot\":%d,\"fixedOwner\":%d,\"max\":%d,\"descriptorDefault\":%d,\"selectedOwners\":[%d,%d],\"actualFactoryRaw\":[%d,%d],\"uiUnit\":%d}",comma?",\n":"",track,p,spec->name,kindnames[m.kind],m.slot,m.kind==K_FIXED?m.snd:-1,spec->max,spec->def,owners[0],owners[1],values[0],values[1],unit);comma=1;
  }
 }
 printf("],\"retention\":[");comma=0;
 for(int track=2;track<=6;track++){
  const int sw=track==6?4:3;
  for(int p=0;p<drum808_nparams(track);p++){
   d8_pmap_t m=d8_pmap_at(track,p);if(m.kind!=K_POT)continue;
   drum808_init(&d);const int max=drum808_param(track,p)->max;int low=max<30?max/3:30,high=max<80?2*max/3:80;
   const int owner0=track_sound(&d,track);drum808_set(&d,track,p,low);assert(drum808_get(&d,track,p)==low);
   drum808_set(&d,track,sw,1);const int owner1=track_sound(&d,track);int untouched=drum808_get(&d,track,p);drum808_set(&d,track,p,high);assert(drum808_get(&d,track,p)==high);
   drum808_set(&d,track,sw,0);int back0=drum808_get(&d,track,p);assert(back0==low);drum808_set(&d,track,sw,1);int back1=drum808_get(&d,track,p);assert(back1==high);
   assert(d.pot[owner0][m.slot]==low&&d.pot[owner1][m.slot]==high);
   for(int other=2;other<=6;other++)if(other!=track)assert(d.sw[other]==0);
   printf("%s{\"track\":%d,\"parameter\":%d,\"slot\":%d,\"owner0\":%d,\"owner1\":%d,\"write0\":%d,\"firstSwitchRead1\":%d,\"write1\":%d,\"switchBackRead0\":%d,\"switchAgainRead1\":%d,\"otherTrackSelectorsUnchanged\":true}",comma?",\n":"",track,p,m.slot,owner0,owner1,low,untouched,high,back0,back1);comma=1;potchecks++;
  }
  const int pan=drum808_nparams(track)-1;assert(d8_pmap_at(track,pan).kind==K_PAN);
  drum808_init(&d);drum808_set(&d,track,pan,25);drum808_set(&d,track,sw,1);assert(drum808_get(&d,track,pan)==25);drum808_set(&d,track,pan,100);drum808_set(&d,track,sw,0);assert(drum808_get(&d,track,pan)==100);
 }
 drum808_init(&d);assert(d8_pmap_at(D8_KIT,1).kind==K_KIT);drum808_set(&d,D8_KIT,1,42);for(int track=2;track<=6;track++){drum808_set(&d,track,track==6?4:3,1);assert(drum808_get(&d,D8_KIT,1)==42);}
 printf("],\"ownerPotRetentionCases\":%d,\"panSharedWithinEachTrack\":true,\"accentIsKitGlobalAndRetained\":true,\"result\":\"PASS\"}\n",potchecks);return 0;
}
