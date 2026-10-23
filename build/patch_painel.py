import json,re
src=open('C:/Users/carlos.holiveira/Downloads/Painel_Servidores_por_Unidade (1).html',encoding='utf-8').read()
H=open('H.json',encoding='utf-8').read()
def rep(old,new,count=1):
    global src
    assert src.count(old)>=1,old[:60]
    src=src.replace(old,new,count)

CSS=open('hier.css',encoding='utf-8').read()
JS=open('hier.js',encoding='utf-8').read()
rep('</style>',CSS+'</style>')
rep('const $ = id =>','const H = '+H+';\nconst $ = id =>')

rep("const st = {view:'geral',","const st = {view:'hier', horg:null, hq:'', open:new Set(), openKey:null, hsort:'d', hide0:false, ")
rep("const snap = () => ({view:st.view,","const snap = () => ({view:st.view, horg:st.horg,")
rep("['geral','Visão geral',''],['orgao'","['geral','Visão geral',''],['hier','Hierarquia',''],['orgao'")
rep("data-o=\"${encodeURIComponent(o.o)}\" ${st.view==='orgao'&&st.org===o.o?'aria-current=\"true\"':''}","data-o=\"${encodeURIComponent(o.o)}\" ${(st.view==='orgao'&&st.org===o.o)||(st.view==='hier'&&st.horg===o.o)?'aria-current=\"true\"':''}")
rep("const t = {geral:'<b>Visão geral</b>',","const t = {geral:'<b>Visão geral</b>', hier:'Hierarquia › <b>' + (st.horg ? esc(st.horg) : 'Todo o estado') + '</b>',")
rep('<p class="kicker">Órgão</p><h1 class="h1">${esc(st.org)}</h1>`;','<p class="kicker">Órgão</p><h1 class="h1">${esc(st.org)}</h1><p style="margin-top:10px"><button class="link" data-o="${encodeURIComponent(st.org)}">Ver na hierarquia</button></p>`;')
rep("function sobre(){",JS+"\nfunction sobre(){")
rep("$('view').innerHTML = st.view==='geral' ? geral() : st.view==='sobre' ? sobre() : listView(st.view==='todas');",
    "$('view').innerHTML = st.view==='geral' ? geral() : st.view==='hier' ? hier() : st.view==='sobre' ? sobre() : listView(st.view==='todas');")
rep("function go(v, o){ if(v !== st.view || (o && o !== st.org) || st.q) hist.push(snap()); st.view = v; st.band = -1; st.minp = 0; if(o) st.org = o;",
    "function go(v, o){ if(v !== st.view || (o && o !== st.org) || st.q || v==='hier') hist.push(snap()); st.view = v; st.band = -1; st.minp = 0; if(v==='hier'){ st.horg = o || null; st.hq = ''; } else if(o) st.org = o;")
rep("const o = e.target.closest('[data-o]'); if(o){ go('orgao', decodeURIComponent(o.dataset.o)); return; }",
    open('clicks.js',encoding='utf-8').read())
rep("if(e.target.id === 'grp'){","if(e.target.id === 'hhide'){ st.hide0 = e.target.checked; hrefresh(); return; }\nif(e.target.id === 'grp'){")
rep("if(e.target.id === 'min'){ const o = e.target.parentNode","if(e.target.id === 'hq'){ st.hq = e.target.value.trim(); hrefresh(); return; }\n  if(e.target.id === 'min'){ const o = e.target.parentNode")
rep('<p><b>Privacidade:</b>',open('sobre.html',encoding='utf-8').read()+'\n    <p><b>Privacidade:</b>')
rep("<title>Servidores por Unidade</title>","<title>Servidores por Unidade e Hierarquia</title>")
open('painel_servidores_hierarquia.html','w',encoding='utf-8').write(src)
print(len(src))
