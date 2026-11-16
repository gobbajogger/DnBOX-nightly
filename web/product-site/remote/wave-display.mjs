// SPDX-License-Identifier: GPL-3.0-only
// Chicago source waveform is a continuous SAW→square projection (not a fakeenum).
// Original scalar bytes and formatter profile are unchanged. Other engines need
// their actual table/program mapping; this never aliases Juno to SuperJ6.
export function waveDisplay(bank,raw,max=127){if(bank!=='CHICAGO'||!Number.isFinite(raw)||!Number.isFinite(max)||max<=0||raw<0||raw>max)return null;if(raw===0)return'SAW';if(raw===max)return'SQR';return'BLEND';}
export function parseWaveDisplay(bank,text,max=127){if(bank!=='CHICAGO')return null;const t=String(text).trim().toUpperCase();if(t==='SAW')return 0;if(t==='SQR'||t==='SQUARE')return max;const m=/^BLEND\s+(\d{1,3})\s*%$/.exec(t);return m&&Number(m[1])<=100?Math.round(Number(m[1])*max/100):null;}
