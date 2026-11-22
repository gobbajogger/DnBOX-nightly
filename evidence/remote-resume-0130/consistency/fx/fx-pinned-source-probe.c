#include <stdio.h>
#define C_LINE 0
static void cv_rect(int x,int y,int w,int h,int c) {
  if (y==48 && w==37) printf(" %d,%d,%d,%d",x+2,y-28,x+2+w-1,y-28);
  else printf(" %d,%d,%d,%d",x+2,y-28,x+2,y-28+h);
}
static void cv_line(int x,int y,int end_x,int end_y,int c) {
  printf(" %d,%d,%d,%d",x+2,y-28,end_x+2,end_y-28);
}
static void time(int val){
  const int l=0, cx=18, col=1;
  static const int gap[13]={2,3,4,4,5,5,6,6,7,8,8,9,10};int g=gap[val<13?val:0];
  cv_rect(l,48,37,1,C_LINE);cv_rect(l,29,2,18,col);
  for(int x=l+g;x<=cx+18;x+=g)cv_rect(x,35,1,12,col);
  cv_line(l,50,l+g,50,col);

}
static void feedback(int q,int delay_type){
  const int left=0, col=1;
  float amp=10,feedback=(delay_type?1.15f:0.85f)*q/127.0f;
  for(int j=0;j<4;j++) {int h=(int)(amp+0.5f);if(h)cv_rect(left+3+j*10,47-h,2,h,col);amp*=feedback;}
  cv_rect(left,48,37,1,C_LINE);

}
static void ret(int q,int delay){
  const int left=0, col=1;
  cv_rect(left,48,37,1,C_LINE);
  if(delay)for(int j=0;j<4;j++){int h=((16-j*3)*q+126)/127;if(h)cv_rect(left+3+j*10,47-h,2,h,col);}
  else for(int j=0;j<7;j++){int h=((2+j*2)*q+126)/127;if(h)cv_rect(left+j*6,38-h/2,2,h,col);}

}
int main(void){
  for(int v=0;v<=12;v++){printf("G052 %d -",v);time(v);puts("");}
  for(int t=0;t<=1;t++)for(int v=0;v<=127;v++){printf("G053 %d %d",v,t);feedback(v,t);puts("");}
  for(int t=0;t<=1;t++)for(int v=0;v<=127;v++){printf("%s %d -",t?"G056":"G059",v);ret(v,t);puts("");}
}
