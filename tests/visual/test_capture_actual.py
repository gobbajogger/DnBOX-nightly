"""Exercise actual screenshot comparison without starting a browser."""
import ast, io, os, re, stat, uuid, tempfile, unittest
from pathlib import Path
import numpy as np
from PIL import Image

SOURCE=Path(__file__).with_name('visual_gate.py')

def png(color):
    out=io.BytesIO();Image.new('RGB',(16,16),color).save(out,format='PNG');return out.getvalue()

def load(root, keep=True, update=False):
    nodes=[n for n in ast.parse(SOURCE.read_text()).body if isinstance(n,ast.FunctionDef) and n.name in ('compare','exit_status','validate_capture_output','write_actual_output')]
    ns=dict(os=os,re=re,stat=stat,uuid=uuid,io=io,Path=Path,SNAP=root/'baselines',OUT=root/'out',UPDATE=update,KEEP_ACTUAL=keep,ONLY=None,np=np,Image=Image,MAX_DIFF_RATIO=.001,PIXEL_THRESHOLD=25.5)
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(SOURCE),'exec'),ns)
    return ns

class Capture(unittest.TestCase):
    def test_missing_baseline_keeps_actual_without_creating_reference_directory(self):
        with tempfile.TemporaryDirectory() as d:
            ns=load(Path(d));results=[];data=png('red');ns['compare']('screen',data,results)
            self.assertEqual(results,[('screen','NOBASE',0.0)])
            self.assertEqual((ns['OUT']/'screen-actual.png').read_bytes(),data)
            self.assertFalse(ns['SNAP'].exists())
            self.assertEqual(ns['exit_status'](results,[],[]),0) # preserve current NOBASE policy

    def test_pass_and_failure_keep_exact_actual_and_never_change_reference(self):
        for color,status in [('red','PASS'),('blue','FAIL')]:
            with self.subTest(status=status),tempfile.TemporaryDirectory() as d:
                ns=load(Path(d));ns['SNAP'].mkdir();reference=png('red');(ns['SNAP']/'screen.png').write_bytes(reference)
                actual=png(color);results=[];ns['compare']('screen',actual,results)
                self.assertEqual(results[0][1],status)
                self.assertEqual((ns['OUT']/'screen-actual.png').read_bytes(),actual)
                self.assertEqual((ns['SNAP']/'screen.png').read_bytes(),reference)
                self.assertEqual(ns['exit_status'](results,[],[]),int(status=='FAIL'))

    def test_capture_rejects_baseline_update(self):
        with tempfile.TemporaryDirectory() as d:
            ns=load(Path(d),update=True)
            with self.assertRaises(ValueError):ns['compare']('screen',png('red'),[])
            self.assertFalse(ns['SNAP'].exists())

    def test_capture_rejects_output_inside_baselines(self):
        with tempfile.TemporaryDirectory() as d:
            ns=load(Path(d));ns['OUT']=ns['SNAP']/'captures'
            with self.assertRaises(ValueError):ns['compare']('screen',png('red'),[])
            self.assertFalse(ns['SNAP'].exists())

    def test_normal_pass_cleanup_and_failure_signals_unchanged(self):
        with tempfile.TemporaryDirectory() as d:
            ns=load(Path(d),keep=False);ns['SNAP'].mkdir();data=png('red');(ns['SNAP']/'screen.png').write_bytes(data)
            results=[];ns['compare']('screen',data,results)
            self.assertFalse((ns['OUT']/'screen-actual.png').exists())
            self.assertEqual(ns['exit_status'](results,['overflow'],[]),1)
            self.assertEqual(ns['exit_status'](results,[],['page error']),1)
            ns['ONLY']='screen';self.assertEqual(ns['exit_status'](results,[],[]),1)

    def test_output_links_never_overwrite_baselines(self):
        for suffix,hardlink in [('-actual.png',False),('-diff.png',False),('-actual.png',True)]:
            with self.subTest(suffix=suffix,hardlink=hardlink), tempfile.TemporaryDirectory() as d:
                ns=load(Path(d));ns['SNAP'].mkdir();ns['OUT'].mkdir();reference=png('red');base=ns['SNAP']/'screen.png';base.write_bytes(reference)
                target=ns['OUT']/('screen'+suffix)
                if hardlink: os.link(base,target)
                else: target.symlink_to(base)
                with self.assertRaises(ValueError):ns['compare']('screen',png('blue'),[])
                self.assertEqual(base.read_bytes(),reference)

    def test_capture_name_cannot_escape_output(self):
        for name in ['../screen','nested/screen','/absolute','..']:
            with self.subTest(name=name),tempfile.TemporaryDirectory() as d:
                ns=load(Path(d))
                with self.assertRaises(ValueError):ns['compare'](name,png('red'),[])
                self.assertFalse((Path(d)/'screen-actual.png').exists())

    def test_output_directory_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            ns=load(Path(d));other=Path(d)/'other';other.mkdir();ns['OUT'].symlink_to(other,target_is_directory=True)
            with self.assertRaises(ValueError):ns['compare']('screen',png('red'),[])
            self.assertEqual(list(other.iterdir()),[])

    def test_summary_link_rejected_and_regular_output_can_be_replaced(self):
        with tempfile.TemporaryDirectory() as d:
            ns=load(Path(d));ns['OUT'].mkdir();base=Path(d)/'reference.png';data=png('red');base.write_bytes(data)
            (ns['OUT']/'summary.json').symlink_to(base)
            with self.assertRaises(ValueError):ns['write_actual_output']('summary.json',b'{}')
            self.assertEqual(base.read_bytes(),data)
            ns['write_actual_output']('screen-actual.png',b'first')
            ns['write_actual_output']('screen-actual.png',b'second')
            self.assertEqual((ns['OUT']/'screen-actual.png').read_bytes(),b'second')
            self.assertEqual(list(ns['OUT'].glob('.capture-*')),[])

if __name__=='__main__':unittest.main()
