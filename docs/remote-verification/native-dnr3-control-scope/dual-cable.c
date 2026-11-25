#include "native-test-body.inc"
static int hex_digit(int c){return c>=48&&c<=57?c-48:c>=97&&c<=102?c-87:-1;}
static void wire(const uint8_t *f,uint32_t n)
{
  for(uint32_t i=0;i<n;++i)printf("%02x",f[i]);
  puts("");
}
int main(void)
{
  char line[600];
  host_remote_sink=wire; autokeep=0;
  boot(); tick(300);
  for(unsigned i=0;i<2;i++){
    const unsigned bank=i?ORIGINAL_SOUND_JUNO:ORIGINAL_SOUND_SYNTHONE;
    if(engine_bass_select_preset(i,bank,0,&proj.sound))return 2;
    for(unsigned k=0;k<1200&&engine_bass_preset_pending(i);k++)tick(1);
    if(engine_bass_bank(i)!=(int)bank||engine_bass_preset_pending(i))return 3;
  }
  while(fgets(line,sizeof line,stdin)){
    if(line[0]=='T') { unsigned ms=(unsigned)strtoul(line+2,0,10); if(ms<=500)tick(ms); }
    else if(line[0]=='M'){
      uint8_t b[256]; unsigned n=0;
      for(char *s=line+2;hex_digit(s[0])>=0 && hex_digit(s[1])>=0 && n<256;s+=2)
        b[n++]=(uint8_t)((hex_digit(s[0])<<4)|hex_digit(s[1]));
      if(n>2&&b[0]==240&&b[n-1]==247)remote_dnr3_frame(b+1,n-2);
      else if(n==1&&b[0]>=248)host_midi_put(15u|((unsigned)b[0]<<8));
      else if(n==3&&(b[0]>>4==8||b[0]>>4==9))
          host_midi_put(b[0]>>4|((unsigned)b[0]<<8)|((unsigned)b[1]<<16)|((unsigned)b[2]<<24));
      tick(2);
    }
    puts("END"); fflush(stdout);
  }
}
