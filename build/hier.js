
/* ---------- hierarquia ---------- */
let NID = 0; const NODES = [];
function mkNode(a, parent, depth){
  const n = {id:NID++, n:a[0], so:a[1], st:a[2], lo:a[3], lt:a[4], src:a[5], dn:a[6], parent, depth, kids:[], norm:norm(a[0])};
  NODES.push(n); n.kids = a[7].map(k => mkNode(k, n, depth+1)); return n;
}
const ROOT = mkNode(H, null, 0);
const ORG_BY_DN = {}; NODES.forEach(n => { if(n.dn) ORG_BY_DN[n.dn] = n; });
const hown = n => st.mode === 's' ? n.so : n.lo;
const htot = n => st.mode === 's' ? n.st : n.lt;
const hscope = () => st.horg && ORG_BY_DN[st.horg] ? ORG_BY_DN[st.horg] : ROOT;
function ensureOpen(){
  const key = st.horg || '';
  if(st.openKey === key) return; st.openKey = key; st.open = new Set();
  const sc = hscope(); st.open.add(sc.id);
  if(sc === ROOT) ROOT.kids.forEach(g => st.open.add(g.id));
}
function hvisible(sc){
  const q = norm(st.hq || ''); const vis = new Set();
  const walk = n => {
    if(st.hide0 && htot(n) === 0) return false;
    let kid = false; n.kids.forEach(k => { if(walk(k)) kid = true; });
    if(!q || n.norm.includes(q) || kid){ vis.add(n.id); return true; }
    return false;
  };
  walk(sc); return vis;
}
function hl(name){
  const q = (st.hq || '').trim(); if(!q) return esc(name);
  const nn = norm(name), qq = norm(q); const i = nn.indexOf(qq);
  if(i < 0 || nn.length !== name.length) return esc(name);
  return esc(name.slice(0,i)) + '<mark>' + esc(name.slice(i, i+q.length)) + '</mark>' + esc(name.slice(i+q.length));
}
function hrow(n, d, sc, baseTot){
  const own = hown(n), tot = htot(n), has = n.kids.length > 0;
  const open = st.hq ? true : st.open.has(n.id);
  const lvl = Math.min(d, 6);
  const num = v => v ? fmt(v) : '—';
  const isG = n.src === 'g' || n.src === 'r', isO = n.src === 'o' || n.src === 'n';
  const tags = (n.src==='n' ? '<span class="tag nd">sem dados na planilha</span>' : '') + (n.src==='l' ? '<span class="tag">lotação</span>' : '') + (n.src==='x' ? '<span class="tag">fora do organograma do decreto</span>' : '') + (n.src==='p' ? '<span class="tag">departamento da folha</span>' : '');
  const iso = isO && sc === ROOT && n.dn ? `<button class="iso" data-hiso="${encodeURIComponent(n.dn)}">abrir só este órgão</button>` : '';
  const exp = isO ? `<button class="iso" data-hexp="${n.id}">exportar HTML</button>` : '';
  const ownCell = (isG || isO) ? '' : num(own);
  const subCell = (has || isG) ? num(tot) : '';
  return `<div class="hr t${lvl}${isG?' g0':''}"><div class="hl" style="padding-left:${d*22}px">${has?`<button class="tg" data-t="${n.id}" aria-expanded="${open}" aria-label="${open?'Recolher':'Expandir'} ${esc(n.n)}">${open?'−':'+'}</button>`:'<span class="tg sp"></span>'}<span class="hn t${lvl}">${hl(n.n)}</span>${tags}${iso}${exp}</div>
    <div class="hb"><i style="width:${baseTot?Math.max(tot?1:0,tot/baseTot*100):0}%"></i></div>
    <div class="hc own${own?'':' z'}">${ownCell}</div>
    <div class="hc sub${tot?'':' z'}">${subCell}</div></div>`;
}
function hrows(n, d, sc, vis, baseTot, out){
  if(!vis.has(n.id)) return;
  out.push(hrow(n, d, sc, baseTot));
  if(!(st.hq ? true : st.open.has(n.id))) return;
  let kids = n.kids;
  if(st.hsort === 'n') kids = [...kids].sort((a,b) => htot(b)-htot(a) || a.id-b.id);
  kids.forEach(k => hrows(k, d+1, sc, vis, baseTot, out));
}
function htree(){
  const sc = hscope(); ensureOpen();
  const vis = hvisible(sc); const out = [];
  hrows(sc, 0, sc, vis, htot(sc), out);
  if(!out.length) return '<div class="empty">Nenhuma unidade encontrada com esse nome.</div>';
  return `<div class="hhead"><span>Unidade</span><span>Participação no total</span><span>Na unidade</span><span>Com subordinadas</span></div><div class="tree">${out.join('')}</div>`;
}
function hcsv(){
  const sc = hscope(); const rows = [['Nível','Caminho','Unidade','Na unidade','Com subordinadas']];
  const walk = (n, path) => { const p = [...path, n.n]; rows.push([p.length-1, p.join(' > '), n.n, hown(n), htot(n)]); n.kids.forEach(k => walk(k, p)); };
  walk(sc, []);
  const csv = '﻿' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  a.download = 'servidores_hierarquia_' + (st.horg ? norm(st.horg).replace(/\s+/g,'_').slice(0,40) : 'estado') + '.csv'; a.click(); URL.revokeObjectURL(a.href);
}

