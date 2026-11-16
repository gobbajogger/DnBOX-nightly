/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include "fastmath.h"
int main(void){int op;float v;while(scanf("%d %f",&op,&v)==2)printf("%.9g\n",op?fm_sqrtf(v):fm_exp2f(v));return 0;}
