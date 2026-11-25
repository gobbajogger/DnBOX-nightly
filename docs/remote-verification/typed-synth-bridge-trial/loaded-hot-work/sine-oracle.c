#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
extern float original_sine(uint32_t);
extern float test_sine(uint32_t);
static unsigned comparisons;
static void test(uint32_t x) {
 float a=original_sine(x), b=test_sine(x);
 if(memcmp(&a,&b,4)){fprintf(stderr,"%08x: %a %a\n",x,a,b);abort();}
 ++comparisons;
}
int main(void){
 for(uint32_t k=0;k<256;++k)for(uint32_t f=0;f<(1u<<24);f+=257u)test((k<<24)|f);
 for(uint32_t k=0;k<256;++k){test(k<<24);test((k<<24)-1);test((k<<24)+1);}
 printf("%u bitwise sine checks including all 256 boundaries\n",comparisons);
}