function hexport(n){
  const f = v => v ? fmt(v) : '—';
  const li = (k, d) => {
    const sub = k.kids.length, lv = Math.min(d, 6);
    const nums = `<span class="nm"><span class="s"><b>${f(k.so)}</b>${sub?` <small>(${f(k.st)} com subordinadas)</small>`:''}</span><span class="l"><b>${f(k.lo)}</b>${sub?` <small>(${f(k.lt)} com subordinadas)</small>`:''}</span></span>`;
    const head = `<span class="t t${lv}">${esc(k.n)}</span>${nums}`;
    return sub ? `<li><details open><summary>${head}</summary><ul>${k.kids.map(c => li(c, d+1)).join('')}</ul></details></li>` : `<li><div class="leaf">${head}</div></li>`;
  };
  const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(n.n)} - servidores por unidade</title><style>
:root{--ink:#14282a;--paper:#f8f5ec;--soft:#4b5450;--line:#c9c2ae;--acc:#2f6b63;--gold:#b3862f}
body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,'Segoe UI',sans-serif;line-height:1.35}
main{max-width:1000px;margin:0 auto;padding:24px 16px 56px}
h1{font:700 28px Georgia,serif;margin:0 0 6px}p.sub{color:var(--soft);font-size:14px;margin:0 0 16px}
.bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.bar button{font:inherit;font-size:13px;padding:7px 14px;border:1px solid var(--ink);background:none;color:var(--ink);cursor:pointer;border-radius:2px}
.bar button.on{background:var(--ink);color:var(--paper)}
ul{list-style:none;margin:0;padding-left:22px;border-left:2px solid var(--line)}main>ul{padding-left:0;border:0}
summary,.leaf{display:flex;justify-content:space-between;gap:16px;padding:5px 0;cursor:pointer}.leaf{cursor:default}
summary{list-style:none}summary::-webkit-details-marker{display:none}
summary::before{content:"+";flex:none;width:18px;color:var(--soft);font-weight:700}details[open]>summary::before{content:"−"}
.leaf::before{content:"";flex:none;width:18px}
.t{flex:1;font-weight:700;min-width:0;overflow-wrap:anywhere}
.t0{font-size:24px;font-family:Georgia,serif}.t1{font-size:20px;font-family:Georgia,serif}.t2{font-size:17.5px}.t3{font-size:16px}.t4{font-size:15px}.t5{font-size:14px}.t6{font-size:13.5px}
.nm{white-space:nowrap;text-align:right;color:var(--acc);font-variant-numeric:tabular-nums}small{font-weight:400;color:var(--soft)}
body.p .l{display:none}body.v .s{display:none}
@media(max-width:560px){summary,.leaf{flex-direction:column;gap:0}.nm{text-align:left;white-space:normal}ul{padding-left:12px}}
@media print{.bar{display:none}}
</style></head><body class="p"><main><h1>${esc(n.n)}</h1><p class="sub">Servidores por unidade, na hierarquia do Decreto 10.218 (Anexo I). Folha de setembro de 2026. Total: <b class="s">${fmt(n.st)} pessoas</b><b class="l">${fmt(n.lt)} vínculos</b>. O número à direita de cada unidade é o de lotados nela; entre parênteses, a soma com as unidades subordinadas.</p>
<div class="bar"><button id="bp" class="on">Pessoas</button><button id="bv">Vínculos</button><button id="be">Expandir tudo</button><button id="bc">Recolher tudo</button></div>
<ul>${li(n, 0)}</ul></main><script>
const b=document.body,P=document.getElementById('bp'),V=document.getElementById('bv');
P.onclick=()=>{b.className='p';P.className='on';V.className=''};V.onclick=()=>{b.className='v';V.className='on';P.className=''};
document.getElementById('be').onclick=()=>document.querySelectorAll('details').forEach(d=>d.open=true);
document.getElementById('bc').onclick=()=>document.querySelectorAll('details').forEach((d,i)=>d.open=i==0);
<\/script></body></html>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([doc], {type:'text/html;charset=utf-8'}));
  a.download = 'servidores_' + norm(n.dn || n.n).replace(/\s+/g,'_').slice(0,50) + '.html'; a.click(); URL.revokeObjectURL(a.href);
}
function hier(){
  const sc = hscope(); ensureOpen();
  const orgs = NODES.filter(n => n.src==='o' || n.src==='n'), withData = orgs.filter(n => n.src==='o');
  let units = 0, withP = 0, x = 0; const walk = n => { if(n.src==='d'){ units++; if(hown(n)>0) withP++; } if(n.src==='x') x += htot(n); n.kids.forEach(walk); };
  walk(sc);
  const lab = st.mode==='s' ? 'Servidores (pessoas)' : 'Vínculos';
  const kp = sc === ROOT
    ? [['Órgãos e entidades', fmt(orgs.length), fmt(withData.length) + ' com servidores na planilha'], [lab, fmt(htot(sc)), 'Soma de todo o estado'], ['Unidades do decreto', fmt(units), fmt(withP) + ' com servidores lotados'], ['Fora do organograma', fmt(x), pct(x, htot(sc)) + ' lotados em unidades que o decreto não detalha']]
    : [[lab + ' no órgão', fmt(htot(sc)), 'Soma de toda a hierarquia'], ['Unidades do decreto', fmt(units), fmt(withP) + ' com servidores lotados'], ['Fora do organograma', fmt(x), pct(x, htot(sc)) + ' lotados em unidades que o decreto não detalha']];
  return `<div><p class="kicker">Hierarquia</p><h1 class="h1">${sc===ROOT ? 'Servidores por unidade, órgão por órgão' : esc(sc.n)}</h1>
  <p class="lead">Cada unidade aparece dentro da unidade a que está subordinada no Decreto 10.218, Anexo I. O número da direita soma a unidade com tudo o que está abaixo dela.${sc!==ROOT ? ' <button class="link" data-hall0="1">Ver todo o estado</button> · <button class="link" data-lista="' + encodeURIComponent(st.horg) + '">Ver como lista plana</button>' : ''}</p></div>
  ${kpis(kp)}
  <section class="panel">
    <div class="hbar">
      <input type="search" id="hq" placeholder="Buscar unidade na hierarquia" value="${esc(st.hq)}" aria-label="Buscar unidade na hierarquia">
      <button class="clr2" data-hall="1">Expandir tudo</button><button class="clr2" data-hnone="1">Recolher tudo</button>
      <div class="seg" role="group" aria-label="Ordem"><button data-hsort="d" aria-pressed="${st.hsort==='d'}">Ordem do decreto</button><button data-hsort="n" aria-pressed="${st.hsort==='n'}">Maior primeiro</button></div>
      <label class="tog" style="padding-top:0"><input type="checkbox" id="hhide" ${st.hide0?'checked':''}> Ocultar sem servidores</label>
      <button class="clr2" id="hcsv">Baixar CSV</button><button class="clr2" id="hhtml">Exportar HTML</button>
    </div>
    <div id="htree">${htree()}</div>
  </section>`;
}
function hrefresh(){ const t = $('htree'); if(t) t.innerHTML = htree(); }
