/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include "fastmath.h"
#define DG_DECAY 1
#define DG_NTAIL 2
#define T_909 0
#define X0X_U_MS 4
#define X0X_U_S 5
static int unit;static float si;
static int engine_param_si(int a,int b,int c,int val,float*out){(void)a;(void)b;(void)c;(void)val;*out=si;return unit;}
static void cv_poly_aa(float*xy,int n,int col){(void)col;printf("[[");for(int i=0;i<n;i++)printf("%s[%.9g,%.9g]",i?",":"",xy[i*2],xy[i*2+1]);puts("]]");}
static void curve(int target,int role,float raw,float max,float ox,float oy,float sx,float sy){struct{int a,b,c;}r={target,0,0};int val=(int)(raw+.5f),i,n,col=0;float q=raw/max,xy[80];
    if (role == DG_DECAY || role == DG_NTAIL) {
        float ms = 0, reach;
        int uu = engine_param_si(r.a, r.b, r.c, val, &ms);
        if (uu == X0X_U_S) ms *= 1000.0f;
        if (uu != X0X_U_MS && uu != X0X_U_S) ms = q * 4000.0f;
        if (role == DG_NTAIL) ms = 24.0f + 0.7f * ms;
        if (ms < 0) ms = 0;
        if (ms > 4000) ms = 4000;
        reach = 8.0f + 23.0f * fm_sqrtf(ms / 4000.0f); /* 8..31 */
        n = 0;
        for (i = 0; i <= 16; i++) {
            float t = (float)i / 16.0f;
            float px,py;
            if(r.a==T_909 && (uu==X0X_U_MS || uu==X0X_U_S)) {
                /* The production 909 exponential reaches 1e-5 at Decay ms.
                 * A common 2s axis makes changing decay visibly meaningful. */
                px=1.f+30.f*t;
                py=12.f*(1.f-fm_exp2f(-16.60964047f*(2000.f*t)/(ms>0?ms:1.f)));
            } else {
                /* Untimed 808 controls remain raw controls, not invented ms. */
                px=1.f+t*reach;
                py=12.f*(1.f-fm_exp2f(-t*(2.2f+3.f*(1.f-q))));
                if(t*reach>reach-.01f)py=12.f;
            }
            xy[2*n] = ox + px * sx; xy[2*n+1] = oy + py * sy; n++;
        }
        cv_poly_aa(xy, n, col);
        return;
    }
}
int main(void){int target,role;float raw,max,x,y,sx,sy;while(scanf("%d %d %f %f %d %f %f %f %f %f",&target,&role,&raw,&max,&unit,&si,&x,&y,&sx,&sy)==10)curve(target,role,raw,max,x,y,sx,sy);return 0;}
