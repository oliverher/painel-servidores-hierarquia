import json,re,pandas as pd
from collections import defaultdict
from common import norm
E=json.load(open('decreto_raw.json',encoding='utf-8'))
# ---- orgs do decreto
orgs=[];cur=None;sec='I'
for e in E:
    if e['k']=='sec':sec=e['id'];continue
    if e['k']=='org':
        cur={'sec':sec,'id':e['id'],'name':e['name'],'units':[]};orgs.append(cur);continue
    if cur and e['k']=='u' and not e['red']:cur['units'].append(e)
def short(n):  # tira sigla e "(Regulamento)" do nome do órgão
    n=re.sub(r'\(.*?\)','',n).strip()
    n=re.sub(r'\s+',' ',n)
    return n
for o in orgs:
    o['full']=short(o['name'])
    m=re.match(r'^(.*?)\s*[–-]\s*([A-ZÁÂÃÉÊÍÓÔÕÚÇ ]{2,}[A-Z]|[A-Z ]+)\s*$',o['full'])
    o['label']=o['full']
# acrescenta Conselho de Governo e Governadoria
# ---- constrói árvore por órgão (pai = prefixo do id; sobe até achar ancestral vivo)
def build(o):
    nodes=[];byid={}
    for u in o['units']:
        nd={'id':u['id'],'name':u['name'].strip(),'kids':[],'own':set(),'ownr':0,'src':'decreto'}
        parent=None;pid=u['id']
        while '.' in pid:
            pid=pid.rsplit('.',1)[0]
            if pid in byid:parent=byid[pid];break
        byid[u['id']]=nd
        (parent['kids'] if parent else nodes).append(nd)
    return nodes
for o in orgs:o['tree']=build(o)

def promover(o):
    """No decreto tudo vem numerado dentro do Gabinete; no organograma subsecretarias, superintendências e diretorias ficam ao lado dele."""
    if o['sec']=='I' and o['id'] in ('q.1','q.2','q.3','q.4','q.5','aa') or o['sec']=='II': amplo=True
    else: amplo=False
    amplo = o['sec']=='II' or o['id'].startswith('q.')
    def eh(n):
        nm=norm(n['name'])
        if nm.startswith(('SUBSECRETARIA','SUPERINTENDENCIA','DIRETORIA EXECUTIVA','VICE PRESIDENTE','SECRETARIA EXECUTIVA')): return True
        if amplo and nm.startswith('DIRETORIA'): return True
        if o['id']=='j' and o['sec']=='I' and nm.startswith(('PROCURADORIA ESPECIALIZADA','PROCURADORIA NA CAPITAL')): return True
        return False
    novo=[]
    if o['sec']=='I' and o['id']=='o': amplo=True
    for n in o['tree']:
        novo.append(n)
        if n['name'].lower().startswith('gabinete'):
            for g in [n]+[k for k in n['kids'] if k['name'].lower().startswith('gabinete')]:
                subir=[k for k in g['kids'] if eh(k)]
                g['kids']=[k for k in g['kids'] if k not in subir]
                novo+=subir
    o['tree']=novo
for o in orgs:promover(o)

STOP={'DE','DA','DO','DOS','DAS','E','EM','A','O'}
def key2(x):return ' '.join(t for t in norm(x).split() if t not in STOP)
MAP={'AGENCIA BRASIL CENTRAL':('II','a'),'AGENCIA GOIANA DE ASSISTENCIA TECNICA EXTENSAO RURAL E PESQUISA AGROPECUARIA':('II','c'),
'AGENCIA GOIANA DE DEFESA AGROPECUARIA':('II','d'),'AGENCIA GOIANA DE INFRAESTRUTURA E TRANSPORTES':('II','e'),
'AGENCIA GOIANA DE REGULACAO CONTROLE E FISCALIZACAO DE SERVICOS PUBLICOS':('II','f'),'DEPARTAMENTO ESTADUAL DE TRANSITO':('II','g'),
'GOIAS PREVIDENCIA GOIASPREV':('II','h'),'JUNTA COMERCIAL DO ESTADO DE GOIAS JUCEG':('II','j'),'FUNDACAO DE AMPARO A PESQUISA DO ESTADO DE GOIAS':('II','l'),
'GOIAS TURISMO AGENCIA ESTADUAL DE TURISMO':('II','b'),'SECRETARIA DE ESTADO DA CASA CIVIL':('I','f'),'SECRETARIA DE ESTADO DA CASA MILITAR':('I','h'),
'PROCURADORIA GERAL DO ESTADO':('I','j'),'CONTROLADORIA GERAL DO ESTADO':('I','k'),'SECRETARIA DE ESTADO DA ADMINISTRACAO':('I','l'),
'SECRETARIA DE ESTADO DA CULTURA':('I','m'),'SECRETARIA DE ESTADO DA ECONOMIA':('I','n'),'SECRETARIA DE ESTADO DA EDUCACAO':('I','o'),
'POLICIA MILITAR':('I','q.2'),'DELEGACIA GERAL DA POLICIA CIVIL':('I','q.1'),'CORPO DE BOMBEIROS MILITAR':('I','q.3'),
'DIRETORIA GERAL DE POLICIA PENAL':('I','q.4'),'DIRETORIA DA POLICIA CIENTIFICA':('I','q.5')}
df=pd.read_pickle('data.pkl');df=df[df['Órgão'].notna()&df['CPF'].notna()].copy()
df['pid']=df['CPF'].astype(str)+'|'+df['Nome do Servidor'].astype(str)
byk={(o['sec'],o['id']):o for o in orgs}
def mk(name,src,fid=None):return {'id':fid,'name':name,'kids':[],'own':set(),'ownr':0,'src':src}
def walk(nodes,anc=()):
    for n in nodes:
        yield n,anc
        yield from walk(n['kids'],anc+(n,))
