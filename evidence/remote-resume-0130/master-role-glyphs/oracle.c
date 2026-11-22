#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "fastmath.h"
#define UI_DRAW
#define C_LINE 0
#define C_INK 1
enum { MASTER_DRIVE, REVERB_DECAY, MASTER_PUMP, MASTER_COMP };
enum { MST_RATIO, MST_MIX, MST_THRESH };
static int role;
static int threshold, ratio, mix;
static int engine_master_get(int param) {return param==MST_RATIO?ratio:param==MST_MIX?mix:threshold;}
static unsigned char transfer[37];
static void cv_line(int x,int y,int end_x,int end_y,int color) {
  if(role==MASTER_COMP) {
    if(color==C_LINE) {
      assert(x==2 && y==48 && end_x==38 && end_y==28);
      transfer[0]=20;
    } else {
      assert(3<=end_x && end_x<=38 && 28<=end_y && end_y<=48);
      transfer[end_x-2]=end_y-28;
    }
  } else {
    printf(" %d,%d,%d,%d,%d",x,y-28,end_x,end_y-28,color);
  }
}
static void cv_rect(int x,int y,int w,int h,int color) {
  if(role==REVERB_DECAY && color==C_INK)cv_line(x,y,x,y+h,color);
  else cv_line(x,y,x+w-1,y,color);
}
static UI_DRAW void drive_amount_glyph(int val,int cx,uint16_t col){
 static const int16_t wave[37]={0,5690,11207,16383,21062,25101,28377,30791,32269,32767,32269,30791,28377,25101,21062,16384,11207,5690,0,-5690,-11207,-16384,-21062,-25101,-28377,-30791,-32269,-32767,-32269,-30791,-28377,-25101,-21062,-16383,-11207,-5690,0};
 int py=38,gain=18161/(143-val);
 for(int x=0;x<=36;x++){
  int a=wave[x]*gain/127;if(a>32767)a=32767;if(a< -32767)a=-32767;
  int h=((a<0?-a:a)*8+16383)/32767;int y=38+(a<0?h:-h);
  if(x)cv_line(cx-19+x,py,cx-18+x,y,col);
  py=y;
 }
}
static UI_DRAW float comp_glyph_output(float over,float slope,int mix,float input)
{
 float gr=0;
 if(!mix || !slope) return input;
 if(over>=3)gr=slope*over;
 else if(over>-3)gr=slope*(over+3)*(over+3)/12.0f;
 if(mix==127 || !gr) return input-gr;
 /* Ratio and Blend shape, normalized before Makeup, not measured signal or PUMP. */
 return input+6.0205999f*fm_log2f(1.0f+(fm_db2lin(-gr)-1.0f)*mix/127.0f);
}

static void reverb_decay(int q, int cx, uint16_t col) {
  int l=cx-18;
  float a=18,fb=.2f+.73f*q/127;
  cv_rect(l,48,37,1,C_LINE);
  for(int j=0;j<7;j++){int h=(int)(a+.5f);if(h)cv_rect(l+j*6,47-h,2,h,col);a*=fb;}

}
static void master_pump(int val,int cx,uint16_t col) {
        int depth=val*14/127;
        cv_line(cx-18,31,cx-9,31,col);cv_line(cx-9,31,cx-6,31+depth,col);
        cv_line(cx-6,31+depth,cx+15,31,col);cv_rect(cx+15,31,4,1,col);
        cv_rect(cx-18,48,37,1,C_LINE);

}
static void master_comp(int cx,uint16_t col) {
  int left=cx-18;
  static const float ratios[]={1,1.5f,2,3,4,6,8,12,20,1e6f};
  int py=48, ratio=engine_master_get(MST_RATIO), mix=engine_master_get(MST_MIX);
  float t=-48.0f+48.0f*engine_master_get(MST_THRESH)/127.0f, slope=1.0f-1.0f/ratios[(unsigned)ratio<10u?ratio:0];
  cv_line(left,48,cx+18,28,C_LINE);
  for(int i=1;i<=36;i++) {
   float input=-48.0f+48.0f*i/36.0f;
   int y=48-(int)((comp_glyph_output(input-t,slope,mix,input)+48)*20/48+0.5f);
   cv_line(left+i-1,py,left+i,y,col);py=y;
  }

}
int main(int argc,char **argv) {
  if(argc==1) {
    for(int raw=0;raw<=127;raw++){
      role=MASTER_DRIVE;printf("MASTER DRIVE|%d|",raw);drive_amount_glyph(raw,20,C_INK);puts("");
      role=REVERB_DECAY;printf("REVERB DECAY|%d|",raw);reverb_decay(raw,20,C_INK);puts("");
      role=MASTER_PUMP;printf("MASTER PUMP|%d|",raw);master_pump(raw,20,C_INK);puts("");
    }
  } else {
    role=MASTER_COMP;
    for(threshold=0;threshold<=127;threshold++)
      for(ratio=0;ratio<=9;ratio++)
        for(mix=0;mix<=127;mix++){
          master_comp(20,C_INK);
          fwrite(transfer,1,sizeof transfer,stdout);
        }
  }
}
