#!/usr/bin/env python3
"""Source policy guard over transitive repository browser test entrypoints.
Static policy evidence only, never a runtime/browser PASS.
"""
import ast,pathlib,re,sys
root=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path(__file__).resolve().parents[1]
count=0;errors=[]
for folder in ['tests','web','tools','host','scripts']:
 for p in (root/folder).rglob('*'):
  if p.suffix not in ('.py','.mjs','.js') or not p.is_file():continue
  s=p.read_text()
  if p.suffix=='.py':
   for call in ast.walk(ast.parse(s)):
    if not (isinstance(call,ast.Call) and isinstance(call.func,ast.Attribute) and call.func.attr in ('launch','launch_persistent_context') and isinstance(call.func.value,ast.Attribute) and call.func.value.attr=='chromium'):continue
    count+=1;keys={k.arg:k.value for k in call.keywords}
    good=isinstance(keys.get('chromium_sandbox'),ast.Constant) and keys['chromium_sandbox'].value is True
    good=good and not any(isinstance(n,ast.Constant) and isinstance(n.value,str) and 'no-sandbox' in n.value for n in ast.walk(call))
    if not good:errors.append(f'{p.relative_to(root)}:{call.lineno}')
  else:
   for match in re.finditer(r'chromium\s*\.\s*launch(?:PersistentContext)?\s*\((.*?)\)',s,re.S):
    count+=1
    if not re.search(r'chromiumSandbox\s*:\s*true\b',match[1]) or 'no-sandbox' in match[1]:errors.append(str(p.relative_to(root)))
assert count,'no Chromium launchers found'
assert not errors,'unsafe/default-off Chromium launchers: '+', '.join(errors)
print(f'PASS source policy: {count} browser launchers; runtime not implied')
