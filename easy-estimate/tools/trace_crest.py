import numpy as np, subprocess, re, json, math, sys
from PIL import Image
from scipy import ndimage as nd
# 家紋の原本画像から各パーツの輪郭を取り出し crest.json を作る（potrace・numpy・scipy・Pillow が必要）
# 実行: python3 easy-estimate/tools/trace_crest.py [画像]  → crest.json（js/crest.js の D に入れる）
import os
SRC=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(__file__),'..','assets','crest-original.png')
im=np.asarray(Image.open(SRC).convert('L')).astype(float)
im=nd.median_filter(im,5)
b=im<100
lab,n=nd.label(b)
sizes=nd.sum(b,lab,range(1,n+1)); order=list(np.argsort(-sizes)+1)
ring=lab==order[0]
ys,xs=np.nonzero(ring); CX,CY=xs.mean(),ys.mean()
r=np.hypot(xs-CX,ys-CY); R_OUT=np.percentile(r,99.9); R_MED=np.median(r)
K=96.0/R_OUT
def ang(m):
    ys,xs=np.nonzero(m); return math.degrees(math.atan2(xs.mean()-CX, -(ys.mean()-CY)))%360
comps=[lab==o for o in order[1:]]
core=comps[10]
petals=sorted(comps[0:5], key=lambda m: (ang(m)+20)%360)   # top first, clockwise
sepals=sorted(comps[5:10], key=lambda m: (ang(m)+20)%360)
# ray channels: closing fills the narrow cut, keep only near petal axis & away from core
H,W=b.shape; Y,X=np.mgrid[0:H,0:W]
cys,cxs=np.nonzero(core); ccx,ccy=cxs.mean(),cys.mean(); core_r=np.hypot(cxs-ccx,cys-ccy).max()
RR=np.hypot(X-ccx,Y-ccy); AA=(np.degrees(np.arctan2(X-ccx,-(Y-ccy))))%360
disk=lambda rad: (np.hypot(*np.mgrid[-rad:rad+1,-rad:rad+1])<=rad)
rayfill=[]
for p in petals:
    a=ang(p)
    closed=nd.binary_closing(np.pad(p,30),structure=disk(14))[30:-30,30:-30]
    d=np.abs((AA-a+180)%360-180)
    ch=closed & ~p & (RR>core_r+6) & (d<14)
    ch=nd.binary_dilation(ch,iterations=2) & ~p & (RR>core_r+6)   # 輪郭の縁まで少し太らせる
    l2,n2=nd.label(ch)
    if n2>1:
        sz=nd.sum(ch,l2,range(1,n2+1)); ch=l2==(np.argmax(sz)+1)
    rayfill.append(ch)
def potrace(mask):
    img=Image.fromarray(np.where(mask,0,255).astype('uint8')).convert('1')
    img.save('tmp.pbm')
    subprocess.run(['potrace','tmp.pbm','-b','svg','-u','10','-t','15','-a','1.0','-O','0.3','--flat','-o','tmp.svg'],check=True)
    s=open('tmp.svg').read()
    tr=re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)',s)
    tx,ty,sx,sy=map(float,tr.groups())
    ds=re.findall(r'<path d="([^"]+)"',s)
    out=[]
    for d in ds:
        toks=re.findall(r'[MmLlCcZz]|-?\d+(?:\.\d+)?',d)
        res=[];cmd=None;i=0;cur=[0,0];start=[0,0]
        def ab(x,y): # potrace units -> image px -> crest units
            px=tx+sx*x; py=ty+sy*y
            return ((px-CX)*K,(py-CY)*K)
        pts=[]
        while i<len(toks):
            t=toks[i]
            if re.match('[A-Za-z]',t): cmd=t;i+=1
            if cmd in 'Zz': res.append('Z'); cur=start[:]; continue
            n={'M':2,'m':2,'L':2,'l':2,'C':6,'c':6}[cmd]
            v=list(map(float,toks[i:i+n])); i+=n
            if cmd.islower():
                for j in range(0,n,2): v[j]+=cur[0]; v[j+1]+=cur[1]
            cur=[v[-2],v[-1]]
            if cmd in 'Mm': start=cur[:]
            P=[ab(v[j],v[j+1]) for j in range(0,n,2)]
            C={'M':'M','m':'M','L':'L','l':'L','C':'C','c':'C'}[cmd]
            res.append(C+' '.join('%.2f,%.2f'%q for q in P))
            if cmd=='m': cmd='l'
            if cmd=='M': cmd='L'
        out.append(''.join(res))
    return ''.join(out)
data={
 'ring':potrace(ring),'ringR':round(R_MED*K,2),'ringW':round((np.percentile(r,99)-np.percentile(r,1))*K,2),
 'petals':[{'d':potrace(m),'angle':round(ang(m),1)} for m in petals],
 'sepals':[{'d':potrace(m),'angle':round(ang(m),1)} for m in sepals],
 'core':potrace(core),'coreCenter':[round((ccx-CX)*K,2),round((ccy-CY)*K,2)],
 'rayfill':[potrace(m) for m in rayfill],
}
json.dump(data,open('crest.json','w'))
print('center',CX,CY,'K',K,'ringR',data['ringR'],'ringW',data['ringW'],'core',data['coreCenter'])
print([p['angle'] for p in data['petals']],[p['angle'] for p in data['sepals']])
print('rayfill px',[int(m.sum()) for m in rayfill], 'bytes',len(json.dumps(data)))
