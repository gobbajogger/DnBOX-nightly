-- SPDX-License-Identifier: GPL-3.0-only
-- This script is concatenated after the generated, source-pinned catalog.
local HELLO, OPEN, READ, SET, KEEPALIVE, CLOSE = 0, 1, 2, 3, 6, 7
local OK, QUEUED, UNSUPPORTED, U32 = 0, 1, 6, 1
local maximumSerial = 268435455
local midi = {true, false, false, false, false, false, false, false, false, false}
local prefix = {240, 125, 68, 78, 2}
local client, sequence, epoch, unit, incarnation = nil, 0, 0, 0, {0, 0, 0}
local selected, pending, scan, snapshot, draft, undo, closing = 1
local lastLease = 0

local function text(name, value)
  local control = root:findByName(name)
  if control then control.values.text = value end
end

local function show()
  local descriptor = descriptors[selected]
  if not descriptor then return end
  text("parameter", descriptor.role .. " / " .. descriptor.label)
  text("range", string.format("ID %d   Raw range %d–%d", descriptor.id, descriptor.min, descriptor.max))
  local value = snapshot and snapshot.values[descriptor.id]
  text("stored", type(value) == "number" and ("Stored " .. value) or "Stored —")
  text("draft", draft and ("Proposed " .. draft) or "Proposed —")
  local canEdit = not pending and not scan and not closing and epoch > 0 and type(value) == "number"
  for _, name in ipairs({"decrease", "increase", "decrease_coarse", "increase_coarse", "apply", "undo"}) do
    local control = root:findByName(name)
    if control then control.interactive = not not (canEdit and (name ~= "undo" or undo)) end
  end
end

local function put(frame, index, count, value)
  for n = index, index + count - 1 do
    frame[n], value = value % 128, math.floor(value / 128)
  end
end

local function get(frame, index, count)
  local value = 0
  for n = index + count - 1, index, -1 do value = value * 128 + frame[n] end
  return value
end

local function send(op, id, revision, value, step)
  if pending or sequence >= maximumSerial then return false end
  sequence = sequence + 1
  local frame = {prefix[1], prefix[2], prefix[3], prefix[4], prefix[5], op}
  put(frame, 7, 4, op == HELLO and 0 or unit)
  put(frame, 11, 4, client)
  put(frame, 15, 4, (op == HELLO or op == OPEN) and 0 or epoch)
  put(frame, 19, 4, sequence)
  put(frame, 23, 4, revision or 0)
  put(frame, 27, 2, id or 0)
  put(frame, 29, 2, 0)
  put(frame, 31, 5, value or 0)
  for i = 1, 3 do put(frame, 36 + 5 * (i - 1), 5, op == HELLO and 0 or incarnation[i]) end
  frame[51] = 247
  pending = {op = op, id = id or 0, request = sequence, at = getMillis(), step = step}
  show()
  sendMIDI(frame, midi)
  return true
end

local function disconnected(message)
  epoch, unit, pending, scan, snapshot, draft, undo, closing = 0, 0, nil, nil, nil, nil, nil, nil
  text("status", message)
  show()
end

local function close(message)
  pending, scan, snapshot, draft, undo = nil, nil, nil, nil, nil
  if epoch == 0 then disconnected(message); return end
  closing = message
  text("status", "Closing session")
  if not send(CLOSE) then disconnected("Release unconfirmed. Wait for the lease to expire.") end
end

local function startScan(expected, edit)
  scan = {index = 1, revision = expected, values = {}, edit = edit}
  snapshot, draft, undo = nil, nil, nil
  text("status", edit and "Reading stored values after change" or "Reading source catalog")
  show()
end

local function completeScan()
  local results, edit = scan, scan.edit
  scan = nil
  snapshot = results
  if not edit then
    text("status", "Stored values confirmed")
  else
    local current, coupled = results.values[edit.id], false
    for _, descriptor in ipairs(descriptors) do
      local id = descriptor.id
      if id ~= edit.id and results.values[id] ~= edit.baseline.values[id] then coupled = true end
    end
    if current == edit.after and not coupled and not edit.inverse then
      undo = {id = edit.id, before = edit.before, after = current, revision = results.revision}
    end
    if coupled then text("status", "Other stored values changed. Scalar Undo unavailable.")
    elseif current ~= edit.after then text("status", "Stored value differs from the requested change")
    elseif edit.inverse then text("status", "Restored stored value " .. current)
    else text("status", (edit.queued and "Queued. Stored " or "Stored ") .. current) end
  end
  show()
end

local function apply(id, value, inverse)
  local baseline = snapshot
  local previous = baseline.values[id]
  undo, draft = nil, nil
  text("status", inverse and "Restoring stored value" or "Applying stored value")
  local edit = {id = id, before = previous, after = value, baseline = baseline, inverse = inverse}
  if not send(SET, id, baseline.revision, value, edit) then close("Session ended. Reconnect and read.") end
end

