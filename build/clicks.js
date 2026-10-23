const cq = e.target.closest('[data-q]'); if(cq){ ask(cq.dataset.q); return; }
  if(e.target.closest('[data-chatfail]')){ copyFailed(); return; }
  const gn = e.target.closest('[data-gonode]'); if(gn){ gonode(+gn.dataset.gonode); return; }
  if(e.target.closest('[data-chatclear]')){ st.chat = []; render(); return; }
  const tg = e.target.closest('[data-t]'); if(tg){ const id = +tg.dataset.t; st.open.has(id) ? st.open.delete(id) : st.open.add(id); const y = window.scrollY; hrefresh(); window.scrollTo({top:y}); return; }
  const hi = e.target.closest('[data-hiso]'); if(hi){ go('hier', decodeURIComponent(hi.dataset.hiso)); return; }
  if(e.target.closest('[data-hall0]')){ go('hier'); return; }
  const li = e.target.closest('[data-lista]'); if(li){ go('orgao', decodeURIComponent(li.dataset.lista)); return; }
  if(e.target.closest('[data-hall]')){ NODES.forEach(n => n.kids.length && st.open.add(n.id)); hrefresh(); return; }
  if(e.target.closest('[data-hnone]')){ st.open = new Set([hscope().id]); st.hq = ''; render(); return; }
  const hs = e.target.closest('[data-hsort]'); if(hs){ st.hsort = hs.dataset.hsort; render(); return; }
  if(e.target.id === 'hcsv'){ hcsv(); return; }
  if(e.target.id === 'hhtml'){ hexport(hscope()); return; }
  const he = e.target.closest('[data-hexp]'); if(he){ hexport(NODES[+he.dataset.hexp]); return; }
  const o = e.target.closest('[data-o]'); if(o){ go('hier', decodeURIComponent(o.dataset.o)); return; }
