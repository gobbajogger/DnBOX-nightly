"""Run packed source Lua against an isolated one-control native stdio host."""
import importlib.util
import json
from hashlib import sha256
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zlib

nightly, firmware, binary, output = [Path(value).resolve() for value in sys.argv[1:]]
packer_file = nightly / 'tools/touchosc-parameters/pack.py'
test_file = nightly / 'tests/product-remote/touchosc-parameters-host.py'
lua_fixture = test_file.with_suffix('.lua')
catalog_file = firmware / 'docs/remote-scalar-catalog.json'
header_file = firmware / 'firmware/src/app/dnr2_native_catalog.h'

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

packer = load('scalar_packer', packer_file)
fixture = load('scalar_fixture', test_file)
catalog = json.loads(catalog_file.read_text())
binding, = catalog['controls']
assert catalog['protocol'] == 2 and binding == {
    'id': 1, 'kind': 1, 'min': 0, 'max': 127, 'label': '909 MIX Level',
    'owner': '909', 'target': 'T_MIX', 'parameter': 'MX_LEVEL',
}
generated_crc = int(re.search(r'DNR2_NATIVE_CRC (0x[0-9a-f]+)u', header_file.read_text())[1], 16)
canonical = json.dumps(catalog, sort_keys=True, separators=(',', ':')).encode()
assert generated_crc == zlib.crc32(canonical)
engine = (firmware / 'firmware/src/app/engine.h').read_text()
def enum_index(member):
    candidates = re.findall(r'enum\s*\{([^}]+)\}', engine)
    options, = [group.split(',') for group in candidates if member in group.split(',')[0].split() or re.search(r'\b'+member+r'\b', group)]
    return [option.strip() for option in options].index(member)
control = {**binding, 'target': enum_index('T_MIX'), 'voice': enum_index('PART_909'),
           'parameter': enum_index('MX_LEVEL'), 'bank': -1, 'role': '909 MIX'}
fixture_prefix = lua_fixture.read_text().split("if mode == 'stock' then", 1)[0]
driver = fixture_prefix + """
if mode == 'mismatch' then
  assert(text('status') == 'Parameter catalog does not match')
  press('increase'); press('apply'); press('undo'); assert(#queued == 0)
else
  pump(equal('Stored values confirmed'))
  assert(tonumber(text('range'):match('^ID (%d+)')) == 1)
  assert(text('stored') == 'Stored 75')
  milliseconds = 700; update(); exchange()
  press('next')
  assert(tonumber(text('range'):match('^ID (%d+)')) == 1)
  press('increase'); assert(#queued == 0 and text('draft') == 'Proposed 76')
  press('apply'); pump(equal('Queued. Stored 76'))
  assert(controls.undo.interactive)
  press('undo'); pump(equal('Restored stored value 75'))
  assert(not controls.undo.interactive)
  press('disconnect'); exchange()
  assert(text('status') == 'Disconnected' and not controls.apply.interactive)
  press('apply'); press('undo'); assert(#queued == 0)
end
print('PASS ' .. mode)
"""

def run(temp, mode, layout):
    packed = temp / f'{mode}.tosc'
    if mode == 'native':
        packed.write_bytes((output.parent / 'reviewed-scalar-staging.tosc').read_bytes())
    else:
        packed.write_bytes(zlib.compress(packer.make_layout(layout), 9))
    unpacked = temp / mode
    fixture.extract_layout(packed, unpacked, closed=not layout)
    trace = []
    with subprocess.Popen(['texlua', str(temp / 'test.lua'), str(unpacked), mode],
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) as lua:
        with subprocess.Popen([str(binary), '--serve'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True) as host:
            for line in lua.stdout:
                tag, _, payload = line.rstrip().partition(' ')
                if tag == 'PASS':
                    assert payload == mode
                    break
                assert tag == 'wire', line
                frame = bytes.fromhex(payload)
                assert frame[:5] == bytes((240, 125, 68, 78, 2)) and len(frame) == 51
                host.stdin.write(payload + '\n')
                host.stdin.flush()
                wire = host.stdout.readline().strip()
                reply = bytes.fromhex(wire)
                assert len(reply) == 51 and reply[5] == (64 | frame[5])
                trace.append((fixture.OPS[frame[5]], reply[6], fixture.unpack(reply, 28, 2),
                              fixture.unpack(reply, 24, 4), fixture.unpack(reply, 30, 5)))
                lua.stdin.write(wire + '\n')
                lua.stdin.flush()
            else:
                raise AssertionError(f'{mode} did not finish')
            host.stdin.close()
            assert host.wait(timeout=5) == 0
        assert lua.wait(timeout=5) == 0
    return {'packed_sha256': sha256(packed.read_bytes()).hexdigest(), 'trace': trace}

with tempfile.TemporaryDirectory() as directory:
    temp = Path(directory)
    (temp / 'test.lua').write_text(driver)
    cases = {'closed': run(temp, 'closed', None),
             'mismatch': run(temp, 'mismatch', {'crc': generated_crc ^ 1, 'controls': [control]}),
             'native': run(temp, 'native', {'crc': generated_crc, 'controls': [control]})}
assert cases['closed']['trace'] == []
assert len(cases['mismatch']['trace']) == 1
assert cases['mismatch']['trace'][0] == ('HELLO', 0, 1, 1, generated_crc)
trace = cases['native']['trace']
assert [row[0] for row in trace] == ['HELLO', 'OPEN', 'READ', 'KEEPALIVE', 'SET', 'READ', 'READ', 'SET', 'READ', 'CLOSE'], trace
assert trace[0] == ('HELLO', 0, 1, 1, generated_crc)
assert [row for row in trace[2:-1] if row[0] != 'KEEPALIVE'] == [
    ('READ', 0, 1, 1, 75), ('SET', 1, 1, 2, 76), ('READ', 0, 1, 2, 76),
    ('READ', 0, 1, 2, 76), ('SET', 1, 1, 3, 75), ('READ', 0, 1, 3, 75),
]
assert trace[-1][1] == 0
paths = [packer_file, test_file, lua_fixture, catalog_file, header_file, binary, Path(__file__)]
receipt = {'nightly': 'c7b026cf86b3e153dcb3c564ced8fce25b9b3880',
           'catalog_crc': f'{generated_crc:08x}', 'control': binding, 'test_only': True, 'cases': cases,
           'sha256': {str(path): sha256(path.read_bytes()).hexdigest() for path in paths}}
output.write_text(json.dumps(receipt, indent=2) + '\n')
print('PASS packed closed, checksum refusal, one-control native READ/Apply/Undo/fresh read/CLOSE')
