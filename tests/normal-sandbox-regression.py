#!/usr/bin/env python3
"""Common browser harnesses must preserve Chromium's normal sandbox."""
import ast,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
for path in ['tests/browser-admission.py','tests/visual/visual_gate.py']:
 tree=ast.parse((root/path).read_text());launches=[n for n in ast.walk(tree) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='launch']
 assert launches,path
 for call in launches:
  keys={k.arg:k.value for k in call.keywords}
  assert isinstance(keys.get('chromium_sandbox'),ast.Constant) and keys['chromium_sandbox'].value is True,path
  assert not any(isinstance(n,ast.Constant) and isinstance(n.value,str) and 'no-sandbox' in n.value for n in ast.walk(call)),path
print('PASS: both common browser launchers require normal Chromium sandbox')
