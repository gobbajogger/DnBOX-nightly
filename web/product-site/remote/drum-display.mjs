// SPDX-License-Identifier: GPL-3.0-only
// Source-only exact formatter projection, not native protocol admission.
import t0 from './drum-formatters/909-voice-00.json' with {type:'json'};
import t1 from './drum-formatters/909-voice-01.json' with {type:'json'};
import t2 from './drum-formatters/909-voice-02.json' with {type:'json'};
import t3 from './drum-formatters/909-voice-03.json' with {type:'json'};
import t4 from './drum-formatters/909-voice-04.json' with {type:'json'};
import t5 from './drum-formatters/909-voice-05.json' with {type:'json'};
import t6 from './drum-formatters/909-voice-06.json' with {type:'json'};
import t7 from './drum-formatters/909-voice-07.json' with {type:'json'};
import t8 from './drum-formatters/909-voice-08.json' with {type:'json'};
import t9 from './drum-formatters/909-voice-09.json' with {type:'json'};
import t10 from './drum-formatters/909-voice-10.json' with {type:'json'};
import t11 from './drum-formatters/909-voice-11.json' with {type:'json'};
import t12 from './drum-formatters/808-voice-00.json' with {type:'json'};
import t13 from './drum-formatters/808-voice-01.json' with {type:'json'};
import t14 from './drum-formatters/808-voice-02.json' with {type:'json'};
import t15 from './drum-formatters/808-voice-03.json' with {type:'json'};
import t16 from './drum-formatters/808-voice-04.json' with {type:'json'};
import t17 from './drum-formatters/808-voice-05.json' with {type:'json'};
import t18 from './drum-formatters/808-voice-06.json' with {type:'json'};
import t19 from './drum-formatters/808-voice-07.json' with {type:'json'};
import t20 from './drum-formatters/808-voice-08.json' with {type:'json'};
import t21 from './drum-formatters/808-voice-09.json' with {type:'json'};
import t22 from './drum-formatters/808-voice-10.json' with {type:'json'};
import t23 from './drum-formatters/808-voice-11.json' with {type:'json'};
import{DrumFormats}from'./drum-format.mjs';
const formats=new DrumFormats([t0,t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,t13,t14,t15,t16,t17,t18,t19,t20,t21,t22,t23]);
export function drumDisplay(id,raw){const key=String(id).split('|').at(-1);if(!/^1:[01]:\d+:\d+$/.test(key))return null;return formats.format(key,raw);}
