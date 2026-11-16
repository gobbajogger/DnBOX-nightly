-- SPDX-License-Identifier: GPL-3.0-only
-- Simulator-only, no-I/O transaction owner over the pinned DNR2 codec.
-- No native catalog admission, MIDI send, lease timer, HELD or device claims.
local M = {}
local function uint(n,max) return type(n)=='number' and n==math.floor(n) and n>=0 and n<=max end
function M.new(codec, pin)
  assert(type(codec)=='table' and type(pin)=='table' and pin.testOnly==true, 'Reviewed simulator pin required')
  assert(uint(pin.client,268435455) and pin.client>0, 'Client required')
  assert(uint(pin.catalogCrc,4294967295) and uint(pin.catalogCount,16383) and pin.catalogCount>0 and type(pin.controls)=='table' and #pin.controls>0 and #pin.controls<=pin.catalogCount, 'Catalog required')
  local controls = {}
  for _, c in ipairs(pin.controls) do
    assert(c.kind==1 and uint(c.id,16383) and not controls[c.id] and uint(c.min,4294967295) and uint(c.max,4294967295) and c.min<=c.max, 'Reviewed U32 controls only')
    controls[c.id]={id=c.id,kind=1,min=c.min,max=c.max}
  end
  local self={phase='disconnected',request=0,unit=0,unitHigh={0,0,0},epoch=0,revision=0,pending=nil,values={}}
  local function fail(message) self.phase='failed'; self.pending=nil; error(message) end
  local function command(op,control,value)
    assert(not self.pending, 'One transaction at a time')
    self.request=self.request+1
    local c={version=2,op=op,unit=self.unit,unitHigh=self.unitHigh,client=pin.client,epoch=self.epoch,request=self.request,revision=op<=1 and 0 or self.revision,control=control or 0,token=0,value=value or 0}
    local bytes=codec.encodeCommand(c);self.pending=c;return bytes
  end
  function self:hello() assert(self.phase=='disconnected','Fresh session required');return command(0) end
  function self:open() assert(self.phase=='identified','Identify first');return command(1) end
  function self:read(id) assert(self.phase=='ready' and controls[id],'Reviewed control required');return command(2,id) end
  function self:set(id,value)
    local c=controls[id]
    assert(self.phase=='ready' and c and self.values[id]~=nil,'Read the reviewed control first')
    assert(type(value)=='number' and value==math.floor(value) and value>=c.min and value<=c.max,'Value outside native domain')
    return command(3,id,value)
  end
  function self:close() assert(self.phase=='ready','Open session required');return command(7) end
  function self:timeout() return fail('Reply not confirmed; reconnect with a fresh session') end
  function self:accept(bytes)
    local c=self.pending;assert(c,'No pending transaction')
    local ok,r=pcall(codec.decodeReply,bytes);if not ok then return fail('Malformed reply') end
    if r.op~=c.op or r.client~=pin.client or r.request~=c.request then return fail('Uncorrelated reply') end
    if r.status~=0 then return fail('Firmware rejected transaction') end
    if c.op==0 then
      if r.unit==0 or r.value~=pin.catalogCrc or r.control~=pin.catalogCount then return fail('Catalog mismatch') end
      self.unit=r.unit;self.unitHigh={r.unitHigh[1],r.unitHigh[2],r.unitHigh[3]};self.phase='identified'
    else
      if r.revision<self.revision then return fail('Stale source revision') end
      if r.unit~=self.unit then return fail('Instrument changed') end
      for i=1,3 do if r.unitHigh[i]~=self.unitHigh[i] then return fail('Instrument incarnation changed') end end
      if c.op==1 then if r.epoch==0 then return fail('Invalid lease') end;self.epoch=r.epoch;self.phase='ready'
      else
        if r.epoch~=self.epoch then return fail('Lease changed') end
        if c.op==2 or c.op==3 then
          local d=controls[c.control]
          if r.control~=c.control or r.kind~=d.kind or r.value<d.min or r.value>d.max then return fail('Invalid source value') end
          self.values[c.control]=r.value
        elseif c.op==7 then self.phase='closed';self.values={} end
      end
    end
    self.revision=r.revision;self.pending=nil;return r
  end
  return self
end
return M