extra=[];stats=defaultdict(lambda:[0,0,0,0]) # decreto, depto, sem corresp, ambíguo
UNK={'UNIDADE NAO INFORMADA'}
for oname,g in df.groupby('Órgão'):
    k=MAP.get(norm(oname))
    if k is None:
        o={'sec':'X','id':norm(oname),'name':oname,'full':oname,'tree':[],'units':[]};extra.append(o)
    else:o=byk[k]
    o['has_data']=True;o['dn']=oname
    idx={};idx2={}
    for n,anc in walk(o['tree']):
        idx.setdefault(norm(n['name']),[]).append((n,anc));idx2.setdefault(key2(n['name']),[]).append((n,anc))
    def find(name,dept=None):
        c=idx.get(norm(name)) or idx2.get(key2(name))
        if not c:return None,False
        if len(c)==1:return c[0][0],False
        dk=norm(dept) if dept is not None else None
        for n,anc in c:
            if dk and any(norm(a['name'])==dk for a in anc):return n,False
        return c[0][0],True
    synth={};grp=None
    for (un,dp),gg in g.groupby(['Unidade','Departamento'],dropna=False):
        un=str(un);dp=str(dp);ids=set(gg['pid'])
        special=norm(un).startswith('INATIVA') or norm(un) in UNK
        n,amb=(None,False) if special else find(un,dp)
        if n is not None:
            n['own']|=ids;n['ownr']+=len(gg);stats[oname][0]+=len(ids);stats[oname][3]+=amb;continue
        d=None if special else find(dp)[0]
        if d is not None:
            key=(id(d),norm(un))
            if key not in synth:
                synth[key]=mk(un,'lotacao');d['kids'].append(synth[key])
            synth[key]['own']|=ids;synth[key]['ownr']+=len(gg);stats[oname][1]+=len(ids);continue
        if grp is None:
            grp=mk('Lotações sem correspondência no organograma do decreto','semcorresp');o['tree'].append(grp);grp_d={}
        if special or norm(dp)==norm(un) or dp=='nan':
            key=norm(un);parent=grp
        else:
            key='D'+norm(dp)
            if key not in grp_d:
                grp_d[key]=mk(dp,'dept');grp['kids'].append(grp_d[key])
            parent=grp_d[key]
        kk=(id(parent),norm(un))
        if kk not in synth:synth[kk]=mk(un,'lotacao');parent['kids'].append(synth[kk])
        synth[kk]['own']|=ids;synth[kk]['ownr']+=len(gg);stats[oname][2]+=len(ids)

def total(n):
    s=set(n['own']);r=n['ownr']
    for k in n['kids']:
        a,b=total(k);s|=a;r+=b
    n['all']=s;n['allr']=r;return s,r
def ser(n):
    kids=n['kids']
    dec=[k for k in kids if k['src']=='decreto'];oth=sorted([k for k in kids if k['src']!='decreto'],key=lambda k:-len(k['all']))
    return [n['name'],len(n['own']),len(n['all']),n['ownr'],n['allr'],{'decreto':'d','lotacao':'l','dept':'p','semcorresp':'x','org':'o','nodata':'n','group':'g','root':'r'}[n['src']],n.get('dn',''),[ser(k) for k in dec+oth]]
def orgnode(o,label=None):
    kids=list(o['tree'])
    node={'name':label or o['full'],'dn':o.get('dn',''),'kids':kids,'own':set(),'ownr':0,'src':'org' if o.get('has_data') else 'nodata'}
    return node
byk={(o['sec'],o['id']):o for o in orgs}
ssp=byk[('I','q')]
sub=[byk[('I',x)] for x in ('q.1','q.2','q.3','q.4','q.5')]
direct=[o for o in orgs if o['sec']=='I' and not o['id'].startswith('q.')]
nodes_direct=[]
for o in direct:
    nd=orgnode(o)
    if o['id']=='q':
        nd['kids']=list(o['tree'])+[orgnode(x) for x in sub]
    nodes_direct.append(nd)
nodes_ind=[orgnode(o) for o in orgs if o['sec']=='II']
nodes_out=[orgnode(o) for o in extra]
groups=[('Administração direta',nodes_direct),('Administração autárquica e fundacional',nodes_ind),('Entidades com servidores na folha, fora do Anexo I do decreto',nodes_out)]
root={'name':'Governo de Goiás','kids':[],'own':set(),'ownr':0,'src':'root'}
for gname,ns in groups:
    root['kids'].append({'name':gname,'kids':ns,'own':set(),'ownr':0,'src':'group'})
total(root)
H=ser(root)
json.dump(H,open('H.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(len(json.dumps(H)),root['all'].__len__(),root['allr'])
