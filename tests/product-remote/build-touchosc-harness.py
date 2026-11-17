# SPDX-License-Identifier: GPL-3.0-only
"""Deterministic source-only TouchOSC XML harness, never native admission.

Reuses this project's original lexml v5 typed-property packing pattern from
firmware94197fc8 web/offline-sequencer/touchosc/pack.py. Actual TouchOSC open and
runtime tests remain mandatory. Default output embeds no simulator pin/no I/O.
"""
import argparse
from pathlib import Path
import uuid
from xml.dom import minidom
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'web/product-site/remote/touchosc'

def root_script(simulator=False):
    text='-- Generated SOURCE-ONLY harness; not native admission.\n'
    for name,file in [('DNBOX_CODEC','dnr2-codec.lua'),('DNBOX_SESSION','dnr2-session.lua')]:
        text+=name+'=(function()\n'+(SOURCE/file).read_text()+'\nend)()\n'
    text+='DNBOX_SIMULATOR_PIN='+('{testOnly=true,client=94,catalogCrc=305419896,catalogCount=3,controls={{id=1,kind=1,min=0,max=1000}}}' if simulator else 'nil')+'\n'
    text+='function DNBOX_ON_STATE(phase,value) local c=root:findByName("state");if c then c.values.text=phase end end\n'
    return text+(SOURCE/'dnr2-controller.lua').read_text()

def make_xml(simulator=False):
    doc=minidom.Document();top=doc.createElement('lexml');top.setAttribute('version','5');doc.appendChild(top)
    def el(parent,name,text=None):
        e=doc.createElement(name);parent.appendChild(e)
        if text is not None:e.appendChild(doc.createTextNode(str(text)))
        return e
    def cdata(parent,text):
        if ']]>' in text:raise ValueError('CDATA terminator')
        parent.appendChild(doc.createCDATASection(text))
    def prop(parent,key,kind,value):
        p=el(parent,'property');p.setAttribute('type',kind);cdata(el(p,'key'),key);v=el(p,'value')
        if kind=='s':cdata(v,value)
        elif kind in ['r','c']:
            for k,x in zip('xywh' if kind=='r' else 'rgba',value):el(v,k,x)
        else:v.appendChild(doc.createTextNode(str(value)))
    def control(parent,name,kind,frame,text='',script=None):
        n=el(parent,'node');n.setAttribute('ID',str(uuid.uuid5(uuid.NAMESPACE_URL,'https://github.com/gobbajogger/x0x37-for-Loopy-Pro_nightly/touchosc-test/'+name)));n.setAttribute('type',kind)
        properties=el(n,'properties');values=el(n,'values');fields={'name':('s',name),'frame':('r',frame),'visible':('b',1),'interactive':('b',int(kind=='BUTTON')),'background':('b',int(kind=='BUTTON')),'color':('c',(.12,.18,.2,1))}
        if script:fields['script']=('s',script)
        if kind=='BUTTON':fields.update(buttonType=('i',0),press=('b',1),release=('b',1))
        if kind=='LABEL':fields.update(textSize=('i',15),textColor=('c',(.95,.95,.95,1)))
        for key,(t,v) in sorted(fields.items()):prop(properties,key,t,v)
        for key,value in ([('x','0')] if kind=='BUTTON' else [('text',text)] if kind=='LABEL' else [])+[('touch','false')]:
            v=el(values,'value');cdata(el(v,'key'),key);el(v,'locked',0);el(v,'lockedDefaultCurrent',0);cdata(el(v,'default'),value);el(v,'defaultPull',0)
        return n
    root=control(top,'dnr2_source_harness','GROUP',(0,0,480,240),script=root_script(simulator));children=el(root,'children')
    control(children,'title','LABEL',(12,8,456,35),'SOURCE HARNESS / NOT NATIVE')
    control(children,'state','LABEL',(12,48,456,35),'disconnected')
    for i,(action,label) in enumerate([('connect','Connect'),('read','Read'),('set','Set 950'),('close','Close'),('cancel','Cancel')]):
        script='function onValueChanged(key) if key=="x" and self.values.x>0 then root:notify("dnr2",{action="'+action+'",id=1,value=950}) end end'
        frame=(12+i*92,110,84,64);control(children,action,'BUTTON',frame,script=script);control(children,action+'_label','LABEL',frame,label)
    return doc.toxml(encoding='UTF-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--simulator',action='store_true');a=parser.parse_args()
    if a.output.suffix!='.xml':parser.error('Use .xml; actual application acceptance remains pending')
    with a.output.open('xb') as f:f.write(make_xml(a.simulator))
