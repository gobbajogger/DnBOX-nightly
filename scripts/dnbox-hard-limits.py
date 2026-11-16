#!/usr/bin/env python3
"""Bounded tracked-object checks; not a comprehensive secret/content audit."""
import pathlib,re,subprocess,sys,zipfile,io,json
LIMIT=50*1024*1024
SOURCE_EXT={'.c','.h','.cpp','.hpp','.py','.sh','.js','.mjs','.json','.yaml','.yml','.toml','.ini','.cfg','.mk'}
ASSIGN=re.compile(r'''^\s*(?:\#\s*define\s+|(?:(?:export|const|let|var|static|constexpr|volatile|unsigned|signed|bool|int|uint[0-9]+_t)\s+)*)?["']?([A-Za-z_]\w*)["']?\s*(?:[:=]\s*|\s+)\(?\s*["']?(1[uUlL]*|0x0*1[uUlL]*|true|enable|enabled|on|y|yes)["']?\s*\)?(?=\s|[,;}]|$)''',re.I)

def json_activation(value):
 if isinstance(value,dict):
  for key,item in value.items():
   if "psram" in key.lower() and (item is True or type(item) is int and item==1 or isinstance(item,str) and item.lower() in {"true","enable","enabled","on","1","y","yes"}):return True
   if json_activation(item):return True
 elif isinstance(value,list):return any(json_activation(item) for item in value)
 return False
def git(*args,data=None):return subprocess.check_output(['git',*args],input=data,stderr=subprocess.PIPE)
def main():
 entries=[]
 for record in git('ls-files','-s','-z').split(b'\0'):
  if not record:continue
  info,path=record.split(b'\t',1);mode,oid,stage=info.split()
  if stage!=b'0' or mode==b'160000':raise ValueError('unmerged or uninspected gitlink')
  entries.append((oid,path.decode('utf-8','strict')))
 if not entries:raise ValueError('empty tracked inventory')
 metadata=git('cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)',data=b'\n'.join(o for o,p in entries)+b'\n').splitlines()
 if len(metadata)!=len(entries):raise ValueError('incomplete object metadata')
 bad=[]
 for (oid,path),line in zip(entries,metadata):
  parts=line.split()
  if len(parts)!=3 or parts[0]!=oid or parts[1]!=b'blob':raise ValueError('missing or invalid tracked blob')
  size=int(parts[2]);p=pathlib.PurePosixPath(path)
  if size>=LIMIT:bad.append((path,'tracked blob >=50MiB (not an LFS pointer)'));continue
  if path.startswith('.github/workflows/'):bad.append((path,'retained workflow'))
  if re.search(r'superj6.*(?:au|audio.?unit|component).*\.zip$',path,re.I):bad.append((path,'SuperJ6 AU installer name'))
  source=p.suffix.lower() in SOURCE_EXT or p.name in {'Makefile','Dockerfile'}
  if not source and p.suffix.lower()!='.zip':continue
  data=git('cat-file','blob',oid.decode())
  if len(data)!=size:raise ValueError('incomplete tracked blob')
  if source:
   try:text=data.decode('utf-8')
   except UnicodeDecodeError:raise ValueError('non-UTF8 source/config requires explicit inspection')
   if p.suffix.lower()==".json":
    try:
     if json_activation(json.loads(text)):bad.append((path,"JSON PSRAM activation"))
    except json.JSONDecodeError:pass # invalid test fixtures remain subject to line scan
   for line in text.splitlines():
    m=ASSIGN.match(line)
    if m and 'psram' in m[1].lower():bad.append((path,'PSRAM activation'));break
  elif zipfile.is_zipfile(io.BytesIO(data)):
   with zipfile.ZipFile(io.BytesIO(data)) as z:
    names=z.namelist()
    if len(names)>100000:raise ValueError('archive inventory too large to inspect')
    if any(re.search(r'(?:^|/)superj6[^/]*\.component(?:/|$)',n,re.I) for n in names):bad.append((path,'SuperJ6 AU component archive'))
 for path,reason in bad:print(f'FAIL {reason}: {path}')
 print(f'tracked-object audit: {len(entries)} blobs; residual secret and opaque-content review remains required')
 return 1 if bad else 0
if __name__=='__main__':
 try:sys.exit(main())
 except (ValueError,OSError,subprocess.CalledProcessError,zipfile.BadZipFile):
  print('FAIL tracked-object inspection incomplete (no content values emitted)',file=sys.stderr);sys.exit(1)
