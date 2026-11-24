/* SPDX-License-Identifier: GPL-3.0-only
 * Host dump of the firmware pages the Remote shows: page titles, knob names as the screen draws them (caps_of) and the display text of
 * every value, from the firmware's own describe_pages, pref_name and pref_value_of. Compiled by
 * scripts/sync-firmware-labels.mjs through host/build_host.sh; prints TSV on stdout. */
#define main x0x_host_main
#include "host/x0x_host.c"
#undef main
static void esc(const char *s){for(;*s;s++){if(*s=='\t'||*s=='\n'||*s=='\x1e'||*s=='\x1f')putchar(' ');else putchar(*s);}}
static void dump_ref(const char *ctx,int page,const char *title,int slot,pref_t r)
{
    const x0x_param_t *d=pref_desc(r);
    if(!d)return;
    char num[32],unit[16];
    printf("R\t%s\t%d\t",ctx,page);esc(title);printf("\t%d\t%d\t%d\t%d\t%d\t",slot,r.kind,r.a,r.b,r.c);
    esc(caps_of(pref_name(r)));printf("\t%d\t%d\t",d->max,d->def);
    for(int v=0;v<=d->max;v++){num[0]=unit[0]=0;pref_value_of(r,v,num,unit);if(v)putchar('\x1f');esc(num);putchar('\x1e');esc(unit);}
    putchar('\n');
}
static void dump_view(const char *ctx,int view,int part,int mixsel,const uint8_t *sel)
{
    static pages_t out;
    describe_pages(&out,0,view,part,mixsel,sel);
    for(int p=0;p<out.n;p++)for(int i=0;i<4;i++)dump_ref(ctx,p,out.title[p],i,out.r[p][i]);
    for(int i=0;i<out.nmore;i++)dump_ref(ctx,-1,"MORE",i,out.more[i]);
}
int main(void)
{
    boot();
    char ctx[64];
    uint8_t sel[NKIT];
    static const int views[]={V_HOME,V_PART,V_GEN,V_FX,V_MIX,V_SEQ,V_SONG};
    static const char *vn[]={"HOME","PART","GEN","FX","MIX","SEQ","SONG"};
    for(int bank=0;bank<4;bank++){
        for(int b=0;b<NBASS;b++){pref_set(PR(R_BENGINE,0,b,0),bank);}
        run_ms(400);
        for(int w=0;w<7;w++)for(int part=0;part<NPARTS;part++){
            int nsel=part<NKIT?NDRUM+1:1;
            for(int s=0;s<nsel;s++){
                memset(sel,0,sizeof sel);if(part<NKIT)sel[part]=(uint8_t)s;
                int nmix=views[w]==V_MIX?NPARTS+1:1;
                for(int m=0;m<nmix;m++){
                    ui.part=part;ui.view=views[w];
                    snprintf(ctx,sizeof ctx,"%s/part%d/sel%d/mix%d/bank%d/eng%d",vn[w],part,s,m,bank,engine_bass_bank(part>=NKIT&&part<NKIT+NBASS?part-NKIT:0));
                    dump_view(ctx,views[w],part,m,sel);
                }
            }
        }
    }
    return 0;
}
