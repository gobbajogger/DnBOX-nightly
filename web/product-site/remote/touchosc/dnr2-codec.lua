-- SPDX-License-Identifier: GPL-3.0-only
-- Lua 5.1-compatible DNR2 wire codec for TouchOSC. No MIDI I/O or auto-admission.
-- Source contract: tests/product-remote/tests/c-reference/remote_wire.c.
local M = {}
local function integer(value, maximum)
  assert(type(value) == 'number' and value == value and value >= 0 and value <= maximum and value == math.floor(value), 'Invalid DNR2 integer')
  return value
end
local function put(bytes, offset, count, value)
  for i = 0, count - 1 do
    bytes[offset + i] = value % 128
    value = math.floor(value / 128)
  end
end
local function get(bytes, offset, count)
  local value = 0
  for i = 0, count - 1 do value = value + bytes[offset + i] * 2 ^ (7 * i) end
  return value
end
function M.encodeCommand(command)
  assert(type(command) == 'table' and command.version == 2, 'Invalid DNR2 version')
  local bytes = {}
  for i = 1, 51 do bytes[i] = 0 end
  bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6] = 240, 125, 68, 78, 2, integer(command.op, 7)
  for i, key in ipairs({'unit', 'client', 'epoch', 'request', 'revision'}) do put(bytes, 7 + (i - 1) * 4, 4, integer(command[key], 268435455)) end
  put(bytes, 27, 2, integer(command.control, 16383))
  put(bytes, 29, 2, integer(command.token, 16383))
  put(bytes, 31, 5, integer(command.value, 4294967295))
  assert(type(command.unitHigh) == 'table' and #command.unitHigh == 3, 'Three incarnation words required')
  for i = 1, 3 do put(bytes, 36 + (i - 1) * 5, 5, integer(command.unitHigh[i], 4294967295)) end
  bytes[51] = 247
  return bytes
end
function M.decodeReply(bytes)
  assert(type(bytes) == 'table' and #bytes == 51, 'Invalid DNR2 frame length')
  assert(bytes[1] == 240 and bytes[2] == 125 and bytes[3] == 68 and bytes[4] == 78 and bytes[5] == 2 and bytes[51] == 247, 'Invalid DNR2 header')
  for i = 2, 50 do integer(bytes[i], 127) end
  for _, i in ipairs({35, 40, 45, 50}) do assert(bytes[i] <= 15, 'Noncanonical DNR2 uint32') end
  assert(bytes[6] >= 64 and bytes[6] <= 71, 'Invalid DNR2 reply operation')
  local result = {op = bytes[6] - 64, status = bytes[7], kind = bytes[8], unitHigh = {}}
  for i, key in ipairs({'unit', 'client', 'epoch', 'request', 'revision'}) do result[key] = get(bytes, 9 + (i - 1) * 4, 4) end
  result.control, result.value = get(bytes, 29, 2), get(bytes, 31, 5)
  for i = 1, 3 do result.unitHigh[i] = get(bytes, 36 + (i - 1) * 5, 5) end
  return result
end
return M