function init()
  client = math.random(1, maximumSerial)
  disconnected(#descriptors == 0 and "Parameter binding unavailable" or "Archived host · test only")
end

function onReceiveNotify(key, value)
  if key ~= "input" or type(value) ~= "table" or value.pressed ~= true then return end
  local name = value.name
  if #descriptors == 0 then return end
  if name == "disconnect" and not closing then close("Disconnected"); return end
  if pending or scan or closing then return end
  if name == "connect" and epoch == 0 then
    text("status", "Checking catalog on MIDI connection 1")
    if not send(HELLO) then disconnected("Session exhausted. Reopen the layout.") end
    return
  end
  local offsets = {previous = -1, next = 1, previous_group = -16, next_group = 16}
  if offsets[name] then
    selected = ((selected - 1 + offsets[name]) % #descriptors) + 1
    draft, undo = nil, nil
    show()
    return
  end
  if epoch == 0 then return end
  if name == "read" then startScan(); return end
  local d = descriptors[selected]
  local current = snapshot and snapshot.values[d.id]
  if type(current) ~= "number" then return end
  local changes = {decrease = -1, increase = 1, decrease_coarse = -8, increase_coarse = 8}
  if changes[name] then
    draft = math.min(d.max, math.max(d.min, (draft or current) + changes[name]))
    show()
  elseif name == "apply" and draft and draft ~= current then
    apply(d.id, draft, false)
  elseif name == "undo" and undo and undo.id == d.id then
    if not send(READ, d.id, 0, 0, undo) then close("Session ended. Reconnect and read.") end
  end
end

function update()
  local now = getMillis()
  if pending then
    if now < pending.at or now - pending.at >= 1250 then
      if closing then disconnected("Release unconfirmed. Wait for the lease to expire.")
      elseif pending.op == HELLO then disconnected("No matching parameter endpoint replied")
      else close("Response unconfirmed. Reconnect and read.") end
    end
    return
  end
  if epoch == 0 then return end
  if now < lastLease then close("Clock changed. Reconnect and read."); return end
  if now - lastLease >= 650 then
    if not send(KEEPALIVE) then close("Session ended. Reconnect and read.") end
  elseif scan then
    local descriptor = descriptors[scan.index]
    if descriptor then
      if not send(READ, descriptor.id, 0, 0, descriptor) then close("Session ended. Reconnect and read.") end
    else completeScan() end
  end
end

local function checkedReply(frame, connections)
  if not pending or type(connections) ~= "table" or connections[1] ~= true or
     type(frame) ~= "table" or #frame ~= 51 or frame[51] ~= 247 then return end
  for i = 1, 5 do if frame[i] ~= prefix[i] then return end end
  for i = 2, 50 do
    local byte = frame[i]
    if type(byte) ~= "number" or byte ~= math.floor(byte) or byte < 0 or byte > 127 then return end
  end
  for i = 35, 50, 5 do if frame[i] > 15 then return end end
  if frame[6] ~= pending.op + 64 or get(frame, 13, 4) ~= client or
     get(frame, 21, 4) ~= pending.request then return end
  local reply = {status = frame[7], kind = frame[8], id = get(frame, 29, 2), value = get(frame, 31, 5),
                 unit = get(frame, 9, 4), epoch = get(frame, 17, 4), revision = get(frame, 25, 4), high = {}}
  if reply.unit == 0 or reply.revision == 0 then return end
  for i = 1, 3 do reply.high[i] = get(frame, 36 + 5 * (i - 1), 5) end
  if pending.op ~= HELLO then
    if reply.unit ~= unit or reply.id ~= pending.id then return end
    for i = 1, 3 do if reply.high[i] ~= incarnation[i] then return end end
    if pending.op ~= OPEN and reply.epoch ~= epoch then return end
  end
  return reply
end

function onReceiveMIDI(frame, connections)
  local reply = checkedReply(frame, connections)
  if not reply then return end
  local action = pending
  pending = nil
  if action.op == HELLO then
    if reply.status ~= OK or reply.id ~= #descriptors or reply.value ~= catalogCrc or reply.kind ~= 0 or reply.epoch ~= 0 then
      disconnected("Parameter catalog does not match"); return
    end
    unit, incarnation = reply.unit, reply.high
    if not send(OPEN) then disconnected("Session exhausted. Reopen the layout.") end
  elseif action.op == OPEN then
    if reply.status ~= OK or reply.epoch == 0 or reply.kind ~= 0 or reply.value ~= 0 then
      disconnected("Write session not granted"); return
    end
    epoch, lastLease = reply.epoch, getMillis()
    startScan()
  elseif action.op == CLOSE then
    disconnected(reply.status == OK and closing or "Release unconfirmed. Wait for the lease to expire.")
  elseif action.op == KEEPALIVE then
    if reply.status ~= OK or reply.kind ~= 0 or reply.value ~= 0 then close("Lease expired. Reconnect and read."); return end
    lastLease = getMillis()
    if snapshot and reply.revision ~= snapshot.revision then
      snapshot, draft, undo = nil, nil, nil
      text("status", "Stored values changed. Read again.")
    end
    show()
  elseif action.op == SET then
    local edit = action.step
    if (reply.status ~= OK and reply.status ~= QUEUED) or reply.kind ~= U32 or
       reply.revision ~= edit.baseline.revision + 1 then
      close("Change unconfirmed. Reconnect and read."); return
    end
    lastLease = getMillis()
    edit.queued = reply.status == QUEUED
    startScan(reply.revision, edit)
  elseif scan then
    local descriptor = action.step
    if scan.revision and reply.revision ~= scan.revision then close("Stored values changed during Read"); return end
    scan.revision = reply.revision
    if reply.status == OK and reply.kind == U32 and reply.value >= descriptor.min and reply.value <= descriptor.max then
      scan.values[descriptor.id] = reply.value
    elseif reply.status == UNSUPPORTED and reply.kind == 0 and reply.value == 0 then
      scan.values[descriptor.id] = false
    else close("Invalid parameter reply"); return end
    scan.index = scan.index + 1
  else
    local saved = action.step
    if reply.status ~= OK or reply.kind ~= U32 or reply.value ~= saved.after or reply.revision ~= saved.revision then
      undo, snapshot, draft = nil, nil, nil
      text("status", "Stored value changed. Undo withheld. Read again.")
      show()
    else apply(saved.id, saved.before, true) end
  end
end
