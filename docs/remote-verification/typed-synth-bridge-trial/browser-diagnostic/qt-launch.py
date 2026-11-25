import qt,slicer
from __main__ import slicer
w=slicer.qSlicerWebWidget(); w.resize(1280,900); w.url="about:blank"
print("REMOTE-QT-READY", flush=True)
