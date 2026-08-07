from PIL import Image
import numpy as np, sys
REF = {
 'H':(74,50,40),'S':(232,185,154),'B':(38,122,118),'K':(15,26,31),
 'W':(252,252,252),'R':(232,69,69),'A':(245,137,76),'M':(232,197,71),
 'T':(45,212,191),'X':(123,63,160),'O':(178,58,95),
 '.':(244,237,224),',':(231,224,210),'~':(250,228,208),'=':(243,205,182),
}
def cl(px):
    best,bd='?',1e9
    for k,c in REF.items():
        dd=sum((int(px[i])-c[i])**2 for i in range(3))
        if dd<bd: bd,best=dd,k
    return best if bd<2600 else '?'
im = Image.open(sys.argv[1]).convert("RGB")
sm = im.resize((54, 96), Image.LANCZOS); a=np.array(sm)
print(f"=== {sys.argv[1]} ===   (col=20px, row=20px)")
for y in range(96):
    print(f"{y*20:5d} " + "".join(cl(a[y,x]) for x in range(54)))
