#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
static uint32_t rnd=1;
static inline uint32_t next(void){rnd ^= rnd<<13; rnd ^= rnd>>17; rnd ^= rnd<<5; return rnd;}
static float step(float p){while(p<0.f)p+=16.f;return p;}
static float fold(float p){if(p< -16.f&&p>= -0x1p23f)p+=(float)(((unsigned)(-p)>>4)<<4);return step(p);}
static void same(float p){float a=step(p),b=fold(p);if(memcmp(&a,&b,4))abort();}
int main(void){
  for(unsigned x=0;x<1u<<16;x++)same(-(float)x/8.f);
  for(unsigned x=0;x<32768u;x++)same(-(float)(next()&0xffffffu)/256.f);
  for(int i=0;i<24;i++){
    float x=ldexpf(-1.f,i);
    same(x);same(nextafterf(x,-INFINITY));same(nextafterf(x,0.f));
  }
  puts("98376 exact binary32 equivalence checks incl large/fractional/nextafter boundaries");
}
