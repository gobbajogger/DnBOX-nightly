/* SPDX-License-Identifier: GPL-3.0-only */
/* Only the single-threaded current-host adapter includes this file. No ISR,
 * hardware protocol, project import, or caller-provided native pointer. */
extern unsigned web_engine_queue_free(void),web_engine_queue_ticket(void);
extern int web_engine_queue_done(unsigned);
extern int web_engine_param_received(unsigned,unsigned,unsigned,unsigned,unsigned);
#define WEB_MIX_HISTORY 16u
#define WEB_MIX_CATALOG 38u
typedef struct {unsigned target,voice,parameter;int value,min,max,kind;} web_mix_control;
typedef struct {unsigned token,n,commands,tickets[4];pref_t refs[4];int before[4],after[4];} web_mix_record;
static web_mix_record web_mix_history[WEB_MIX_HISTORY];
static web_mix_control web_mix_catalog[WEB_MIX_CATALOG];
static unsigned web_mix_serial,web_mix_pending,web_mix_ticket,web_mix_last;
static int web_mix_status=1;
static int web_mix_allowed(unsigned t,unsigned v,unsigned p){
 if(t==T_MIX)return v<NPARTS&&p<MX_NPARAMS;
 if(v)return 0;
 if(t==T_FX)return p==2||(p>=4&&p<=11)||p==14;
 return t==T_MST&&(p==MST_PUMP||p==MST_COMP1||p==MST_DJF);
}
static int web_mix_value(pref_t r){return pref_get(r);}
EXPORT int web_mix_poll(void){
 if(!started||failed)return -1;
 if(web_mix_pending&&!web_engine_queue_done(web_mix_ticket))return 0;
 if(web_mix_pending){
  web_mix_record *r=&web_mix_history[(web_mix_pending-1)%WEB_MIX_HISTORY];
  web_mix_status=1;
  for(unsigned i=0;i<r->n;i++)if(web_mix_value(r->refs[i])!=r->after[i])web_mix_status=-2;
  for(unsigned i=0;i<r->commands;i++){pref_t ref=r->refs[i];if(!web_engine_param_received(ref.a,ref.b,ref.c,(unsigned)r->after[i],r->tickets[i]))web_mix_status=-3;}
  if(web_mix_status<0)r->token=0;
  web_mix_pending=0;
 }
 return web_mix_status;
}
EXPORT unsigned web_mix_token(void){return web_mix_poll()==1?web_mix_last:0;}
EXPORT const void *web_mix_data(void){return web_mix_catalog;}
EXPORT int web_mix_read(void){
 if(web_mix_poll()!=1)return -1;
 unsigned n=0;
 for(unsigned t=T_FX;t<=T_MST;t++)for(unsigned v=0;v<(unsigned)engine_nvoices(t);v++)for(unsigned p=0;p<(unsigned)engine_nparams(t,v);p++){
  if(!web_mix_allowed(t,v,p))continue;
  if(n>=WEB_MIX_CATALOG)return -2;
  pref_t r=PR(R_ENG,t,v,p);const x0x_param_t *d=pref_desc(r);if(!d||pref_read_only(r))return -2;
  web_mix_catalog[n++]=(web_mix_control){t,v,p,pref_get(r),0,d->max,1};
 }
 return n==WEB_MIX_CATALOG?(int)n:-2;
}
EXPORT int web_mix_set(unsigned t,unsigned v,unsigned p,int expected,int value){
 if(!started||failed||web_mix_pending||!web_mix_allowed(t,v,p))return -1;
 pref_t ref=PR(R_ENG,t,v,p);const x0x_param_t *d=pref_desc(ref);
 if(!d||pref_read_only(ref)||value<0||value>d->max||pref_get(ref)!=expected)return -2;
 if(web_engine_queue_free()!=1024u||web_mix_serial==UINT32_MAX)return -3;
 web_mix_record next={0};next.n=1;next.refs[0]=ref;
 if(t==T_MST&&p==MST_COMP1){next.n=4;next.refs[1]=(pref_t)PR(R_ENG,T_MST,0,MST_THRESH);next.refs[2]=(pref_t)PR(R_ENG,T_MST,0,MST_RATIO);next.refs[3]=(pref_t)PR(R_ENG,T_MST,0,MST_MAKEUP);}
 if(t==T_MST&&p==MST_DJF){next.n=3;next.refs[1]=(pref_t)PR(R_ENG,T_MST,0,MST_MODE);next.refs[2]=(pref_t)PR(R_ENG,T_MST,0,MST_CUTOFF);}
 for(unsigned i=0;i<next.n;i++)next.before[i]=web_mix_value(next.refs[i]);
 pref_set_impl(ref,value,0);next.commands=1;next.tickets[0]=web_engine_queue_ticket();
 for(unsigned i=0;i<next.n;i++)next.after[i]=web_mix_value(next.refs[i]);
 next.token=++web_mix_serial;web_mix_history[(next.token-1)%WEB_MIX_HISTORY]=next;
 web_mix_ticket=web_engine_queue_ticket();web_mix_pending=next.token;web_mix_last=next.token;web_mix_status=0;return 0;
}
EXPORT int web_mix_undo(unsigned token){
 if(!started||failed||web_mix_pending||!token)return -1;
 web_mix_record *r=&web_mix_history[(token-1)%WEB_MIX_HISTORY];
 if(r->token!=token)return -2;
 for(unsigned i=0;i<r->n;i++)if(web_mix_value(r->refs[i])!=r->after[i])return -2;
 if(web_engine_queue_free()!=1024u)return -3;
 /* Empty CQ guarantees this <=4-command batch is consumed together by
  * the native 128-command audio budget. No older commands split the macro
  * from its customized details. Macro first, through the real UI owner. */
 for(unsigned i=0;i<r->n;i++){pref_set_impl(r->refs[i],r->before[i],0);r->tickets[i]=web_engine_queue_ticket();}
 r->commands=r->n;
 for(unsigned i=0;i<r->n;i++)r->after[i]=r->before[i];
 r->token=0;web_mix_ticket=web_engine_queue_ticket();web_mix_pending=token;web_mix_last=0;web_mix_status=0;return 0;
}
