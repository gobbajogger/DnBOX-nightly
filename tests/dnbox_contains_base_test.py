import importlib.util, os, pathlib, subprocess, tempfile, unittest, zlib, re, shutil
P=pathlib.Path(__file__).resolve().parents[1]/'tools/dnbox_contains_base.py'
spec=importlib.util.spec_from_file_location('contains',P);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def setUp(self):
  self.old=os.getcwd();self.tmp=tempfile.TemporaryDirectory();os.chdir(self.tmp.name);self.git('init','-q');self.tree=self.git('mktree',input=b'');self.base=self.commit([]);self.head=self.commit([self.base]);self.git('update-ref','HEAD',self.head)
 def tearDown(self):os.chdir(self.old);self.tmp.cleanup()
 def git(self,*args,input=None):return subprocess.check_output(['git',*args],input=input,stderr=subprocess.DEVNULL).decode().strip()
 def commit(self,parents):
  raw=('tree '+self.tree+'\n'+''.join('parent '+p+'\n' for p in parents)+'author Test <test@example.invalid> 1 +0000\ncommitter Test <test@example.invalid> 1 +0000\n\nfixture\n').encode();return self.git('hash-object','-w','-t','commit','--stdin',input=raw)
 def gates(self):
  return [p for name in ['firmware-gate.sh','nightly-gate.sh','tools/dnbox-gate.sh','scripts/dnbox-gate.sh'] if (p:=P.parents[1]/name).is_file()]
 def cli(self,base=None):return subprocess.run(['python3',str(P),base or self.base],capture_output=True,text=True)
 def test_standard(self):self.assertEqual(self.cli().returncode,0)
 def test_missing_secondary(self):
  self.head=self.commit([self.base,'f'*40]);self.git('update-ref','HEAD',self.head);r=self.cli();self.assertEqual(r.returncode,0);self.assertIn('hash-verified-first-parent',r.stdout)
 def test_missing_first(self):
  h=self.commit(['e'*40,'f'*40]);self.git('update-ref','HEAD',h);self.assertNotEqual(self.cli().returncode,0)
 def test_nonancestor(self):
  other=self.commit([]);# distinct commit fixture identity
  raw=self.git('cat-file','commit',other).replace('fixture','different').encode();other=self.git('hash-object','-w','-t','commit','--stdin',input=raw);self.assertNotEqual(self.cli(other).returncode,0)
 def test_invalid_base(self):self.assertNotEqual(self.cli('HEAD~1').returncode,0)
 def test_blob_base(self):
  blob=self.git('hash-object','-w','--stdin',input=b'not commit');self.assertNotEqual(self.cli(blob).returncode,0)
 def test_corrupt_witness(self):
  h=self.commit([self.base,'f'*40]);obj=pathlib.Path('.git/objects')/h[:2]/h[2:];raw=zlib.decompress(obj.read_bytes()).replace(b'fixture',b'changed');obj.unlink();obj.write_bytes(zlib.compress(raw))
  with self.assertRaises(ValueError):m.first_parent_witness(self.base,h)
 def test_gate_diff_failure_rejects(self):
  pathlib.Path('tools').mkdir();shutil.copyfile(P,'tools/dnbox_contains_base.py');pathlib.Path('mockbin').mkdir();real=shutil.which('git');mock=pathlib.Path('mockbin/git');mock.write_text('#!/bin/sh\n[ "$1" != diff ] || exit 3\nexec '+real+' "$@"\n');mock.chmod(0o755)
  env=dict(os.environ,PATH=str(pathlib.Path('mockbin').resolve())+os.pathsep+os.environ['PATH'],DNBOX_BASE_SHA=self.base)
  for gate in self.gates():
   source=gate.read_text();function=re.search(r'no_loss\(\).*?(?=\nlimits\(\))',source,re.S).group()
   run=subprocess.run(['bash','-c',function+'\nBASE='+self.base+'; LANE=integ; no_loss'],env=env,capture_output=True,text=True);self.assertNotEqual(run.returncode,0,str(gate))
 def test_gate_fetched_symbolic_base(self):
  pathlib.Path('tools').mkdir();shutil.copyfile(P,'tools/dnbox_contains_base.py');self.git('update-ref','refs/remotes/origin/integration/dnbox-consolidated',self.base);pathlib.Path('mockbin').mkdir();real=shutil.which('git');mock=pathlib.Path('mockbin/git');mock.write_text('#!/bin/sh\n[ "$1" != fetch ] || exit 0\nexec '+real+' "$@"\n');mock.chmod(0o755)
  env=dict(os.environ,PATH=str(pathlib.Path('mockbin').resolve())+os.pathsep+os.environ['PATH']);env.pop('DNBOX_BASE_SHA',None)
  for gate in self.gates():
   function=re.search(r'no_loss\(\).*?(?=\nlimits\(\))',gate.read_text(),re.S).group();run=subprocess.run(['bash','-c',function+'\nBASE=origin/integration/dnbox-consolidated; LANE=integ; no_loss'],env=env,capture_output=True,text=True);self.assertEqual(run.returncode,0,run.stdout+run.stderr)
 def test_self_authenticates(self):self.assertEqual(m.first_parent_witness(self.base,self.base),[self.base])
if __name__=='__main__':unittest.main()
