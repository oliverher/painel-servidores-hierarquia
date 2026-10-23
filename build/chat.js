
/* ---------- chat: perguntas em linguagem natural sobre a hierarquia ---------- */
st.chat = [];
const CH_STOP = new Set('a o as os um uma uns umas de da do das dos em na no nas nos e ou para por com que qual quais quanto quantos quantas quantidade numero tem ha ter existem existe sao ser esta estao fica ficam servidores servidor pessoas pessoa vinculos vinculo lotados lotado me mostre mostrar liste listar lista diga fale sobre unidade unidades subordinada subordinadas abaixo total ao aos pela pelo pelas pelos eu quero saber ver onde estado goias governo estrutura organograma compoe composicao maiores maior menores menor top ranking compare comparar'.split(' '));
const CH_TYPES = [['subsecretaria','subsecretarias'],['superintendencia','superintendencias'],['gerencia','gerencias'],['coordenacao','coordenacoes'],['diretoria','diretorias'],['assessoria','assessorias'],['procuradoria','procuradorias'],['gabinete','gabinetes'],['supervisao','supervisoes']];
const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const ctok = s => tokens(s).filter(t => !CH_STOP.has(t));
const chMode = m => m || st.mode;
const cOwn = (n, m) => chMode(m) === 's' ? n.so : n.lo;
const cTot = (n, m) => chMode(m) === 's' ? n.st : n.lt;
function orgOf(n){ while(n && n.src !== 'o' && n.src !== 'n') n = n.parent; return n; }
function acronym(o){
  const nm = o.n.replace(/\([^)]*\)/g,'').trim(); const m = nm.match(/[–-]\s*([A-ZÁÂÃÉÊÍÓÔÕÚÇ]{2,}(?:\s[A-ZÁÂÃÉÊÍÓÔÕÚÇ]{2,})?)\s*$/);
  return m ? m[1] : '';
}
const orgShort = o => o ? (acronym(o) || o.n) : '';
function pathOf(n){ const p = []; for(let x = n; x && x !== ROOT; x = x.parent) if(x.src !== 'g') p.unshift(x.n); return p; }
// aliases das organizações (sigla e nome sem "Secretaria de Estado de/da/do")
const ORGS = NODES.filter(n => n.src === 'o' || n.src === 'n');
ORGS.forEach(o => {
  o.alias = [];
  const a = acronym(o); if(a) o.alias.push(tokens(a));
  const base = o.n.replace(/\([^)]*\)/g,'').replace(/\s*[–-]\s*[A-ZÁÂÃÉÊÍÓÔÕÚÇ ]{2,}\s*$/,'').trim();
  o.alias.push(tokens(base));
  const st2 = base.replace(/^secretaria de estado d[aeo]s? /i,'').replace(/^(agência goiana d[aeo]s? |agência estadual d[aeo]s? |departamento estadual d[aeo]s? )/i,'');
  if(st2 !== base && tokens(st2).length) o.alias.push(tokens(st2).filter(t => !['de','da','do'].includes(t)));
  o.alias = o.alias.filter(a => a.length);
});
function findSeq(qt, seq){
  const s = seq.filter(t => !CH_STOP.has(t) || seq.length === 1); if(!s.length) return -1;
  outer: for(let i = 0; i + s.length <= qt.length; i++){ for(let j = 0; j < s.length; j++) if(qt[i+j] !== s[j]) continue outer; return i; }
  return -1;
}
function detectOrg(qt){
  let best = null;
  ORGS.forEach(o => o.alias.forEach(a => {
    const s = a.filter(t => !CH_STOP.has(t) || a.length === 1);
    if(findSeq(qt, a) >= 0){ const sc = s.length * 10 + (a === o.alias[0] ? 5 : 0); if(!best || sc > best.sc) best = {o, seq:s, sc}; }
  }));
  return best;
}
function subtree(n, out = []){ out.push(n); n.kids.forEach(k => subtree(k, out)); return out; }
function nodeTokens(n){ return n.tk || (n.tk = tokens(n.n).filter(t => !['de','da','do','das','dos','e','em','a','o'].includes(t))); }
function tokMatch(t, u){ return u === t || (t.length >= 4 && u.length >= 4 && (u.startsWith(t) || t.startsWith(u))); }
function matchNodes(content, scope){
  if(!content.length) return [];
  const pool = subtree(scope).filter(n => n.src !== 'r' && n.src !== 'g');
  let best = -1, res = [];
  pool.forEach(n => {
    const nt = nodeTokens(n);
    if(!content.every(t => nt.some(u => tokMatch(t, u)))) return;
    let sc = 100 - (nt.length - content.length) * 3 - n.depth * .1;
    if(norm(n.n).replace(/[^a-z0-9 ]/g,' ').split(' ').filter(t => t && !CH_STOP.has(t)).join(' ') === content.join(' ')) sc += 50;
    if(sc > best){ best = sc; res = [n]; } else if(sc === best) res.push(n);
  });
  return res;
}
const nl = n => `<button class="link" data-gonode="${n.id}">${esc(n.n)}</button>`;
const isOrgN = n => n.src === 'o' || n.src === 'n' || n.src === 'g' || n.src === 'r';
const val = (n, m) => isOrgN(n) ? `<b>${fmt(cTot(n, m))}</b> ${wordOf(m)}` : (cTot(n, m) === cOwn(n, m) || !n.kids.length ? `<b>${fmt(cOwn(n, m))}</b> ${wordOf(m)}` : `<b>${fmt(cOwn(n, m))}</b> ${wordOf(m)} lotados na unidade e <b>${fmt(cTot(n, m))}</b> com subordinadas`);
const wordOf = m => chMode(m) === 's' ? 'servidores' : 'vínculos';
function table(rows, m){
  return `<div class="ctab">${rows.map(n => { const o = orgOf(n); return `<div class="crow"><span>${nl(n)}${o && o !== n ? ` <small>${esc(orgShort(o))}</small>` : ''}</span><span class="cn">${isOrgN(n) ? fmt(cTot(n, m)) : fmt(cOwn(n, m)) + (n.kids.length ? ` <small>(${fmt(cTot(n, m))})</small>` : '')}</span></div>`; }).join('')}</div>`;
}
function resolve(text, scope0){
  const qt = tokens(text); const org = detectOrg(qt);
  let content = ctok(text);
  if(org) { const rm = new Set(org.seq); content = content.filter(t => !rm.has(t)); }
  const typeWords = new Set(CH_TYPES.flat());
  let nodes = [];
  const scope = org ? org.o : scope0;
  if(content.length){
    nodes = matchNodes(content, scope);
    if(!nodes.length && scope !== ROOT) nodes = matchNodes(content, ROOT);
    if(!nodes.length && org){ nodes = matchNodes(ctok(text), ROOT); }
  } else if(org) nodes = [org.o];
  return {org: org && org.o, content, nodes, scope};
}
function answer(q){
  const nq = norm(q).replace(/[?!.]/g,' '); const qt = tokens(q);
  const m = /vinculo/.test(nq) ? 'l' : st.mode;
  const scope0 = st.horg && ORG_BY_DN[st.horg] ? ORG_BY_DN[st.horg] : ROOT;
  const nMatch = nq.match(/\b(\d{1,2})\b/); const N = nMatch ? Math.min(20, +nMatch[1]) : 5;
  const w = wordOf(m);
  // comparar
  if(/\b(compar\w*|versus|vs|diferenca)\b/.test(nq)){
    const body = nq.replace(/\b(compar\w*|a diferenca entre|diferenca entre|diferenca)\b/g,' ');
    const parts = body.split(/\s(?:e|ou|vs|versus|com|contra)\s/).map(s => s.trim()).filter(Boolean);
    if(parts.length >= 2){
      const items = parts.slice(0, 3).map(p => resolve(p, ROOT)).map(r => r.nodes[0]).filter(Boolean);
      if(items.length >= 2){
        const mx = Math.max(...items.map(n => cTot(n, m)), 1);
        return `Comparando ${w}, somando cada unidade com as subordinadas:` + `<div class="ctab">${items.map(n => `<div class="crow"><span>${nl(n)} <small>${esc(orgShort(orgOf(n)) || '')}</small><div class="hb"><i style="width:${cTot(n, m)/mx*100}%"></i></div></span><span class="cn">${fmt(cTot(n, m))}${isOrgN(n) ? '' : `<small> (${fmt(cOwn(n, m))} na unidade)</small>`}</span></div>`).join('')}</div>`;
      }
    }
  }
  // onde fica / a quem se subordina
  if(/(onde fica|a quem|subordinad[ao] a |pertence|caminho|hierarquia de)/.test(nq)){
    const r = resolve(q.replace(/onde fica|a quem|pertence/gi,' '), scope0);
    if(r.nodes.length){
      return r.nodes.slice(0, 6).map(n => `${nl(n)} fica em: ${pathOf(n).slice(0, -1).map(esc).join(' › ') || 'primeiro nível'}.`).join('<br>') + (r.nodes.length > 6 ? `<br><small>E mais ${r.nodes.length - 6}.</small>` : '');
    }
  }
  const r = resolve(q, scope0);
  // quantas subsecretarias / gerências / unidades ...
  const tc = nq.match(/quant[ao]s?\s+(subsecretarias?|superintendencias?|gerencias?|coordenacoes|coordenacao|diretorias?|assessorias?|procuradorias?|gabinetes?|supervisoes|supervisao|unidades|orgaos|entidades|secretarias)/);
  if(tc){
    const word = tc[1]; const sc = r.org || (r.nodes[0] && r.nodes[0].src !== 'o' ? r.nodes[0] : null) || scope0;
    let list;
    if(/^(orgaos|entidades|secretarias)$/.test(word)) list = ORGS.filter(o => word !== 'secretarias' || /^secretaria/i.test(o.n));
    else if(word === 'unidades') list = subtree(sc).filter(n => n.src === 'd');
    else { const stem = CH_TYPES.find(t => t.includes(word) || word.startsWith(t[0].slice(0, 7)))[0]; list = subtree(sc).filter(n => norm(n.n).startsWith(stem.slice(0, 8))); }
    const wd = word.replace(/^./, c => c.toUpperCase());
    return `${sc === ROOT ? 'No estado' : 'Em ' + nl(sc)} há <b>${fmt(list.length)}</b> ${esc(word)}${list.length ? '.' : '.'}` + (list.length && list.length <= 40 ? table(list.slice(0, 15), m) : '');
  }
  // ranking
  if(/\b(maior|maiores|menor|menores|top|ranking|mais servidores|menos servidores|mais pessoas|menos pessoas)\b/.test(nq)){
    const asc = /\b(menor|menores|menos)\b/.test(nq);
    const sc = r.org || (r.nodes[0] && r.nodes[0].kids.length ? r.nodes[0] : null) || scope0;
    const typ = CH_TYPES.find(t => t.some(x => nq.includes(x.slice(0, 8))));
    const orgMode = /\b(orgaos?|secretarias?|entidades?|agencias?)\b/.test(nq) && sc === ROOT;
    let pool = orgMode ? ORGS.filter(o => o.src === 'o') : subtree(sc).filter(n => n !== sc && (n.src === 'd' || n.src === 'l') && (!typ || norm(n.n).startsWith(typ[0].slice(0, 8))));
    const useTot = orgMode || (typ && ['subsecretaria','superintendencia','diretoria'].includes(typ[0]));
    const f = n => useTot ? cTot(n, m) : cOwn(n, m);
    pool = pool.filter(n => f(n) > 0 || asc === false).sort((a, b) => asc ? f(a) - f(b) : f(b) - f(a)).slice(0, N);
    if(!pool.length) return 'Não encontrei unidades com servidores para esse recorte.';
    return `${asc ? 'Menores' : 'Maiores'} ${typ ? typ[1] : orgMode ? 'órgãos' : 'unidades'}${sc === ROOT ? ' do estado' : ' de ' + nl(sc)}, por ${useTot ? 'total com subordinadas' : 'lotados na unidade'} (${w}):` + (useTot ? table(pool, m).replace(/<small>\(\d[\d.]*\)<\/small>/g, '') : table(pool, m));
  }
  // listar / estrutura
  if(/\b(quais|liste|listar|lista|estrutura|organograma|abaixo|subordinad\w*|compoe|composicao|tem dentro)\b/.test(nq) && r.nodes.length){
    const n = r.nodes[0];
    if(n.kids.length){
      const ks = n.kids.filter(k => k.src !== 'g');
      return `${nl(n)} tem <b>${fmt(ks.length)}</b> unidades no nível imediato, com ${val(n, m)}:` + table(ks.slice(0, 25), m) + (ks.length > 25 ? `<small>E mais ${ks.length - 25}. Use o botão para abrir a hierarquia completa.</small>` : '');
    }
    return `${nl(n)} não tem unidades subordinadas. Lotados nela: ${val(n, m)}.`;
  }
  // total do estado ou do escopo
  if(!r.content.length && !r.org){
    if(/(estado|goias|governo|todos|total|ao todo)/.test(nq) || !r.nodes.length){
      const sc = scope0; return `${sc === ROOT ? 'No estado' : 'Em ' + nl(sc)}, a hierarquia soma <b>${fmt(cTot(sc, m))}</b> ${w}${sc === ROOT ? ` em ${fmt(ORGS.filter(o => o.src === 'o').length)} órgãos com folha na planilha` : ''}.`;
    }
  }
  // contagem de uma unidade
  if(r.nodes.length){
    const ns = r.nodes;
    if(ns.length === 1){
      const n = ns[0]; const o = orgOf(n);
      let out = `${nl(n)}${o && o !== n ? ` <small>(${esc(orgShort(o))})</small>` : ''}: ${val(n, m)}.`;
      if(n.kids.length){ const top = [...n.kids].filter(k => k.src !== 'g').sort((a, b) => cTot(b, m) - cTot(a, m)).slice(0, 5); if(top.length) out += `<br><small>Maiores subunidades:</small>` + table(top, m); }
      return out;
    }
    return `Encontrei <b>${fmt(ns.length)}</b> unidades com esse nome:` + table(ns.slice(0, 15), m) + (ns.length > 15 ? `<small>E mais ${ns.length - 15}. Cite o órgão na pergunta para filtrar.</small>` : '<small>Cite o órgão na pergunta para escolher uma delas.</small>');
  }
  // sem resultado: sugestões por palavra
  const ct = r.content.filter(t => t.length > 3); const sug = new Map();
  NODES.filter(n => n.src === 'd' || n.src === 'l' || n.src === 'o').forEach(n => { const nt = nodeTokens(n); const hit = ct.filter(t => nt.some(u => tokMatch(t, u))).length; if(hit) sug.set(n, hit); });
  const inOrg = r.org ? new Set(subtree(r.org)) : null;
  const list = [...sug.entries()].filter(e => !inOrg || inOrg.has(e[0])).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
  if(list.length) return 'Não achei exatamente isso. Você quis dizer:' + table(list, m);
  return 'Não consegui entender a pergunta. Posso responder sobre quantidade de servidores por órgão ou unidade, maiores e menores unidades, estrutura de uma unidade, onde ela fica e comparações. Veja os exemplos acima.';
}
const CH_EX = ['Quantos servidores tem no estado?', 'Quantos servidores tem a Subsecretaria de Logística e Patrimônio?', 'Quais as maiores superintendências da SEAD?', 'Quantas gerências tem a SEAD?', 'Onde fica a Gerência de Frotas?', 'Compare SEAD e Economia', 'Estrutura da Subsecretaria de Inovação da Gestão e dos Serviços Públicos', 'As 10 maiores unidades da Economia'];
function chatHtml(){
  const msgs = st.chat.map(c => `<div class="cq">${esc(c.q)}</div><div class="ca">${c.a}</div>`).join('') || '<div class="ca">Pergunte em linguagem natural, por exemplo: <i>quantos servidores tem a Superintendência de Gestão Integrada da SEAD?</i> Respondo com os números da hierarquia e levo você até a unidade.</div>';
  return `<section class="panel chat"><div class="ph"><h2>Pergunte ao painel</h2><span class="hint">Entende sigla, nome da unidade, órgão e pedidos como maiores, quantas, onde fica, estrutura e comparar</span></div>
  <div class="cex">${CH_EX.map(x => `<button class="chip sm" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="clog" id="clog">${msgs}</div>
  <form class="cform" id="chatf" autocomplete="off"><input type="text" id="chatq" placeholder="Digite sua pergunta" aria-label="Pergunta ao painel"><button class="btn" type="submit">Perguntar</button>${st.chat.length ? '<button class="clr2" type="button" data-chatclear="1">Limpar</button>' : ''}</form></section>`;
}
function chatRefresh(focus){
  const l = $('clog'); if(!l) return;
  l.innerHTML = st.chat.map(c => `<div class="cq">${esc(c.q)}</div><div class="ca">${c.a}</div>`).join('') || '<div class="ca">Pergunte em linguagem natural.</div>';
  l.scrollTop = l.scrollHeight; if(focus){ const i = $('chatq'); if(i) i.focus(); }
}
function ask(q){
  q = (q || '').trim(); if(!q) return;
  let a; try { a = answer(q); } catch(e){ a = 'Não consegui responder essa pergunta. Tente reescrever com o nome da unidade.'; }
  st.chat.push({q, a}); const f = $('chatf'); if(f && !f.querySelector('[data-chatclear]')) { render(); const i = $('chatq'); if(i) i.focus(); const l = $('clog'); if(l) l.scrollTop = l.scrollHeight; return; }
  chatRefresh(true);
}
function gonode(id){
  const n = NODES[id]; if(!n) return; const o = orgOf(n);
  hist.push(snap()); st.view = 'hier'; st.horg = o && o.dn ? o.dn : null; st.hq = ''; st.openKey = null; ensureOpen();
  for(let x = n.parent; x; x = x.parent) st.open.add(x.id);
  render();
  const el = document.querySelector(`[data-nid="${id}"]`);
  if(el){ el.scrollIntoView({block:'center'}); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2500); }
}
document.addEventListener('submit', e => { if(e.target.id === 'chatf'){ e.preventDefault(); const i = $('chatq'); const q = i.value; i.value = ''; ask(q); } });
