#include <stdio.h>
#include "fastmath.h"
int main(void){int op;float x;while(scanf("%d %f",&op,&x)==2)printf("%.9g\n",op==0?fm_expf(x):op==1?fm_log2f(x):fm_sinf(x));return 0;}
