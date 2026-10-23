
/* ---------- chat: perguntas em linguagem natural sobre a hierarquia ---------- */
st.chat = []; st.last = null;
let CH_FAILED = []; try { CH_FAILED = JSON.parse(localStorage.getItem('painel_nao_entendidas') || '[]'); } catch(e) {}
const CH_STOP = new Set(('a o as os um uma uns umas de da do das dos em na no nas nos e ou para por com que qual quais quanto quantos quantas quantidade numero tem ha ter tenho tenha temos existem existe sao ser esta estao fica ficam servidores servidor pessoas pessoa vinculos vinculo lotados lotado lotada me mostre mostrar mostra liste listar lista diga fale falar sobre unidade unidades subordinada subordinadas abaixo total ao aos pela pelo pelas pelos eu quero queria gostaria saber ver onde estado goias governo estrutura organograma compoe composicao maiores maior menores menor top ranking compare comparar gente funcionarios funcionario efetivo equipe quadro trabalham trabalha trabalhando atuam atua ha tamanho numeros dados informacoes informacao favor por favor oi ola bom dia tarde noite ai la aqui ainda mais menos tambem so apenas somente cada todo toda todos todas isso essa esse esta este seu sua suas seus como se sera foi vai vao pode podem poderia'.split(' ')));
const CH_TYPES = [['subsecretaria','subsecretarias'],['superintendencia','superintendencias'],['gerencia','gerencias'],['coordenacao','coordenacoes'],['diretoria','diretorias'],['assessoria','assessorias'],['procuradoria','procuradorias'],['gabinete','gabinetes'],['supervisao','supervisoes']];
// apelidos e siglas comuns: cada termo vira alternativas para casar com os nomes das unidades
const SYN = {rh:['pessoas','pessoal'], recursoshumanos:['pessoas'], ti:['tecnologia','informacao','sistemas'], tic:['tecnologia','informacao'], informatica:['tecnologia','sistemas','informacao'], tecnologia:['tecnologia','informacao','sistemas'], juridico:['procuradoria','juridica'], juridica:['procuradoria'], financeiro:['financeira','financas','orcamentaria'], financas:['financeira','financeiro'], orcamento:['orcamentaria'], licitacao:['compras','contratos','licitacoes'], licitacoes:['compras','contratos'], contratos:['contratos','contratacoes'], contratacao:['contratacoes','contratos'], imoveis:['imobiliario','imobiliarias','imoveis'], patrimonio:['patrimonio','imobiliario','mobiliario'], frota:['frotas'], veiculos:['frotas'], carros:['frotas'], arquivo:['documental'], arquivos:['documental'], protocolo:['documental','secretaria'], ouvidoria:['ouvidoria'], atendimento:['atendimento'], cidadao:['cidadao'], concurso:['concursos'], concursos:['concursos'], selecao:['selecao','seletivos'], inovacao:['inovacao'], planejamento:['planejamento'], saude:['saude'], inspetoria:['corregedoria'], auditoria:['controle','corregedoria'], comunicacao:['comunicacao'], imprensa:['comunicacao'], aprendizes:['aprendizes'], perito:['pericia'], medico:['medicina','medica'], psicologia:['psicossocial'], obras:['obras'], escola:['governo','ensino'], treinamento:['treinamento','desenvolvimento'], capacitacao:['desenvolvimento','treinamento'], folha:['folha','pagamento'], pagamento:['pagamento','folha'], convenios:['convenios','transferencias'], transferencias:['transferencias'], cerimonial:['cerimonial'], presidencia:['presidente','presidencia'], chefe:['chefia'], chefia:['chefia'], secretario:['secretario','gabinete'], comando:['comando']};
const ORG_NICK = [['bombeiros','cbm'],['bombeiro','cbm'],['policia militar','pm'],['policia civil','dgpc'],['policia penal','dgpp'],['policia cientifica','dpci'],['cientifica','dpci'],['transito','detran'],['rodovias','goinfra'],['previdencia','goiasprev'],['turismo','goiasturismo'],['junta comercial','juceg'],['fazenda','economia'],['sefaz','economia'],['casa civil','casacivil'],['casa militar','casamilitar'],['educacao','seduc'],['cultura','secult'],['saude','ses'],['administracao','sead']];
const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const ctok = s => tokens(s).filter(t => !CH_STOP.has(t) && !/^quant/.test(t));
function stem(t){
  if(t.length <= 4) return t;
  return t.replace(/(oes|aes|aos)$/, 'ao').replace(/ais$/, 'al').replace(/(ns)$/, 'm').replace(/res$/, 'r').replace(/s$/, '');
}
function lev(a, b, max){
  if(Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({length: b.length + 1}, (_, i) => i);
  for(let i = 1; i <= a.length; i++){
    const cur = [i]; let min = i;
    for(let j = 1; j <= b.length; j++){ const v = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1)); cur.push(v); if(v < min) min = v; }
    if(min > max) return max + 1; prev = cur;
  }
  return prev[b.length];
}
// 0 = não casa, 1 = casa, 2 = casa com erro de digitação
function tokMatch(t, u, prefix = true){
  const a = stem(t), b = stem(u);
  if(a === b) return 1;
  if(prefix && Math.min(a.length, b.length) >= 4 && (b.startsWith(a) || a.startsWith(b))) return 1;
  const max = a.length >= 9 ? 2 : a.length >= 5 ? 1 : 0;
  if(max && lev(a, b, max) <= max) return 2;
  return 0;
}
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
const ORGS = NODES.filter(n => n.src === 'o' || n.src === 'n');
ORGS.forEach(o => {
  o.alias = [];
  const a = acronym(o); if(a) { o.alias.push(tokens(a)); o.alias.push([tokens(a).join('')]); }
  const base = o.n.replace(/\([^)]*\)/g,'').replace(/\s*[–-]\s*[A-ZÁÂÃÉÊÍÓÔÕÚÇ ]{2,}\s*$/,'').trim();
  o.alias.push(tokens(base));
  const st2 = base.replace(/^secretaria de estado d[aeo]s? /i,'').replace(/^(secretaria-geral d[eo] |agência goiana d[aeo]s? |agência estadual d[aeo]s? |departamento estadual d[aeo]s? |diretoria-geral d[aeo]s? |delegacia-geral d[aeo]s? |procuradoria-geral d[aeo]s? |controladoria-geral d[aeo]s? )/i,'');
  if(st2 !== base && tokens(st2).length) o.alias.push(tokens(st2).filter(t => !['de','da','do'].includes(t)));
  o.alias = o.alias.filter(a => a.length);
  o.nickKey = acronym(o) ? norm(acronym(o)).replace(/[^a-z]/g,'') : '';
});
function findSeq(qt, seq){
  const s = seq.filter(t => !CH_STOP.has(t)); if(!s.length) return -1;
  outer: for(let i = 0; i + s.length <= qt.length; i++){ for(let j = 0; j < s.length; j++){ const ex = s[j].length < 5 || s.length === 1 && s[j].length < 6; if(ex ? qt[i+j] !== s[j] : !tokMatch(qt[i+j], s[j], false)) continue outer; } return i; }
  return -1;
}
function detectOrg(qt){
  let best = null;
  const hay = ' ' + qt.join(' ') + ' ';
  for(const [k, key] of ORG_NICK){ if(hay.includes(' ' + k + ' ')){ const o = ORGS.find(x => x.nickKey === key); if(o){ best = {o, seq: k.split(' '), sc: 90, nick: true}; break; } } }
  ORGS.forEach(o => o.alias.forEach(a => {
    const s = a.filter(t => !CH_STOP.has(t));
    if(s.length && findSeq(qt, a) >= 0){ const sc = s.join('').length + (a === o.alias[0] ? 5 : 0); if(!best || sc > best.sc) best = {o, seq:s, sc}; }
  }));
  return best;
}
function subtree(n, out = []){ out.push(n); n.kids.forEach(k => subtree(k, out)); return out; }
function nodeTokens(n){ return n.tk || (n.tk = tokens(n.n).filter(t => !['de','da','do','das','dos','e','em','a','o'].includes(t))); }
function groupsOf(content){ return content.map(t => [t, ...(SYN[t] || [])]); }
function matchNodes(content, scope){
  if(!content.length) return {nodes: [], approx: false, fuzzy: false};
  const groups = groupsOf(content); const pool = subtree(scope).filter(n => n.src !== 'r' && n.src !== 'g');
  const synUsed = content.some(t => SYN[t] && !pool.some(n => nodeTokens(n).some(u => tokMatch(t, u))));
  const eval1 = n => { const nt = nodeTokens(n); let hit = 0, fz = 0; groups.forEach(g => { let bestv = 0; g.forEach((alt, ai) => nt.forEach(u => { const v = tokMatch(alt, u); if(v && !(ai > 0 && v === 2) && (!bestv || v < bestv)) bestv = v; })); if(bestv){ hit++; if(bestv === 2) fz++; } }); return {nt, hit, fz}; };
  let best = -1, res = [], approx = false, fuzzy = false;
  if(synUsed){ const all = pool.map(n => ({n, e: eval1(n)})).filter(x => x.e.hit >= groups.length).map(x => x.n).sort((a, b) => a.depth - b.depth || b.st - a.st).slice(0, 8); if(all.length) return {nodes: all, approx: false, fuzzy: false, syn: true}; }
  pool.forEach(n => {
    const e = eval1(n); if(e.hit < groups.length) return;
    let sc = 100 - (e.nt.length - groups.length) * 3 - n.depth * .1 - e.fz * 4 + Math.min(6, Math.log10(n.st + 1) * 2);
    if(norm(n.n).replace(/[^a-z0-9 ]/g,' ').split(' ').filter(t => t && !CH_STOP.has(t)).join(' ') === content.join(' ')) sc += 50;
    if(sc > best){ best = sc; res = [n]; fuzzy = e.fz > 0; } else if(sc === best) res.push(n);
  });
  if(!res.length && groups.length >= 2){
    pool.forEach(n => { const e = eval1(n); const cov = e.hit / groups.length; if(e.hit < 1 || cov < .6) return; const sc = e.hit * 100 - (e.nt.length - e.hit) * 3 - n.depth * .1; if(sc > best){ best = sc; res = [n]; approx = true; } else if(sc === best) res.push(n); });
  }
  return {nodes: res, approx, fuzzy};
}
const nl = n => `<button class="link" data-gonode="${n.id}">${esc(n.n)}</button>`;
const wordOf = m => chMode(m) === 's' ? 'servidores' : 'vínculos';
const isOrgN = n => n.src === 'o' || n.src === 'n' || n.src === 'g' || n.src === 'r';
const val = (n, m) => isOrgN(n) ? `<b>${fmt(cTot(n, m))}</b> ${wordOf(m)}` : (cTot(n, m) === cOwn(n, m) || !n.kids.length ? `<b>${fmt(cOwn(n, m))}</b> ${wordOf(m)}` : `<b>${fmt(cOwn(n, m))}</b> ${wordOf(m)} lotados na unidade e <b>${fmt(cTot(n, m))}</b> com subordinadas`);
function table(rows, m){
  return `<div class="ctab">${rows.map(n => { const o = orgOf(n); return `<div class="crow"><span>${nl(n)}${o && o !== n ? ` <small>${esc(orgShort(o))}</small>` : ''}</span><span class="cn">${isOrgN(n) ? fmt(cTot(n, m)) : fmt(cOwn(n, m)) + (n.kids.length ? ` <small>(${fmt(cTot(n, m))})</small>` : '')}</span></div>`; }).join('')}</div>`;
}
function resolve(text, scope0){
  const qt = tokens(text); const org = detectOrg(qt);
  let content = ctok(text);
  if(org){ const rm = org.seq.map(stem); content = content.filter(t => !rm.includes(stem(t))); }
  const scope = org ? org.o : scope0;
  let res = {nodes: [], approx: false, fuzzy: false};
  if(content.length){
    res = matchNodes(content, scope);
    if(!res.nodes.length && scope !== ROOT) res = matchNodes(content, ROOT);
    if(!res.nodes.length && org){ res = matchNodes(ctok(text), ROOT); }
  } else if(org) res.nodes = [org.o];
  return {org: org && org.o, content, nodes: res.nodes, approx: res.approx, fuzzy: res.fuzzy, syn: res.syn, scope};
}
const echo = r => (r.approx || r.fuzzy) && r.nodes.length === 1 ? `<small>Entendi como <b>${esc(r.nodes[0].n)}</b>.</small><br>` : '';
// ---- respostas por tipo
function doTotal(sc, m){ const w = wordOf(m); return `${sc === ROOT ? 'No estado' : 'Em ' + nl(sc)}, a hierarquia soma <b>${fmt(cTot(sc, m))}</b> ${w}${sc === ROOT ? ` em ${fmt(ORGS.filter(o => o.src === 'o').length)} órgãos com folha na planilha` : ''}.`; }
function doCount(r, m){
  const ns = r.nodes;
  if(ns.length === 1){
    const n = ns[0]; const o = orgOf(n);
    let out = echo(r) + `${nl(n)}${o && o !== n ? ` <small>(${esc(orgShort(o))})</small>` : ''}: ${val(n, m)}.`;
    if(n.kids.length){ const top = [...n.kids].filter(k => k.src !== 'g').sort((a, b) => cTot(b, m) - cTot(a, m)).slice(0, 5); if(top.length) out += `<br><small>Maiores subunidades:</small>` + table(top, m); }
    return out;
  }
  if(r.syn) return `Entendi como unidades relacionadas a <i>${esc(r.content.join(' '))}</i>. Encontrei <b>${fmt(ns.length)}</b>:` + table(ns, m) + '<small>Para o número de uma delas, pergunte pelo nome.</small>';
  if(r.approx) return `Não achei exatamente isso. As mais próximas:` + table(ns.slice(0, 8), m);
  return `Encontrei <b>${fmt(ns.length)}</b> unidades com esse nome:` + table(ns.slice(0, 15), m) + (ns.length > 15 ? `<small>E mais ${ns.length - 15}. Cite o órgão na pergunta para filtrar.</small>` : '<small>Cite o órgão na pergunta para escolher uma delas.</small>');
}
function doList(r, m, typ){
  const n = r.nodes[0] || r.org; if(!n) return null;
  if(typ){ const list = subtree(n).filter(x => x !== n && norm(x.n).startsWith(typ[0].slice(0, 8))); if(!list.length) return `Não há ${typ[1]} em ${nl(n)}.`; return `${nl(n)} tem <b>${fmt(list.length)}</b> ${typ[1]}:` + table(list.slice(0, 25), m) + (list.length > 25 ? `<small>E mais ${list.length - 25}.</small>` : ''); }
  if(n.kids.length){ const ks = n.kids.filter(k => k.src !== 'g'); return echo(r) + `${nl(n)} tem <b>${fmt(ks.length)}</b> unidades no nível imediato, com ${val(n, m)}:` + table(ks.slice(0, 25), m) + (ks.length > 25 ? `<small>E mais ${ks.length - 25}. Use o link para abrir a hierarquia completa.</small>` : ''); }
  return `${nl(n)} não tem unidades subordinadas. Lotados nela: ${val(n, m)}.`;
}
function doType(r, m, word, scope0){
  const sc = r.org || (r.nodes[0] && r.nodes[0].src !== 'o' ? r.nodes[0] : null) || scope0;
  let list;
  if(/^(orgao|orgaos|entidade|entidades|secretaria|secretarias)$/.test(word)) list = ORGS.filter(o => !/^secretaria/.test(word) || /^secretaria/i.test(o.n));
  else if(/^unidade/.test(word)) list = subtree(sc).filter(n => n.src === 'd');
  else { const t = CH_TYPES.find(t => t.includes(word) || word.startsWith(t[0].slice(0, 7))); list = t ? subtree(sc).filter(n => norm(n.n).startsWith(t[0].slice(0, 8))) : []; }
  return `${sc === ROOT ? 'No estado' : 'Em ' + nl(sc)} há <b>${fmt(list.length)}</b> ${esc(word)}.` + (list.length && list.length <= 40 ? table(list.slice(0, 15), m) : '');
}
function doRank(r, m, o, scope0){
  const sc = r.org || (r.nodes[0] && r.nodes[0].kids.length ? r.nodes[0] : null) || scope0;
  const typ = o.typ; const orgMode = o.orgMode && sc === ROOT;
  let pool = orgMode ? ORGS.filter(x => x.src === 'o') : subtree(sc).filter(n => n !== sc && (n.src === 'd' || n.src === 'l') && !/^(inativa|unidade nao informada)/.test(norm(n.n)) && (!typ || norm(n.n).startsWith(typ[0].slice(0, 8))));
  const useTot = orgMode || (typ && ['subsecretaria','superintendencia','diretoria'].includes(typ[0]));
  const f = n => useTot ? cTot(n, m) : cOwn(n, m);
  pool = pool.filter(n => f(n) > 0).sort((a, b) => o.asc ? f(a) - f(b) : f(b) - f(a)).slice(0, o.N);
  if(!pool.length) return 'Não encontrei unidades com servidores para esse recorte.';
  return `${o.asc ? 'Menores' : 'Maiores'} ${typ ? typ[1] : orgMode ? 'órgãos' : 'unidades'}${sc === ROOT ? ' do estado' : ' de ' + nl(sc)}, por ${useTot ? 'total com subordinadas' : 'lotados na unidade'} (${wordOf(m)}):` + table(pool, m);
}
function doWhere(r){
  if(!r.nodes.length) return null;
  return r.nodes.slice(0, 6).map(n => `${nl(n)} fica em: ${pathOf(n).slice(0, -1).map(esc).join(' › ') || 'primeiro nível'}.`).join('<br>') + (r.nodes.length > 6 ? `<br><small>E mais ${r.nodes.length - 6}.</small>` : '');
}
function doCompare(parts, m){
  const items = parts.slice(0, 3).map(p => resolve(p, ROOT)).map(r => r.nodes[0]).filter(Boolean);
  if(items.length < 2) return null;
  const mx = Math.max(...items.map(n => cTot(n, m)), 1);
  const win = [...items].sort((a, b) => cTot(b, m) - cTot(a, m))[0];
  return `Comparando ${wordOf(m)}, somando cada unidade com as subordinadas. Maior: ${nl(win)}.` + `<div class="ctab">${items.map(n => `<div class="crow"><span>${nl(n)} <small>${esc(orgShort(orgOf(n)) || '')}</small><div class="hb"><i style="width:${cTot(n, m)/mx*100}%"></i></div></span><span class="cn">${fmt(cTot(n, m))}${isOrgN(n) ? '' : `<small> (${fmt(cOwn(n, m))} na unidade)</small>`}</span></div>`).join('')}</div>`;
}
const HELP = `Eu respondo sobre quantidade de servidores por órgão e unidade. Pode perguntar, por exemplo:<br>• <i>quantos servidores tem a Superintendência de Gestão Integrada?</i><br>• <i>maiores gerências da SEAD</i><br>• <i>quais gerências tem a Subsecretaria de Logística?</i><br>• <i>onde fica a Gerência de Frotas?</i><br>• <i>compare SEAD e Economia</i><br>• <i>e em vínculos?</i> (continua a pergunta anterior)`;
function answer(q){
  const nq = norm(q).replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim(); const qt = tokens(q);
  const wantL = /vinculo/.test(nq), wantS = /\b(pessoa|pessoas|servidor|servidores)\b/.test(nq) && !wantL;
  const m = wantL ? 'l' : (wantS && !/\bvinculo/.test(nq) ? st.mode : st.mode);
  const scope0 = st.horg && ORG_BY_DN[st.horg] ? ORG_BY_DN[st.horg] : ROOT;
  const nMatch = nq.match(/\b(\d{1,2})\b/); const N = nMatch ? Math.min(20, Math.max(1, +nMatch[1])) : 5;
  if(/^(ajuda|help|o que voce (faz|sabe|responde)|como (funciona|uso|usar)|exemplos?|\?)$/.test(nq) || /\b(o que (posso|da para|voce consegue) (perguntar|fazer)|como (te )?pergunt)/.test(nq)) return HELP;
  if(/^(oi|ola|bom dia|boa tarde|boa noite|e ai|obrigad[oa]|valeu|ok)\b/.test(nq) && qt.length <= 3) return nq.startsWith('obrig') || nq === 'valeu' ? 'Por nada! Se quiser, faça outra pergunta.' : 'Olá! ' + HELP;
  // pergunta de continuação: "e a Economia?", "e em vínculos?", "e na SEDUC?"
  const follow = st.last && (/^(e|agora|entao|e se|e quanto|e quantos|e quantas)\b/.test(nq) || /^(em )?(vinculos|pessoas|servidores)$/.test(nq));
  const intentWords = /\b(quant\w*|maior\w*|menor\w*|onde|compar\w*|quais|liste\w*|estrutura|organograma|mais|menos|top|ranking)\b/;
  if(follow && !intentWords.test(nq.replace(/^e\s+/, ''))){
    const r2 = resolve(nq.replace(/^(e|agora|entao|e se)\s+/, ''), scope0);
    const L = st.last;
    if(r2.nodes.length || r2.org || /vinculo|pessoa|servidor/.test(nq)){
      const rr = (r2.nodes.length || r2.org) ? r2 : L.r;
      const a = L.run(rr, m, scope0); if(a) { st.last = {...L, r: rr}; return '<small>Continuando a pergunta anterior.</small><br>' + a; }
    }
  }
  // comparar
  const cmpWord = /\b(compar\w*|versus|vs|diferenca|qual (tem|e) (mais|menor|maior|menos))\b/.test(nq);
  if(cmpWord || (/\b(ou)\b/.test(nq) && /\b(mais|menos|maior|menor|qual)\b/.test(nq))){
    const body = nq.replace(/\b(compar\w*|a diferenca entre|diferenca entre|diferenca|qual (tem|e) (mais|menos|maior|menor)( \w+)?|qual)\b/g, ' ');
    const parts = body.split(/\s(?:e|ou|vs|versus|com|contra|x)\s/).map(s => s.trim()).filter(s => s.length > 1);
    if(parts.length >= 2){ const a = doCompare(parts, m); if(a){ st.last = {kind: 'cmp', r: null, run: (rr, mm) => doCompare(parts, mm)}; return a; } }
  }
  // onde fica / hierarquia
  if(/((em|a) que (secretaria|orgao|unidade|subsecretaria|superintendencia|diretoria) (esta|fica|pertence|e)|onde (fica|ficam|esta|estao)|a quem (e )?subordinad|subordinad[ao] a |pertence|caminho|hierarquia de|quem (e|eh) o pai|dentro de que|vinculad[ao] a)/.test(nq)){
    const r = resolve(q.replace(/(em|a) que \w+ (esta|fica|pertence|e)\b|onde fica|onde ficam|onde esta|onde estao|a quem|pertence/gi, ' '), scope0);
    const a = doWhere(r); if(a){ st.last = {kind: 'where', r, run: rr => doWhere(rr)}; return echo(r) + a; }
  }
  const r = resolve(q, scope0);
  // quantas gerências / unidades tem ...
  const tc = nq.match(/(?:quant[ao]s?|numero de|total de|tem)\s+(?:de\s+)?(subsecretarias?|superintendencias?|gerencias?|coordenacoes|coordenacao|diretorias?|assessorias?|procuradorias?|gabinetes?|supervisoes|supervisao|unidades|orgaos|entidades|secretarias)/);
  if(tc && /quant|numero|total/.test(nq)){ const word = tc[1]; st.last = {kind: 'type', r, run: (rr, mm, s0) => doType(rr, mm, word, s0)}; return echo(r) + doType(r, m, word, scope0); }
  // ranking
  const rk = /\b(maior\w*|menor\w*|top|ranking|mais (servidores|pessoas|gente|funcionarios)|menos (servidores|pessoas|gente|funcionarios)|mais lotad\w*|mais numeros\w*|concentra\w*)\b/.test(nq) || /\b(qual|quais) (a |as |o |os )?(unidade|orgao|secretaria|gerencia|superintendencia|subsecretaria|coordenacao|diretoria)s? (tem|com) (mais|menos)/.test(nq);
  if(rk){
    const asc = /\b(menor\w*|menos)\b/.test(nq);
    const typ = CH_TYPES.find(t => t.some(x => nq.includes(x.slice(0, 8))));
    const orgMode = /\b(orgaos?|secretarias?|entidades?|agencias?)\b/.test(nq);
    const o = {asc, N: /\b(maior|menor)\b/.test(nq) && !nMatch ? 1 : N, typ, orgMode};
    const a = doRank(r, m, o, scope0); st.last = {kind: 'rank', r, run: (rr, mm, s0) => doRank(rr, mm, o, s0)}; return a;
  }
  // listar por tipo: "quais subsecretarias tem a SEAD"
  const tp = CH_TYPES.find(t => new RegExp('\\b' + t[1] + '\\b').test(nq));
  if(tp && /\b(quais|liste\w*|listar|lista|mostre|mostrar|todas?)\b/.test(nq)){
    const r2 = resolve(nq.replace(new RegExp('\\b' + tp[1] + '\\b'), ' '), scope0);
    const alvo = r2.nodes[0] || r2.org || scope0;
    const a = doList({nodes: [alvo], org: r2.org, content: []}, m, tp); if(a){ st.last = {kind: 'list', r: r2, run: (rr, mm) => doList({nodes: [rr.nodes[0] || rr.org || scope0], content: []}, mm, tp)}; return a; }
  }
  // listar / estrutura
  if(/\b(quais|liste\w*|listar|lista|estrutura|organograma|abaixo|subordinad\w*|compoe|composicao|tem dentro|unidades d[aeo]|filhas|subunidades|divisoes|areas|setores|mostre|mostrar|detalhe\w*)\b/.test(nq) && (r.nodes.length || r.org)){
    const typ = CH_TYPES.find(t => t.some(x => nq.includes(x.slice(0, 8))) && !r.nodes.some(n => norm(n.n).startsWith(t[0].slice(0, 8)) && nq.includes(norm(n.n).slice(0, 12))));
    const sc = typ && !(r.nodes[0] && norm(r.nodes[0].n).includes(typ[0].slice(0, 6)) && r.content.some(c => stem(c) === stem(typ[0]))) ? typ : null;
    const a = doList(r, m, sc); if(a){ st.last = {kind: 'list', r, run: (rr, mm) => doList(rr, mm, sc)}; return a; }
  }
  // total do estado ou do escopo
  if(!r.content.length && !r.org && (/(estado|goias|governo|todos|total|ao todo|geral)/.test(nq) || !r.nodes.length) && /quant|total|numero|soma|tamanho/.test(nq)){ st.last = {kind: 'total', r, run: (rr, mm, s0) => doTotal(rr.org || s0, mm)}; return doTotal(scope0, m); }
  // contagem de uma unidade (inclui só digitar o nome)
  if(r.nodes.length){ st.last = {kind: 'count', r, run: (rr, mm) => rr.nodes.length ? doCount(rr, mm) : null}; return doCount(r, m); }
  // sem resultado: sugestões, inclusive por sinônimo
  const ct = r.content.filter(t => t.length > 2); const sug = new Map();
  const groups = groupsOf(ct);
  NODES.filter(n => n.src === 'd' || n.src === 'l' || n.src === 'o').forEach(n => { const nt = nodeTokens(n); const hit = groups.filter(g => g.some(alt => nt.some(u => tokMatch(alt, u)))).length; if(hit) sug.set(n, hit); });
  const inOrg = r.org ? new Set(subtree(r.org)) : null;
  const list = [...sug.entries()].filter(e => !inOrg || inOrg.has(e[0])).sort((a, b) => b[1] - a[1] || a[0].depth - b[0].depth).slice(0, 6).map(e => e[0]);
  noteFailed(q);
  if(list.length) return 'Não achei exatamente isso. Você quis dizer um destes?' + table(list, m) + '<small>Clique no nome para ver na hierarquia, ou reescreva a pergunta com o nome completo da unidade.</small>';
  return 'Não consegui entender essa pergunta. ' + HELP;
}
function noteFailed(q){
  if(!CH_FAILED.includes(q)){ CH_FAILED.push(q); try { localStorage.setItem('painel_nao_entendidas', JSON.stringify(CH_FAILED.slice(-100))); } catch(e) {} }
}
const CH_EX = ['Quantos servidores tem no estado?', 'Quantos servidores tem a Subsecretaria de Logística e Patrimônio?', 'Maiores superintendências da SEAD', 'Quais gerências tem a Subsecretaria de Logística e Patrimônio?', 'Onde fica a Gerência de Frotas?', 'Compare SEAD e Economia', 'Quantos servidores tem o RH da SEAD?', 'Qual órgão tem mais servidores?'];
const chLog = () => st.chat.map(c => `<div class="cq">${esc(c.q)}</div><div class="ca">${c.a}</div>`).join('') || `<div class="ca">${HELP}</div>`;
function chatHtml(){
  return `<section class="panel chat"><div class="ph"><h2>Pergunte ao painel</h2><span class="hint">Entende sigla, apelido (RH, TI), erro de digitação e perguntas de continuação</span></div>
  <div class="cex">${CH_EX.map(x => `<button class="chip sm" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="clog" id="clog">${chLog()}</div>
  <form class="cform" id="chatf" autocomplete="off"><input type="text" id="chatq" placeholder="Digite sua pergunta" aria-label="Pergunta ao painel"><button class="btn" type="submit">Perguntar</button>${st.chat.length ? '<button class="clr2" type="button" data-chatclear="1">Limpar</button>' : ''}</form>
  ${CH_FAILED.length ? `<div class="cfoot"><span>${CH_FAILED.length} pergunta${CH_FAILED.length > 1 ? 's' : ''} não entendida${CH_FAILED.length > 1 ? 's' : ''} neste navegador.</span> <button class="link" data-chatfail="1">Copiar lista</button></div>` : ''}</section>`;
}
function chatRefresh(focus){
  const l = $('clog'); if(!l) return;
  l.innerHTML = chLog(); l.scrollTop = l.scrollHeight; if(focus){ const i = $('chatq'); if(i) i.focus(); }
}
function ask(q){
  q = (q || '').trim(); if(!q) return;
  let a; try { a = answer(q); } catch(e){ a = 'Não consegui responder essa pergunta. Tente reescrever com o nome da unidade.'; noteFailed(q); }
  st.chat.push({q, a}); const f = $('chatf');
  if(f && (!f.querySelector('[data-chatclear]') || !!CH_FAILED.length !== !!document.querySelector('.cfoot'))){ render(); const i = $('chatq'); if(i) i.focus(); const l = $('clog'); if(l) l.scrollTop = l.scrollHeight; return; }
  chatRefresh(true);
}
function copyFailed(){
  const txt = CH_FAILED.join('\n');
  const done = () => { const b = document.querySelector('[data-chatfail]'); if(b){ b.textContent = 'Copiado'; setTimeout(() => b.textContent = 'Copiar lista', 2000); } };
  if(navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => window.prompt('Copie a lista:', txt)); else window.prompt('Copie a lista:', txt);
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
