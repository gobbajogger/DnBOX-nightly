-- SPDX-License-Identifier: GPL-3.0-only
-- Execute the actual scripts extracted from the layout. Stdio connects to C.
local directory, mode = arg[1], arg[2]
local controls, queued = {}, {}
local milliseconds = 0
for name in io.lines(directory .. '/names.txt') do controls[name] = {name = name, values = {}} end
root = {
  findByName = function(_, name) return controls[name] end,
  notify = function(_, key, value) onReceiveNotify(key, value) end,
}
function getMillis() return milliseconds end
function sendMIDI(frame, connections)
  assert(#frame == 51 and #connections == 10 and connections[1])
  for i = 2, 10 do assert(connections[i] == false) end
  queued[#queued + 1] = frame
end

dofile(directory .. '/controller.lua')
if mode == 'closed' then
  init()
  assert(controls.status.values.text == 'Parameter binding unavailable')
  for _, operation in ipairs({'connect', 'read', 'increase', 'apply', 'undo', 'disconnect'}) do
    onReceiveNotify('input', {name = operation, pressed = true})
  end
  update()
  assert(#queued == 0)
  print('PASS closed')
  return
end

dofile(directory .. '/button.lua')
init()
local function press(name)
  self = assert(controls[name], name)
  self.values.x = 1; onValueChanged('x')
  self.values.x = 0; onValueChanged('x')
end
local function text(name) return tostring(controls[name].values.text) end
local function effect(command)
  print(command); io.flush()
  return assert(io.read('*l'))
end
local function exchange()
  while #queued > 0 do
    local frame = table.remove(queued, 1)
    local hex = {}
    for i, byte in ipairs(frame) do hex[i] = string.format('%02x', byte) end
    local result = effect('wire ' .. table.concat(hex))
    if result ~= '-' then
      local reply = {}
      for byte in string.gmatch(result, '%x%x') do reply[#reply + 1] = tonumber(byte, 16) end
      local before, prior = text('status'), #queued
      onReceiveMIDI(reply, {false, true})
      assert(text('status') == before and #queued == prior)
      onReceiveMIDI(reply, {true})
    end
  end
end
local function pump(ready)
  for _ = 1, 500 do
    update(); exchange()
    if ready(text('status')) then return end
  end
  error('state not reached: ' .. text('status'))
end
local function equal(expected) return function(value) return value == expected end end
local function advance(ms)
  assert(effect('advance ' .. ms) == 'ok')
  milliseconds = milliseconds + ms
end
local function selectId(id)
  local current = tonumber(text('range'):match('^ID (%d+)'))
  local delta = id - current
  while delta >= 16 do press('next_group'); delta = delta - 16 end
  while delta <= -16 do press('previous_group'); delta = delta + 16 end
  for _ = 1, math.abs(delta) do press(delta > 0 and 'next' or 'previous') end
  assert(tonumber(text('range'):match('^ID (%d+)')) == id)
end

press('apply'); press('undo'); assert(#queued == 0)
press('connect'); exchange()
if mode == 'stock' then
  milliseconds = 1251
  update(); exchange()
  assert(text('status') == 'No matching parameter endpoint replied')
  press('increase'); press('apply'); press('undo'); assert(#queued == 0)
elseif mode == 'mismatch' then
  assert(text('status') == 'Parameter catalog does not match')
  press('increase'); press('apply'); press('undo'); assert(#queued == 0)
else
  -- Force a real timer round trip while the lease is held and scanning has begun.
  advance(700)
  pump(equal('Stored values confirmed'))
  if mode == 'happy' then
    local available = 0
    for id = 1, 326 do
      assert(tonumber(text('range'):match('^ID (%d+)')) == id)
      assert(not not controls.apply.interactive == (text('stored') ~= 'Stored —'))
      if controls.apply.interactive then available = available + 1 end
      if id < 326 then press('next') end
    end
    assert(available == 294)
    selectId(257)
    assert(text('parameter') == 'Chicago A / CUTOFF')
    assert(text('stored') == 'Stored 32')
    press('increase'); assert(#queued == 0 and text('draft') == 'Proposed 33')
    press('apply')
    pump(equal('Queued. Stored 33'))
    assert(text('stored') == 'Stored 33' and controls.undo.interactive)
    press('undo')
    pump(equal('Restored stored value 32'))
    assert(text('stored') == 'Stored 32' and not controls.undo.interactive)
    press('increase'); press('apply')
    pump(equal('Queued. Stored 33'))
    assert(effect('external 26') == 'ok')
    press('undo'); exchange()
    assert(text('status') == 'Stored value changed. Undo withheld. Read again.')
    assert(not controls.apply.interactive and not controls.undo.interactive)
    press('read'); pump(equal('Stored values confirmed'))
    assert(text('stored') == 'Stored 33')
  elseif mode == 'coupled' then
    selectId(253)
    assert(text('parameter') == 'Master / COMP' and text('stored') == 'Stored 95')
    press('increase'); press('apply')
    pump(equal('Other stored values changed. Scalar Undo unavailable.'))
    assert(text('stored') == 'Stored 96' and not controls.undo.interactive)
    press('undo'); assert(#queued == 0)
  else error('unknown mode') end
  press('disconnect'); exchange()
  assert(text('status') == 'Disconnected' and not controls.apply.interactive)
end
print('PASS ' .. mode)
