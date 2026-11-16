-- SPDX-License-Identifier: GPL-3.0-only
-- TouchOSC root callbacks for the simulator-only DNR2 source harness.
-- The document builder must supply DNBOX_CODEC, DNBOX_SESSION and an explicit
-- DNBOX_SIMULATOR_PIN. With no pin this script sends nothing. Not native admission.
-- Official callback/message contract: https://hexler.net/touchosc/manual/script-objects-control
-- https://hexler.net/touchosc/manual/script-functions-global
local codec, factory, pin = DNBOX_CODEC, DNBOX_SESSION, DNBOX_SIMULATOR_PIN
local session, deadline, started = nil, nil, nil
local route = {true,false,false,false,false,false,false,false,false,false}
local function state(phase, value)
  if type(DNBOX_ON_STATE)=='function' then DNBOX_ON_STATE(phase,value) end
end
local function abort()
  session=nil;deadline=nil;started=nil;state('failed')
end
local function transmit(bytes)
  started=getMillis();deadline=started+1000;state('pending')
  sendMIDI(bytes,route)
end
local function invoke(method, ...)
  if not session then return end
  local ok,bytes=pcall(method,session,...)
  if not ok then abort();return end
  transmit(bytes)
end
function init()
  session=nil;deadline=nil;started=nil;state('disconnected')
end
function onReceiveNotify(key, value)
  if key~='dnr2' or type(value)~='table' then return end
  if value.action=='connect' then
    if session or type(pin)~='table' or pin.testOnly~=true or type(factory)~='table' or type(codec)~='table' then return end
    local ok,created=pcall(factory.new,codec,pin)
    if not ok then abort();return end
    session=created;state('connecting');invoke(session.hello)
  elseif value.action=='cancel' then
    session=nil;deadline=nil;started=nil;state('disconnected')
  elseif value.action=='set' then
    if session and session.phase=='ready' and not session.pending then invoke(session.set,value.id,value.value) end
  elseif value.action=='read' then
    if session and session.phase=='ready' and not session.pending then invoke(session.read,value.id) end
  elseif value.action=='close' then
    if session and session.phase=='ready' and not session.pending then invoke(session.close) end
  end
end
function onReceiveMIDI(message, connections)
  if not session or not session.pending or type(connections)~='table' or connections[1]~=true or type(message)~='table' then return end
  -- Unrelated musical MIDI must never be mistaken for a protocol reply.
  if message[1]~=240 or message[2]~=125 or message[3]~=68 or message[4]~=78 then return end
  local now=getMillis()
  if not deadline or not started or now<started or now>=deadline then abort();return true end
  local ok,reply=pcall(session.accept,session,message)
  deadline=nil
  if not ok then abort();return true end
  if reply.op==0 then invoke(session.open)
  elseif reply.op==1 then invoke(session.read,pin.controls[1].id)
  elseif reply.op==7 then session=nil;state('disconnected')
  else state('ready',{id=reply.control,value=reply.value,kind=reply.kind,queued=reply.status==1}) end
  return true
end
function update()
  if deadline then local now=getMillis();if now<started or now>=deadline then abort() end end
end
