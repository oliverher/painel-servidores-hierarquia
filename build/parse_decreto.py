import pymupdf,re,json
d=pymupdf.open('C:/Users/carlos.holiveira/Downloads/Decreto Numerado 10.218.pdf')
HDR=re.compile(r'^([a-z]{1,2}(?:\.\d+)*)\.?\)\s*(.*)$')
NUM=re.compile(r'^(\d+(?:\.\d+)*)\.?\s+(.*)$')
SEC=re.compile(r'^(I|II|III|IV|V) – (.*)$')
lines=[]
for i in range(22,173):
    ls=[]
    for b in d[i].get_text('dict')['blocks']:
        for l in b.get('lines',[]):
            x0,y0=l['bbox'][:2]
            if x0>=222 or y0<62 or i==22 and y0<540: continue
            t=''.join(s['text'] for s in l['spans']).strip()
            if not t or t.startswith(('ÓRGÃO','ESTRUTURA','CARGOS','DENOMINA')):continue
            col=l['spans'][0]['color']
            ls.append((y0,x0,t,col==0xff0000))
    ls.sort(key=lambda a:a[0])
    lines+= [(i,)+a for a in ls]
ents=[];cur=None;innote=False
for pg,y,x,t,red in lines:
    m=SEC.match(t);h=HDR.match(t);n=NUM.match(t)
    if m and x<90 and not red and len(t)<120:
        cur={'k':'sec','id':m.group(1),'name':m.group(2),'red':False,'page':pg};ents.append(cur);innote=False;continue
    if h and not n:
        cur={'k':'org','id':h.group(1),'name':h.group(2),'red':red,'page':pg};ents.append(cur);innote=False;continue
    if n and '.' in t[:12] or (n and re.match(r'^\d+\.\s',t)):
        cur={'k':'u','id':n.group(1),'name':n.group(2),'red':red,'page':pg};ents.append(cur);innote=False;continue
    if cur is None: continue
    if t.startswith('-') :
        innote=True;continue
    if innote or t.startswith(('Decreto','Lei')): continue
    cur['name']+=' '+t
for e in ents:e['name']=re.sub(r'\s+',' ',e['name']).strip()
json.dump(ents,open('decreto_raw.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
print(len(ents),sum(e['red'] for e in ents))
for e in ents:
    if e['k']!='u':print(e['page'],e['k'],e['id'],'RED' if e['red'] else '',e['name'][:100])
