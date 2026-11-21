/* SPDX-License-Identifier: GPL-3.0-only */
/* Serial Web-only Chicago owner. No caller-supplied native bytes or pointers.
 * Undo restores the native cell/tag through the same cold owner as UI Undo;
 * a busy admission is a no-write refusal, not a successful asynchronous undo. */
extern int web_engine_chicago_matches(unsigned,const uint8_t *);
#define WEB_SOUND_HISTORY 16u
typedef struct {unsigned slot,choice,revision;uint8_t cell[NPARAMS_MAX];bass_sound_tag_t tag;} web_sound_snapshot;
typedef struct {web_sound_snapshot before,after;unsigned token,parameter,ticket;} web_sound_record;
static web_sound_snapshot web_sound_current;
static web_sound_record web_sound_history[WEB_SOUND_HISTORY];
static web_mix_control web_sound_catalog[20];
static struct {char number[64],unit[32];} web_sound_texts[20];
static unsigned web_sound_serial,web_sound_read_serial,web_sound_pending,web_sound_last;
static int web_sound_status=1;
static int web_sound_available(unsigned v){return v<NBASS&&engine_bass_bank(v)==ORIGINAL_SOUND_CHICAGO&&engine_bass_requested_bank(v)==ORIGINAL_SOUND_CHICAGO&&!engine_bass_preset_pending(v)&&engine_bass_sound_bank(&proj.sound,v)==ORIGINAL_SOUND_CHICAGO;}
static void web_sound_capture(web_sound_snapshot *s,unsigned v){s->slot=v;s->choice=engine_bass_choice_serial();memcpy(s->cell,proj.sound.v[T_303][v],sizeof s->cell);s->tag=proj.sound.bass[v];}
static int web_sound_same(const web_sound_snapshot *s){return web_sound_available(s->slot)&&s->choice==engine_bass_choice_serial()&&!memcmp(s->cell,proj.sound.v[T_303][s->slot],sizeof s->cell)&&!memcmp(&s->tag,&proj.sound.bass[s->slot],sizeof s->tag);}
EXPORT int web_sound_poll(void){
 if(!started||failed)return -1;
 if(!web_sound_pending)return web_sound_status;
 web_sound_record *r=&web_sound_history[(web_sound_pending-1)%WEB_SOUND_HISTORY];
 if(!web_engine_queue_done(r->ticket))return 0;
 web_sound_status=web_sound_same(&r->after)&&web_engine_chicago_matches(r->after.slot,r->after.cell)&&web_engine_param_received(T_303,r->after.slot,r->parameter,r->after.cell[r->parameter],r->ticket)?1:-4;
 if(web_sound_status<0)r->token=0;
 web_sound_pending=0;return web_sound_status;
}
EXPORT unsigned web_sound_token(void){return web_sound_poll()==1?web_sound_last:0;}
EXPORT unsigned web_sound_revision(void){return web_sound_current.revision;}
EXPORT const void *web_sound_data(void){return web_sound_catalog;}
EXPORT const void *web_sound_text(void){return web_sound_texts;}
EXPORT int web_sound_read(unsigned slot){
 if(!started||failed||web_sound_pending||web_sound_read_serial==UINT32_MAX||!web_sound_available(slot))return -1;
 if(web_engine_queue_free()!=1024u||!web_engine_chicago_matches(slot,proj.sound.v[T_303][slot]))return -3;
 for(unsigned p=0;p<20;p++) {pref_t ref=PR(R_ENG,T_303,slot,p);const x0x_param_t *d=pref_desc(ref);if(!d||pref_read_only(ref)||d->max!=(p==17?11:127))return -2;web_sound_catalog[p]=(web_mix_control){T_303,slot,p,pref_get(ref),0,d->max,1};memset(&web_sound_texts[p],0,sizeof web_sound_texts[p]);pref_value(ref,web_sound_texts[p].number,web_sound_texts[p].unit);}
 web_sound_capture(&web_sound_current,slot);web_sound_current.revision=++web_sound_read_serial;return 20;
}
EXPORT int web_sound_set(unsigned revision,unsigned p,int expected,int value){
 if(!started||failed||web_sound_pending||!revision||revision!=web_sound_current.revision||p>=20||web_sound_serial==UINT32_MAX)return -1;
 if(!web_sound_same(&web_sound_current))return -2;
 unsigned slot=web_sound_current.slot;pref_t ref=PR(R_ENG,T_303,slot,p);const x0x_param_t *d=pref_desc(ref);
 if(!d||pref_read_only(ref)||value<0||value>d->max||pref_get(ref)!=expected)return -2;
 if(web_engine_queue_free()!=1024u||!web_engine_chicago_matches(slot,web_sound_current.cell))return -3;
 web_sound_record next={0};next.before=web_sound_current;next.parameter=p;
 pref_set_impl(ref,value,0);next.ticket=web_engine_queue_ticket();web_sound_capture(&next.after,slot);
 next.token=++web_sound_serial;web_sound_history[(next.token-1)%WEB_SOUND_HISTORY]=next;
 web_sound_current.revision=0;web_sound_pending=next.token;web_sound_last=next.token;web_sound_status=0;return 0;
}
EXPORT int web_sound_undo(unsigned token){
 if(!started||failed||web_sound_pending||!token)return -1;
 web_sound_record *r=&web_sound_history[(token-1)%WEB_SOUND_HISTORY];
 if(r->token!=token||!web_sound_same(&r->after))return -2;
 unsigned slot=r->before.slot,mask=1u<<slot; bass_base_state_t target;
 memcpy(target.cell,proj.sound.v[T_303],sizeof target.cell);memcpy(target.tag,proj.sound.bass,sizeof target.tag);
 memcpy(target.cell[slot],r->before.cell,sizeof r->before.cell);target.tag[slot]=r->before.tag;
 engine_bass_edit_hold(1);engine_project_hold(1);
 int ready=engine_bass_base_ready(mask,&target);
 if(ready){engine_project_hold(0);engine_bass_edit_hold(0);return -3;}
 memcpy(proj.sound.v[T_303][slot],r->before.cell,sizeof r->before.cell);proj.sound.bass[slot]=r->before.tag;
 engine_bass_base_restore(mask);engine_project_hold(0);engine_bass_edit_hold(0);mark_dirty();
 r->token=0;web_sound_current.revision=0;web_sound_last=0;
 web_sound_status=web_engine_chicago_matches(slot,r->before.cell)?1:-4;
 /* Only a verified restore that we performed may rebase the remaining
  * journal's choice identity. External away/back transitions never get here. */
 if(web_sound_status==1){unsigned prior=r->after.choice,now=engine_bass_choice_serial();
  for(unsigned i=0;i<WEB_SOUND_HISTORY;i++){web_sound_record *entry=&web_sound_history[i];if(entry->token&&entry->before.choice==prior&&entry->after.choice==prior){entry->before.choice=now;entry->after.choice=now;}}
 }
 return web_sound_status==1?0:-4;
}

EXPORT unsigned web_sound_choice(void){return web_sound_current.choice;}
EXPORT int web_sound_set_voice(unsigned slot,unsigned revision,unsigned parameter,int expected,int value){if(slot>=NBASS||web_sound_current.slot!=slot)return -2;return web_sound_set(revision,parameter,expected,value);}
EXPORT int web_sound_undo_voice(unsigned slot,unsigned token){if(slot>=NBASS||!token||web_sound_history[(token-1)%WEB_SOUND_HISTORY].after.slot!=slot)return -2;return web_sound_undo(token);}
