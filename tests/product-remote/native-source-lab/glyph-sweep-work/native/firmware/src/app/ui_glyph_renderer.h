/* SPDX-License-Identifier: GPL-3.0-only */
/* Shared rounded AA raster and presentation-only continuous value interpolation.
 * Included after px_blend; never changes the committed sound or audio state. */
#ifndef UI_GLYPH_RENDERER_H
#define UI_GLYPH_RENDERER_H

static X0X_COLD __attribute__((noinline)) void cv_stroke_aa(float x0,float y0,float x1,float y1,float width,uint16_t col)
{
    float dx=x1-x0,dy=y1-y0,len2=dx*dx+dy*dy,r=width*.5f;
    int xmin=(int)fm_floorf((x0<x1?x0:x1)-r-.5f);
    int xmax=(int)fm_floorf((x0>x1?x0:x1)+r+.5f);
    int ymin=(int)fm_floorf((y0<y1?y0:y1)-r-.5f);
    int ymax=(int)fm_floorf((y0>y1?y0:y1)+r+.5f);
    if(xmin<0)xmin=0;
    if(xmax>(int)cv_w-1)xmax=(int)cv_w-1;
    if(ymin<cv_y0-cv_oy)ymin=cv_y0-cv_oy;
    if(ymax>=cv_y1-cv_oy)ymax=cv_y1-cv_oy-1;
    for(int y=ymin;y<=ymax;y++)for(int x=xmin;x<=xmax;x++) {
        float t=len2>0?(((float)x-x0)*dx+((float)y-y0)*dy)/len2:0;
        if(t<0)t=0;
        if(t>1)t=1;
        float ax=(float)x-x0-t*dx,ay=(float)y-y0-t*dy;
        float a=r+.5f-fm_sqrtf(ax*ax+ay*ay);
        if(a>0)px_blend(x,y,col,(uint32_t)(a>=1?16:a*16+.5f));
    }
}
static void cv_line_aa(float x0,float y0,float x1,float y1,uint16_t col)
{ cv_stroke_aa(x0,y0,x1,y1,2.f,col); }
static void cv_poly_aa(const float *xy,int n,uint16_t col)
{
    for(int i=1;i<n;i++)cv_line_aa(xy[2*i-2],xy[2*i-1],xy[2*i],xy[2*i+1],col);
}

#define UI_EASE_OMEGA (5.f/.12f)
#define UI_EASE_SLOTS 16
typedef struct { float y,vel;int tgt;pref_t r;uint32_t seen;uint8_t on,family; } ui_ease_t;
static ui_ease_t ui_ease[UI_EASE_SLOTS];
static uint32_t ui_ease_last_ms;
static uint8_t ui_ease_clock_on;
static void ui_ease_reset(void)
{
    memset(ui_ease,0,sizeof ui_ease);
    ui_ease_last_ms=plat_ms();ui_ease_clock_on=1;
}
static void ui_ease_tick(void)
{
    uint32_t now=plat_ms(),elapsed=now-ui_ease_last_ms;
    if(!ui_ease_clock_on){ui_ease_last_ms=now;ui_ease_clock_on=1;return;}
    ui_ease_last_ms=now;if(!elapsed)return;
    /* Analytic integration must consume the real interval after a slow frame.
     * After a second the residual is below binary32 presentation precision. */
    if(elapsed>=1000) {
        for(int i=0;i<UI_EASE_SLOTS;i++)if(ui_ease[i].on) {
            ui_ease[i].y=(float)ui_ease[i].tgt;ui_ease[i].vel=0;
        }
        return;
    }
    float dt=(float)elapsed*.001f;
    float ex=fm_exp2f(-UI_EASE_OMEGA*dt*1.44269504f);
    for(int i=0;i<UI_EASE_SLOTS;i++)if(ui_ease[i].on) {
        ui_ease_t *e=&ui_ease[i];float A=e->y-(float)e->tgt,B=e->vel+UI_EASE_OMEGA*A;
        e->y=(float)e->tgt+(A+B*dt)*ex;
        e->vel=(B-UI_EASE_OMEGA*(A+B*dt))*ex;
        if(fm_fabsf(e->y-e->tgt)<.02f&&fm_fabsf(e->vel)<.5f){e->y=(float)e->tgt;e->vel=0;}
    }
}
static float ui_ease_float(pref_t r,int committed)
{
    int pick=0;
    /* The same serialized control address has different meaning across bass
     * engines; a newly adopted engine starts at its own committed value. */
    uint8_t family=(r.kind==R_ENG&&r.a==T_303)?(uint8_t)(engine_bass_bank(r.b)+1):0;
    for(int i=0;i<UI_EASE_SLOTS;i++) {
        ui_ease_t *e=&ui_ease[i];
        if(e->on&&e->r.kind==r.kind&&e->r.a==r.a&&e->r.b==r.b&&e->r.c==r.c&&e->family==family) {
            e->tgt=committed;e->seen=ui.frame;return e->y;
        }
        if(!e->on){if(ui_ease[pick].on)pick=i;}
        else if(ui_ease[pick].on&&(int32_t)(e->seen-ui_ease[pick].seen)<0)pick=i;
    }
    ui_ease[pick]=(ui_ease_t){(float)committed,0,committed,r,ui.frame,1,family};
    return (float)committed;
}
static int ui_ease_value(pref_t r,int committed)
{ float y=ui_ease_float(r,committed);return (int)(y+(y>=0?.5f:-.5f)); }
static uint32_t ui_ease_sig(void)
{
    uint32_t h=0;
    for(int i=0;i<UI_EASE_SLOTS;i++)if(ui_ease[i].on)
        h=h*31u+(uint32_t)(int)(ui_ease[i].y*16.f+.5f);
    return h;
}
#endif
