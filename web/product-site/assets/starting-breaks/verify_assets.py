#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# IMA tables/step semantics follow firmware ima_adpcm.h:
# Copyright (C) 2026 Leo Kuroshita (@kurogedelic), Hugelton Instruments,
# inherited from Felucca eng_sample.c. Audio is NOT licensed by this source notice.
"""Verify the exact owner-designated five-zone asset set. Standard library only.
No network, device access, installer/package mutation or product writes.
"""
import argparse, hashlib, io, json, pathlib, struct, sys, unittest, wave, zlib

CONTRACT_SHA256 = "df61cfe067e56579ace27fc58341f722f4a7a0d9a476ad7d8e798a38413b504f"
ARCHIVE_SHA256 = "239bd1d1ec5ae79ab634cbefe4817c058f357531a33774f0a5f6ecc80322df9e"
IDS = ("personal-br1-zone1","personal-br1-zone2","personal-br1-zone3","personal-br2-zone1","personal-br2-zone2")
STEP = (7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767)
INDEX = (-1,-1,-1,-1,2,4,6,8)
def digest(b): return hashlib.sha256(b).hexdigest()
def require(ok, message):
    if not ok: raise ValueError(message)
def load_contract(root):
    b=(root/"sample-contract.json").read_bytes()
    require(digest(b)==CONTRACT_SHA256,"contract hash mismatch")
    c=json.loads(b)
    require(tuple(c["default_selected_ids"])==IDS,"default selection/order mismatch")
    require(tuple(a["id"] for a in c["assets"])==IDS,"asset membership/order mismatch")
    require(c["rate"]==22050,"contract rate mismatch")
    return c
