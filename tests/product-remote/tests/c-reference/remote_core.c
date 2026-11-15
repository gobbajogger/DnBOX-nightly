/* SPDX-License-Identifier: GPL-3.0-only */
#include "remote_core.h"
#include <string.h>
static int same(const dnr2_command*a,const dnr2_command*b){
 return !memcmp(a->unit_high,b->unit_high,sizeof a->unit_high)&&a->unit==b->unit&&a->client==b->client&&a->epoch==b->epoch&&a->request==b->request&&a->revision==b->revision&&a->value==b->value&&a->control==b->control&&a->token==b->token&&a->version==b->version&&a->op==b->op;
}
int dnr2_init(dnr2_core*s,const dnr2_host*h,uint32_t unit,const uint32_t high[3]){
 if(!high||!s||!h||!h->read||!h->set||!h->down||!h->up||!h->catalog_crc||!h->control_count||!unit||unit>DNR2_MAX_SERIAL)return 0;
 memset(s,0,sizeof *s);s->host=*h;s->unit=unit;memcpy(s->unit_high,high,sizeof s->unit_high);s->revision=1;return 1;
}
void dnr2_changed(dnr2_core*s){if(s->revision<DNR2_MAX_SERIAL)s->revision++;else s->revision=DNR2_MAX_SERIAL;}
static void release_all(dnr2_core*s){
 while(s->nheld){uint32_t c=s->held[--s->nheld].cookie;s->host.up(s->host.context,c);}
 s->active=0;
}
void dnr2_tick(dnr2_core*s,uint32_t now){if(s->active&&(int32_t)(now-s->deadline)>=0)release_all(s);}
static dnr2_reply base(dnr2_core*s,const dnr2_command*c,uint8_t status){
 dnr2_reply r={0};r.unit=s->unit;memcpy(r.unit_high,s->unit_high,sizeof r.unit_high);r.client=c->client;r.epoch=c->epoch;r.request=c->request;r.revision=s->revision;r.control=c->control;r.status=status;return r;
}
static dnr2_reply save(dnr2_core*s,const dnr2_command*c,dnr2_reply r){
 r.revision=s->revision;s->cached_command=*c;s->cached_reply=r;s->cache_valid=1;return r;
}
dnr2_reply dnr2_handle(dnr2_core*s,const dnr2_command*c,uint32_t now){
 dnr2_tick(s,now);dnr2_reply r=base(s,c,DNR2_BAD);
 if(c->version==2&&c->op==DNR2_HELLO&&!c->unit&&!c->unit_high[0]&&!c->unit_high[1]&&!c->unit_high[2]&&c->client&&c->client<=DNR2_MAX_SERIAL&&c->request&&c->request<=DNR2_MAX_SERIAL&&!c->epoch&&!c->revision&&!c->control&&!c->token&&!c->value){r.status=DNR2_OK;r.control=s->host.control_count;r.value=s->host.catalog_crc;return r;}
 if(c->version!=2||c->unit!=s->unit||memcmp(c->unit_high,s->unit_high,sizeof c->unit_high)||!c->client||c->client>DNR2_MAX_SERIAL||!c->request||c->request>DNR2_MAX_SERIAL||c->op<DNR2_OPEN||c->op>DNR2_CLOSE)return r;
 if(s->cache_valid&&same(c,&s->cached_command)){
  /* A down/keepalive replay after expiry must never resurrect a dead lease. */
  if(!s->active&&c->op!=DNR2_CLOSE){r.status=DNR2_STALE;return r;}
  return s->cached_reply;
 }
 if(c->op==DNR2_OPEN){
  if(c->epoch||c->revision||c->control||c->token||c->value)return r;
  if(s->active){r.status=DNR2_BUSY;return r;}
  if(s->serial==DNR2_MAX_SERIAL){r.status=DNR2_EXHAUSTED;return r;}
  s->serial++;s->epoch=s->serial;s->client=c->client;s->active=1;s->deadline=now+DNR2_LEASE_MS;s->last_request=c->request;
  r.status=DNR2_OK;r.epoch=s->epoch;return save(s,c,r);
 }
 if(c->op==DNR2_READ){
  if(c->token||c->value)return r;
  if(!s->host.read(s->host.context,c->control,&r.kind,&r.value)){r.status=DNR2_UNSUPPORTED;return r;}
  r.status=DNR2_OK;return r; /* readers neither own nor renew write lease */
 }
 if(!s->active||c->client!=s->client||c->epoch!=s->epoch){r.status=DNR2_STALE;return r;}
 if(c->request<=s->last_request){r.status=DNR2_STALE;return r;}
 s->last_request=c->request;
 if(c->op==DNR2_CLOSE){
  if(c->control||c->token||c->value){return save(s,c,r);}
  release_all(s);r.status=DNR2_OK;return save(s,c,r);
 }
 if(c->op==DNR2_KEEPALIVE){
  if(c->control||c->token||c->value)return save(s,c,r);
  s->deadline=now+DNR2_LEASE_MS;r.status=DNR2_OK;return save(s,c,r);
 }
 if(c->op==DNR2_UP){
  if(!c->token||c->value)return save(s,c,r);
  for(unsigned i=0;i<s->nheld;i++)if(s->held[i].token==c->token){
   if(s->held[i].control!=c->control)return save(s,c,r);
   s->host.up(s->host.context,s->held[i].cookie);s->held[i]=s->held[--s->nheld];break;
  }
  s->deadline=now+DNR2_LEASE_MS;r.status=DNR2_OK;return save(s,c,r);
 }
 if(c->revision!=s->revision){r.status=DNR2_CONFLICT;return save(s,c,r);}
 if(s->revision==DNR2_MAX_SERIAL){r.status=DNR2_EXHAUSTED;return save(s,c,r);}
 if(!s->host.read(s->host.context,c->control,&r.kind,&r.value)){r.status=DNR2_UNSUPPORTED;return save(s,c,r);}
 if(c->op==DNR2_SET){
  if(c->token||r.kind==DNR2_HELD)return save(s,c,r);
  if(r.kind==DNR2_F32_BITS&&(c->value&0x7f800000u)==0x7f800000u)return save(s,c,r);
  if(r.kind!=DNR2_U32&&r.kind!=DNR2_F32_BITS){r.status=DNR2_UNSUPPORTED;return save(s,c,r);}
  int result=s->host.set(s->host.context,c->control,r.kind,c->value);
  if(!result)return save(s,c,r);
  dnr2_changed(s);s->deadline=now+DNR2_LEASE_MS;r.status=result==2?DNR2_QUEUED:DNR2_OK;
  if(!s->host.read(s->host.context,c->control,&r.kind,&r.value)){r.kind=0;r.value=0;}
  return save(s,c,r);
 }
 if(c->op==DNR2_DOWN){
  if(!c->token||r.kind!=DNR2_HELD)return save(s,c,r);
  for(unsigned i=0;i<s->nheld;i++)if(s->held[i].token==c->token){r.status=s->held[i].control==c->control?DNR2_OK:DNR2_BAD;return save(s,c,r);}
  if(s->nheld==DNR2_MAX_HELD){r.status=DNR2_FULL;return save(s,c,r);}
  uint32_t cookie=0;
  if(!s->host.down(s->host.context,c->control,c->value,&cookie)||!cookie)return save(s,c,r);
  s->held[s->nheld++]=(dnr2_held){cookie,c->token,c->control};s->deadline=now+DNR2_LEASE_MS;r.status=DNR2_OK;return save(s,c,r);
 }
 return save(s,c,r);
}

