#!/usr/bin/env python3
import pathlib,subprocess,tempfile
s=(pathlib.Path(__file__).resolve().parents[1]/'scripts/dnbox-gate.sh').read_text()
scan=next(l.strip() for l in s.splitlines() if 'git grep -lIE' in l).split('&&')[0].strip()
with tempfile.TemporaryDirectory() as d:
 p=pathlib.Path(d);subprocess.run(['git','init','-q'],cwd=p,check=True)
 for value in ['ordinary safe notes','gh'+'p_'+'A'*24,'-----BEGIN '+'PRIVATE KEY-----']:
  (p/'notes.md').write_text(value+'\n');subprocess.run(['git','add','notes.md'],cwd=p,check=True)
  result=subprocess.run(['bash','-c',scan],cwd=p,capture_output=True,text=True)
  assert (result.returncode==0)==(value!='ordinary safe notes')
  assert value not in result.stdout+result.stderr
print('PASS 3: Markdown token/key detection without value disclosure')
