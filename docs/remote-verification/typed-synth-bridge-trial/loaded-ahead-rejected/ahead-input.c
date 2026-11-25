#define AUDIO_PATH_IDENTITY_LIBRARY
#include "audio_path_identity.c"
int main(void) {
 boot(); engine_guard_enable(0); assert(!plat_cpu2_set(1));
 fill_pattern(1);
 assert(!engine_bass_select_preset(0,ORIGINAL_SOUND_SYNTHONE,0,&proj.sound));
 int32_t lr[512];
 for(int i=0;i<16;i++)engine_render(lr,256);
 assert(engine_bass_bank(0)==ORIGINAL_SOUND_SYNTHONE);
 seq_start(&seq);
 for(unsigned i=0;i<240;i++){
   now_ms = i*256000u/44100u;
   if(!(i%4)){
    engine_drum(1,0,1.f);engine_drum(0,1,.9f);
    engine_bass_on_velocity(0,36+(i%12),0,0,i&8?75:120);
   }
   if(i%4==3)engine_bass_off_note(0,36+((i-3)%12));
   engine_render(lr,256);
   put(stdout,lr,sizeof lr);
   put(stdout,eng_peak,sizeof eng_peak);
   put(stdout,eng_step,sizeof eng_step);
 }
}