def decode(encoded, frames):
    require(len(encoded)==(frames+1)//2,"ADPCM frame/length mismatch")
    pcm=bytearray();pred=0;idx=0
    for n in range(frames):
        code=(encoded[n//2]>>(4*(n&1)))&15
        s=STEP[idx]
        d=(s>>3)+((s>>2) if code&1 else 0)+((s>>1) if code&2 else 0)+(s if code&4 else 0)
        pred=max(-32768,min(32767,pred+(-d if code&8 else d)))
        idx=max(0,min(88,idx+INDEX[code&7]))
        pcm.extend(struct.pack("<h",pred))
    return bytes(pcm)
def make_wav(pcm):
    out=io.BytesIO()
    with wave.open(out,"wb") as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(pcm)
    return out.getvalue()
def verify_encoded(a, b):
    require(len(b)==a["adpcm_bytes"],a["id"]+": encoded length mismatch")
    require(digest(b)==a["adpcm_sha256"],a["id"]+": encoded hash mismatch")
    pcm=decode(b,a["frames"])
    require(digest(pcm)==a["decoded_pcm_sha256"],a["id"]+": decoded PCM hash mismatch")
    return pcm
def verify_preview(a,b):
    require(len(b)==a["preview_bytes"],a["id"]+": preview length mismatch")
    require(digest(b)==a["preview_sha256"],a["id"]+": preview WAV hash mismatch")
    with wave.open(io.BytesIO(b),"rb") as w:
        require((w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes(),w.getcomptype())==(1,2,22050,a["frames"],"NONE"),a["id"]+": WAV format mismatch")
        pcm=w.readframes(a["frames"])
    require(len(pcm)==a["frames"]*2 and digest(pcm)==a["decoded_pcm_sha256"],a["id"]+": preview PCM mismatch")
    return pcm
def source_zones(b):
    require(len(b)==110905 and digest(b)==ARCHIVE_SHA256,"original archive identity mismatch")
    require(b[:8]==b"X0XSLOTS" and struct.unpack_from("<HH",b,8)==(1,0),"archive header mismatch")
    require(zlib.crc32(b[:-4])==struct.unpack_from("<I",b,len(b)-4)[0],"archive CRC mismatch")
    n=struct.unpack_from("<I",b,12)[0];meta=json.loads(b[16:16+n]);data=b[16+n:-4];out=[]
    for s in meta["slots"]:
        if s["empty"]:continue
        image=data[s["offset"]:s["offset"]+s["length"]]
        require(len(image)==s["length"] and zlib.crc32(image)==s["crc32"],"source image CRC mismatch")
        require(zlib.crc32(image[512:])==s["data_crc32"],"source data CRC mismatch")
        for k in range(s["zones"]):
            zone=image[32+28*k:60+28*k]
            off,frames=struct.unpack_from("<II",zone)
            encoded=image[512+off:512+off+(frames+1)//2]
            out.append(("personal-"+s["name"].lower()+"-zone"+str(k+1),encoded,zone))
    require(tuple(x[0]for x in out)==IDS,"source zone membership/order mismatch")
    return out
def verify(root, source_archive=None):
    c=load_contract(root);result=[]
    p=json.loads((root/"provenance.json").read_text())
    require(p["source_archive"]["sha256"]==ARCHIVE_SHA256,"provenance archive mismatch")
    require(p["source_contract"]["sha256"]==CONTRACT_SHA256,"provenance contract mismatch")
    require(tuple(x["id"] for x in p["assets"])==IDS,"provenance asset order mismatch")
    for a in c["assets"]:
        e=(root/(a["id"]+".adpcm")).read_bytes();w=(root/(a["id"]+".wav")).read_bytes()
        pcm=verify_encoded(a,e)
        require(verify_preview(a,w)==pcm,a["id"]+": encoded/preview PCM differs")
        require(make_wav(pcm)==w,a["id"]+": deterministic WAV differs")
        result.append({"id":a["id"],"encoded_bytes":len(e),"preview_bytes":len(w),"pass":True})
    if source_archive:
        for aid,e,z in source_zones(pathlib.Path(source_archive).read_bytes()):
            require(e==(root/(aid+".adpcm")).read_bytes(),aid+": original zone differs")
    return result

def self_tests(root):
    c=load_contract(root)
    class Contracts(unittest.TestCase):
        def test_complete_set(self): self.assertEqual(len(verify(root)),5)
        def test_each_same_length_encoded_mutation_rejected(self):
            for a in c["assets"]:
                b=bytearray((root/(a["id"]+".adpcm")).read_bytes());b[len(b)//2]^=1
                with self.assertRaises(ValueError):verify_encoded(a,bytes(b))
        def test_wrong_zone_same_length_rejected(self):
            a=c["assets"][0];other=(root/(c["assets"][1]["id"]+".adpcm")).read_bytes()
            wrong=(other*((a["adpcm_bytes"]+len(other)-1)//len(other)))[:a["adpcm_bytes"]]
            self.assertEqual(len(wrong),a["adpcm_bytes"])
            with self.assertRaises(ValueError):verify_encoded(a,wrong)
        def test_each_same_length_wav_mutation_rejected(self):
            for a in c["assets"]:
                b=bytearray((root/(a["id"]+".wav")).read_bytes());b[44]^=1
                with self.assertRaises(ValueError):verify_preview(a,bytes(b))
    return unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Contracts)).wasSuccessful()

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument("--root",type=pathlib.Path,default=pathlib.Path(__file__).resolve().parent);ap.add_argument("--source-archive");ap.add_argument("--self-test",action="store_true");ap.add_argument("--wrong-zone-mutant",action="store_true");args=ap.parse_args()
    if args.wrong_zone_mutant:
        c=load_contract(args.root);a=c["assets"][0];b=(args.root/(c["assets"][1]["id"]+".adpcm")).read_bytes()
        verify_encoded(a,(b*((a["adpcm_bytes"]+len(b)-1)//len(b)))[:a["adpcm_bytes"]])
        raise AssertionError("wrong-zone mutant unexpectedly passed")
    rows=verify(args.root,args.source_archive)
    print(json.dumps({"state":"ASSET_BYTES_VERIFIED_NOT_DEPLOYED","assets":rows},indent=2))
    return 0 if not args.self_test or self_tests(args.root) else 1
if __name__=="__main__":
    try:sys.exit(main())
    except (ValueError, OSError, KeyError, wave.Error) as error:
        print("FAIL: "+str(error),file=sys.stderr);sys.exit(1)

