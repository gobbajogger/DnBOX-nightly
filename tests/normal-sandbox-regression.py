#!/usr/bin/env python3
"""Audit every Python Chromium launcher, including the complete gate call graph."""
import ast,pathlib
root=pathlib.Path(__file__).resolve().parent
failures=[];count=0
for path in root.rglob('*.py'):
 tree=ast.parse(path.read_text())
 for call in ast.walk(tree):
  if not (isinstance(call,ast.Call) and isinstance(call.func,ast.Attribute) and call.func.attr=='launch' and isinstance(call.func.value,ast.Attribute) and call.func.value.attr=='chromium'):continue
  count+=1;keys={k.arg:k.value for k in call.keywords}
  good=isinstance(keys.get('chromium_sandbox'),ast.Constant) and keys['chromium_sandbox'].value is True
  good=good and not any(isinstance(n,ast.Constant) and isinstance(n.value,str) and 'no-sandbox' in n.value for n in ast.walk(call))
  if not good:failures.append(f'{path.relative_to(root)}:{call.lineno}')
assert count,'no Chromium launchers found'
assert not failures,'normal sandbox missing: '+', '.join(failures)
print(f'PASS: all {count} Chromium launchers require normal sandbox')
