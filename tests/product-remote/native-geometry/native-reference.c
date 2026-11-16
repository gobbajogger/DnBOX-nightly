/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <stdint.h>
#define UI_DRAW
#define DG_ATTACK 1
#define C_WHITE 65535
static int paths;
static void cv_poly_aa(const float*xy,int n,uint16_t col){(void)col;printf("%s[",paths++?",":"");for(int i=0;i<n;i++)printf("%s[%.9g,%.9g]",i?",":"",xy[2*i],xy[2*i+1]);printf("]");}
static UI_DRAW void dv_tune_fork(float ox, float oy, float sx, float sy, float tune01, uint16_t col)
{
    float mid = 16.0f, half = 7.0f * (0.62f + 0.76f * tune01); /* 14-wide at default ~0.27 */
    float drop = 11.0f + 2.0f * (tune01 - 0.27f);
    float tip = 17.0f + 1.5f * (tune01 - 0.27f);
    float L = mid - half, R = mid + half;
    float xy[40];
    int n = 0;
    #define P(X,Y) do { xy[2*n]=(ox)+(X)*sx; xy[2*n+1]=(oy)+(Y)*sy; n++; } while(0)
    P(L,0);P(L,6);
    for(int i=1;i<=8;i++) {
        float t=(float)i/8.f,mt=1.f-t;
        P(mt*mt*L+2*mt*t*L+t*t*mid,mt*mt*6+2*mt*t*drop+t*t*drop);
    }
    for(int i=1;i<=8;i++) {
        float t=(float)i/8.f,mt=1.f-t;
        P(mt*mt*mid+2*mt*t*R+t*t*R,mt*mt*drop+2*mt*t*drop+t*t*6);
    }
    P(R,0);
    cv_poly_aa(xy, n, col);
    n = 0;
    P(mid, drop); P(mid, tip);
    cv_poly_aa(xy, n, col);
    #undef P
}


static void attack(float q,float ox,float oy,float sx,float sy){int role=DG_ATTACK,n=0,live=0;unsigned age=0xffffffffu;float xy[80];uint16_t col=123;
    if (role == DG_ATTACK) {
        /* Normalized rising-edge symbol: x encodes attack AMOUNT, not time.
         * The parameter and its percentage retain the engine's click amount.
         * Zero is vertical; larger amounts lengthen the visible rising ramp. */
        float end=1.f+30.f*q;
        n=0;
        xy[2*n]=ox+sx;xy[2*n+1]=oy+12.f*sy;n++;
        xy[2*n]=ox+end*sx;xy[2*n+1]=oy;n++;
        xy[2*n]=ox+31.f*sx;xy[2*n+1]=oy;n++;
        cv_poly_aa(xy, n, live && age < 30u ? C_WHITE : col);
        return;
    }
}
int main(void){int family;float raw,max,ox,oy,sx,sy;while(scanf("%d %f %f %f %f %f %f",&family,&raw,&max,&ox,&oy,&sx,&sy)==7){paths=0;printf("[");if(family==0)dv_tune_fork(ox,oy,sx,sy,raw/max,123);else attack(raw/max,ox,oy,sx,sy);puts("]");}return 0;}
