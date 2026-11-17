#!/usr/bin/env python3
"""Exercise the actual limits function in disposable Git repositories."""
import pathlib,subprocess,tempfile,unittest,shlex,io,zipfile
SOURCE=pathlib.Path(__file__).resolve().parents[1]
class Limits(unittest.TestCase):
 def check(self,files,expected):
  with tempfile.TemporaryDirectory() as d:
   r=pathlib.Path(d)
   def git(*args):return subprocess.run(['git',*args],cwd=r,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid')
   for name,data in files.items():
    p=r/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
   git('add','.');git('commit','-qm','fixture')
   script=(SOURCE/'scripts/dnbox-gate.sh').read_text();start=script.index('limits()');end=script.index('\nbuild()',start)
   command='BASE=HEAD; LANE=integ;\n'+script[start:end]+'\nlimits\n'
   command=command.replace('python3 scripts/dnbox-hard-limits.py','python3 '+shlex.quote(str(SOURCE/'scripts/dnbox-hard-limits.py')))
   got=subprocess.run(['bash','-c',command],cwd=r,capture_output=True,text=True)
   self.assertEqual(got.returncode==0,expected,got.stdout+got.stderr)
 def test_plain(self):self.check({'x.txt':b'normal\n'},True)
 def test_retained_workflow(self):self.check({'.github/workflows/old.yml':b'name: old\n'},False)
 def test_psram(self):self.check({'build.sh':b'export ENABLE_PSRAM=1\n'},False)
 def test_json_psram(self):self.check({'config.json':b'{"memory":{"ENABLE_PSRAM":true}}\n'},False)
 def test_paren_define(self):self.check({'config.h':b'#define CONFIG_PSRAM_ENABLE (1)\n'},False)
 def test_kconfig(self):self.check({'config.cfg':b'CONFIG_PSRAM=y\n'},False)
 def test_typed(self):self.check({'config.c':b'bool psram_enabled = true;\n'},False)
 def test_detector_literal(self):self.check({'scan.py':b"pattern = r'PSRAM=1'\n"},True)
 def test_large_blob(self):self.check({'large.bin':bytes(50*1024*1024)},False)
 def test_lfs_pointer(self):self.check({'large.bin':b'version https://git-lfs.github.com/spec/v1\noid sha256:'+b'0'*64+b'\nsize 52428800\n'},True)
 def test_au_archive(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:z.writestr('SuperJ6.component/Contents/Info.plist','fixture')
  self.check({'unrelated-name.zip':b.getvalue()},False)
 def test_missing_blob(self):
  with tempfile.TemporaryDirectory() as d:
   subprocess.run(['git','init','-q',d],check=True)
   subprocess.run(['git','update-index','--add','--cacheinfo','100644,'+'1'*40+',missing.txt'],cwd=d,check=True)
   r=subprocess.run(['python3',str(SOURCE/'scripts/dnbox-hard-limits.py')],cwd=d,capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0);self.assertIn('inspection incomplete',r.stderr)
 def test_au_filename(self):self.check({'SuperJ6-AU-extension.zip':b'fixture not an installer'},False)
if __name__=='__main__':unittest.main()
