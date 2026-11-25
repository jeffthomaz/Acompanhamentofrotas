window.iniciarPainel = function (D) {
  // Abas sem dados para o grupo do usuário não aparecem.
  var ABAS = [
    { id: "resumo", nome: "Resumo", tem: "resumo" },
    { id: "comportamento", nome: "Comportamental", tem: "comportamento" },
    { id: "motor-ocioso", nome: "Motor ocioso", tem: "motorOcioso" },
    { id: "permanencia", nome: "Permanência", tem: "permanencia" },
    { id: "conectividade", nome: "Conectividade", tem: "conectividade" },
    { id: "cameras", nome: "Câmeras", tem: "cameras" },
    { id: "apresentacao", nome: "Apresentação", tem: "apresentacao" }
  ].filter(function (a) { return a.tem === "apresentacao" ? !!window.painelAp : a.tem === "resumo" ? D.comportamento || D.motorOcioso || D.permanencia || D.conectividade || D.cameras : D[a.tem]; });
  var filtro = "Todos";
  var ordem = {};

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v, d) { return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function dur(min) { var h = Math.floor(min / 60), m = min % 60; return h ? h + " h " + (m < 10 ? "0" : "") + m + " min" : m + " min"; }
  function equips() { return D.equipamentos.filter(function (e) { return filtro === "Todos" || e.tipo === filtro; }); }
  function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
  function plural(n, um, varios) { return n === 1 ? um : varios; }

  function th(key, col, label, right) {
    var o = ordem[key], ar = o && o.col === col ? (o.dir > 0 ? "ascending" : "descending") : "none";
    return '<th scope="col"' + (right ? ' class="r"' : "") + ' aria-sort="' + ar + '"><button type="button" data-sort="' + key + ":" + col + '">' + esc(label) + "</button></th>";
  }
  function sortable(rows, key) {
    var o = ordem[key];
    if (!o) return rows;
    return rows.slice().sort(function (a, b) {
      var x = a[o.col], y = b[o.col];
      return o.dir * (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR"));
    });
  }

  // Colunas por dia (SVG)
  function dias(valores, un, meta, titulo, rotulos) {
    var W = 420, H = 140, pad = 6, base = H - 20;
    var max = Math.max.apply(null, valores.concat(meta || 0)) * 1.2, bw = (W - pad * 2) / valores.length;
    var s = '<div class="dia"><h3>' + esc(titulo) + '</h3><svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(titulo) + '">';
    valores.forEach(function (v, i) {
      var h = v / max * (base - 14), x = pad + i * bw + bw * .2, w = bw * .6, y = base - h;
      s += '<rect class="col' + (meta && v > meta ? " hi" : "") + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" style="animation-delay:' + i * 50 + 'ms"/>' +
        '<text class="tv" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle">' + num(v, un === "%" ? 1 : 0) + "</text>" +
        '<text class="tl" x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + (rotulos || D.dias)[i] + "</text>";
    });
    if (meta) { var ym = base - meta / max * (base - 14); s += '<line class="meta" x1="0" x2="' + W + '" y1="' + ym.toFixed(1) + '" y2="' + ym.toFixed(1) + '"/>'; }
    return s + "</svg></div>";
  }

  function linha(i, quem, plot, res) {
    return '<div class="row" style="--i:' + i + '"><div class="who">' + quem + '</div><div class="plot">' + plot + '</div><div class="res">' + res + "</div></div>";
  }

  // ---------- Comportamento (painel de ocorrências, filtrado por processo e responsável) ----------
  var fil_ = { processo: "", responsavel: "", turnos: [1, 1, 1], horas: null };
  // Filtro de turno (Comportamental e Resumo): A 07:00–15:10, B 15:10–23:10, C 23:10–07:00, pela hora da ocorrência (5º item do ev).
  var TURNO_NOMES = [["A", "07:00 – 15:10"], ["B", "15:10 – 23:10"], ["C", "23:10 – 07:00"]];
  function todosTurnos() { return fil_.turnos[0] && fil_.turnos[1] && fil_.turnos[2]; }
  // Ocorrência sem hora só entra com os três turnos marcados.
  function turnoOk(e) { var t = e.length > 4 ? e[4] : 3; return t === 3 ? todosTurnos() : !!fil_.turnos[t]; }
  // Filtro por hora (clicando nas barras de "Horas de pico", 20/11/2026): null = todas; senão {hora: 1}. Ocorrência sem hora só entra sem filtro.
  function horaOk(e) { return !fil_.horas || (e.length > 5 && !!fil_.horas[e[5]]); }
  function trocaHora(h) {
    var nv = fil_.horas ? Object.assign({}, fil_.horas) : {};
    if (nv[h]) delete nv[h]; else nv[h] = 1;
    fil_.horas = Object.keys(nv).length ? nv : null;
    render();
  }
  // Clique num quadro de turno: com todos marcados, fica só ele; senão marca/desmarca; sem nenhum, volta a todos.
  function trocaTurno(ti) {
    var nv = todosTurnos() ? [0, 0, 0] : fil_.turnos.slice();
    nv[ti] = todosTurnos() ? 1 : nv[ti] ? 0 : 1;
    fil_.turnos = nv[0] || nv[1] || nv[2] ? nv : [1, 1, 1];
    render();
    var t2 = document.querySelector('[data-turno="' + ti + '"]'); if (t2) t2.focus({ preventScroll: true });
  }
  // Hierarquia (Gerente > Coordenador > Gestor > Líder), compartilhada por Comportamental, Motor ocioso e Permanência (19/11/2026).
  var NIV_H = [["ger", "gerente", "Gerente", "Todos os gerentes"], ["resp", "responsavel", "Coordenador", "Todos os coordenadores"], ["gest", "gestor", "Gestor", "Todos os gestores"]]; // Líder saiu dos filtros a pedido (25/11/2026); h.lid fica sempre vazio.
  function hierAtiva() { var h = fil_.h || {}; return !!(h.ger || h.resp || h.gest || h.lid); }
  // itens: lista; reg(item) devolve o registro com gerente/responsavel/gestor/lider. Devolve os itens filtrados e o HTML dos 4 selects.
  function hier(itens, reg, pre) {
    var h = fil_.h || (fil_.h = { ger: "", resp: "", gest: "", lid: "" }), html = "";
    NIV_H.forEach(function (n) {
      var l = unicos(itens.map(function (x) { return (reg(x) || {})[n[1]]; }).filter(Boolean));
      if (h[n[0]] && l.indexOf(h[n[0]]) < 0) h[n[0]] = "";
      itens = itens.filter(function (x) { return !h[n[0]] || (reg(x) || {})[n[1]] === h[n[0]]; });
      html += "<label>" + n[2] + '<select data-hier="' + n[0] + '" id="' + pre + "-" + n[0] + '">' + opcoes(l, h[n[0]], n[3]) + "</select></label>";
    });
    return { itens: itens, html: html };
  }
  var fotoModo = false; // durante as fotos o Top 5 fica sempre aberto
  function top5Aberto() { if (fotoModo) return true; try { return localStorage.getItem("painel-top5") === "1"; } catch (e) { return !!fil_.top5; } }
  function trocaTop5() { var v = !top5Aberto(); fil_.top5 = v; try { localStorage.setItem("painel-top5", v ? "1" : "0"); } catch (e) {} render(); var b = document.querySelector("[data-top5]"); if (b) b.focus({ preventScroll: true }); }
  // Clique num card de tipo: sem filtro, fica só ele; senão soma/tira; sem nenhum, volta a todos.
  function trocaTipo(id) {
    var nv = {};
    if (fil_.tipos) Object.keys(fil_.tipos).forEach(function (k) { nv[k] = 1; });
    if (!fil_.tipos) nv[id] = 1; else if (nv[id]) delete nv[id]; else nv[id] = 1;
    fil_.tipos = Object.keys(nv).length && Object.keys(nv).length < CATS.length ? nv : null;
    render();
    var a = document.querySelector('article[data-tipo="' + id + '"]'); if (a) a.focus({ preventScroll: true });
  }
  function turnoTexto() {
    var hs = fil_.horas ? Object.keys(fil_.horas).map(Number).sort(function (a, b) { return a - b; }) : [];
    var hT = hs.length ? (hs.length === 1 ? "hora " : "horas ") + hs.map(function (h) { return pad(h) + "h"; }).join(", ") : "";
    if (todosTurnos()) return hT;
    var m = TURNO_NOMES.filter(function (_, i) { return fil_.turnos[i]; }).map(function (t) { return t[0]; });
    return (m.length === 1 ? "turno " + m[0] : "turnos " + m.join(" e ")) + (hT ? ", " + hT : "");
  }
  var CATS = [
    { id: "vel", nome: "Excesso de velocidade", icone: "M4 17a8 8 0 1 1 16 0M12 17l4-5" },
    { id: "celular", nome: "Uso de celular", icone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2" },
    { id: "cinto", nome: "Sem cinto de segurança", icone: "M12 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 21l3-9h6l3 9M8 12l9 7" },
    { id: "cigarro", nome: "Uso de cigarro", icone: "M3 14h13v4H3zM18 14v4M21 14v4M18 11c0-2 3-2 3-5" },
    { id: "distracao", nome: "Distração", icone: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" },
    { id: "fadiga", nome: "Fadiga e bocejo", icone: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" },
    { id: "faixa", nome: "Ultrapassagem em faixa contínua", icone: "M5 21L9 3M19 21L15 3M12 3v18" }
  ];
  var TOTAL_ICONE = "M5 20V10M12 20V4M19 20v-7";

  function ico(d, cls) {
    return '<svg class="ic ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  function opcoes(lista, atual, rotulo) {
    return '<option value="">' + rotulo + "</option>" + lista.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === atual ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }
  function unicos(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }).sort(function (x, y) { return x.localeCompare(y, "pt-BR"); }); }
  function variacao(cur, ant) { return ant > 0 ? (cur - ant) / ant * 100 : null; }
  function delta(cur, ant) {
    var v = variacao(cur, ant);
    if (v === null) return '<span class="dl neutro">sem base</span>';
    var queda = v < 0, ig = Math.abs(v) < 0.05;
    return '<span class="dl ' + (ig ? "neutro" : queda ? "bom" : "ruim") + '"><span aria-hidden="true">' + (ig ? "=" : queda ? "↓" : "↑") + "</span> " + (v > 0 ? "+" : "") + num(v, 1) + "%</span>";
  }

  function empilhado(dados, simples, largura, series) {
    var SR = series || CATS;
    // dados: [{d:'28/10', partes:[n por categoria], total}]
    var W = largura || 520, H = 290, pr = 6, pt = 26, pb = 28, ih = H - pt - pb;
    var max = Math.max.apply(null, [1].concat(dados.map(function (x) { return x.total; })));
    var passo = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].filter(function (p) { return max / p <= 6; })[0] || 5000;
    var topo = Math.ceil(max / passo) * passo, pl = topo >= 10000 ? 44 : 32, bw = (W - pl - pr) / dados.length;
    var sv = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart big" role="img" aria-label="Ocorrências por dia, empilhadas por tipo">';
    for (var g = 0; g <= topo; g += passo) {
      var y = pt + ih - g / topo * ih;
      sv += '<line class="grade" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/><text class="tl" x="' + (pl - 5) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + g + "</text>";
    }
    dados.forEach(function (x, i) {
      var xx = pl + i * bw + bw * .2, w = bw * .6, acum = 0;
      (simples ? [x.total] : x.partes).forEach(function (n, k) {
        if (!n) return;
        var h = n / topo * ih, yy = pt + ih - (acum + n) / topo * ih; acum += n;
        sv += '<rect class="seg c-' + (simples ? "total" : SR[k].id) + '" x="' + xx.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h, 0).toFixed(1) + '" style="animation-delay:' + i * 45 + 'ms"><title>' + esc((simples ? "Total" : SR[k].nome) + ": " + n) + "</title></rect>";
      });
      sv += '<text class="tv" x="' + (xx + w / 2).toFixed(1) + '" y="' + (pt + ih - x.total / topo * ih - 5).toFixed(1) + '" text-anchor="middle">' + x.total + "</text>" +
        '<text class="tl" x="' + (xx + w / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + x.d + "</text>";
    });
    return sv + "</svg>";
  }

  function rosca(cats, total) {
    var r = 15.9155, acum = 0, sv = '<svg viewBox="0 0 42 42" class="rosca" role="img" aria-label="Participação por tipo de ocorrência">' +
      '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="var(--soft)" stroke-width="6"/>';
    cats.forEach(function (c) {
      if (!c.n || !total) return;
      var p = c.n / total * 100;
      sv += '<circle class="arco c-' + c.id + '" cx="21" cy="21" r="' + r + '" fill="none" stroke-width="6" stroke-dasharray="' + Math.max(p - .5, 0).toFixed(2) + " " + (100 - Math.max(p - .5, 0)).toFixed(2) +
        '" stroke-dashoffset="' + (25 - acum).toFixed(2) + '"><title>' + esc(c.nome + ": " + c.n) + "</title></circle>";
      acum += p;
    });
    return sv + '<text x="21" y="21.5" text-anchor="middle" class="rc-n">' + num(total, 0) + '</text><text x="21" y="26.5" text-anchor="middle" class="rc-t">Total</text></svg>';
  }

  // ---------- Período com calendário (Comportamental, Motor ocioso, Permanência, Conectividade) ----------
  // Atalhos (últimos 7 dias, últimas 4 semanas, todo o período) ou datas De/Até escolhidas no calendário.
  var PER = {};
  function perEstado(aba, padrao) { return PER[aba] || (PER[aba] = { p: padrao, padrao: padrao, de: "", ate: "" }); }
  function isoMais(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function perFaixa(st, dias) {
    var ini = dias[0], fim = dias[dias.length - 1];
    if (!ini) return { de: "", ate: "", todo: true };
    if (st.p === "custom") {
      var de = st.de || ini, ate = st.ate || fim;
      if (de > ate) { var t = de; de = ate; ate = t; }
      de = de < ini ? ini : de > fim ? fim : de; ate = ate > fim ? fim : ate < ini ? ini : ate;
      // dias que não estão na lista (sem dados): usa o dia com dados mais próximo dentro do período
      if (dias.indexOf(de) < 0) de = dias.filter(function (d) { return d >= de; })[0] || fim;
      if (dias.indexOf(ate) < 0) ate = dias.filter(function (d) { return d <= ate; }).pop() || ini;
      if (de > ate) de = ate;
      return { de: de, ate: ate, todo: de === ini && ate === fim };
    }
    if (st.p === "todo") return { de: ini, ate: fim, todo: true };
    if (st.p === "7" || st.p === "resumo") {
      // Os dados chegam sempre D-1: "Últimos 7 dias" vai de ontem (D-1) a D-7, pela data de hoje.
      // "Resumo" é a última semana fechada, de segunda a domingo (o mesmo período da mensagem semanal do WhatsApp).
      var hoje = hojeISO(), a = isoMais(hoje, -1), b = isoMais(hoje, -7);
      if (st.p === "resumo") {
        var dw = new Date(hoje + "T12:00:00").getDay(); // 0 = domingo
        a = isoMais(hoje, -(dw === 0 ? 7 : dw)); b = isoMais(a, -6);
      }
      var noP = dias.filter(function (d) { return d >= b && d <= a; });
      if (!noP.length) { var ult = dias.filter(function (d) { return d <= a; }).pop() || fim; return { de: ult, ate: ult, todo: false, semDados: true }; }
      return { de: noP[0], ate: noP[noP.length - 1], todo: noP[0] === ini && noP[noP.length - 1] === fim };
    }
    var d0 = isoMais(fim, -(+st.p) + 1);
    if (dias.indexOf(d0) < 0) d0 = dias.filter(function (d) { return d >= d0; })[0] || fim;
    return { de: d0 < ini ? ini : d0, ate: fim, todo: d0 <= ini };
  }
  function hojeISO() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function perControle(aba, st, dias, f) {
    var ops = [["7", "Últimos 7 dias"], ["resumo", "Resumo (semana do WhatsApp)"], ["28", "Últimas 4 semanas"], ["todo", "Todo o período"], ["custom", "Escolher datas"]];
    return '<label>Período<select data-per="' + aba + '" id="per-' + aba + '">' + ops.map(function (o) { return '<option value="' + o[0] + '"' + (st.p === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
      '<label>De<input type="date" data-perde="' + aba + '" id="perde-' + aba + '" value="' + f.de + '" min="' + dias[0] + '" max="' + dias[dias.length - 1] + '"></label>' +
      '<label>Até<input type="date" data-perate="' + aba + '" id="perate-' + aba + '" value="' + f.ate + '" min="' + dias[0] + '" max="' + dias[dias.length - 1] + '"></label>';
  }
  function perTexto(f) { return f.de === f.ate ? dataBR(f.de) : dataBR(f.de) + " a " + dataBR(f.ate); }

  function abaComportamento() {
    var C = D.comportamento, T = C.tipos, F = C.frotas, NT = T.length;
    var fc = fil_.comp || (fil_.comp = { frota: "", resp: "", ger: "", gest: "", lid: "" });
    // Filtros: tipo de frota, processo e gerência.
    var ids = Object.keys(F).filter(function (f) { return !fc.frota || F[f].frota === fc.frota; });
    var processos = unicos(ids.map(function (f) { return F[f].processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    ids = ids.filter(function (f) { return !fil_.processo || F[f].processo === fil_.processo; });
    var hC = hier(ids, function (f) { return F[f]; }, "c"); ids = hC.itens;

    var sel = {}; ids.forEach(function (f) { sel[f] = 1; });
    var ev = C.ev.filter(function (e) { return sel[e[2]]; });

    // Período escolhido [a0, a1] e o anterior de mesmo tamanho [b0, a0 - 1].
    var N = C.ndias, diasC = [];
    for (var di0 = 0; di0 < N; di0++) diasC.push(isoMais(C.inicio, di0));
    var stC = perEstado("comportamento", "28"), fC = perFaixa(stC, diasC);
    var a0 = diasC.indexOf(fC.de), a1 = diasC.indexOf(fC.ate), J = a1 - a0 + 1, b0 = a0 - J;
    var dia0 = new Date(C.inicio + "T12:00:00");
    function rot(i) { var d = new Date(dia0); d.setDate(d.getDate() + i); return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2); }
    var cur = [], ant = [], k;
    for (k = 0; k < NT; k++) { cur.push(0); ant.push(0); }
    var porDia = [];
    for (k = 0; k < N; k++) porDia.push(new Array(NT).fill(0));
    var porFrota = {}, noPainel = {};
    CATS.forEach(function (c) { T.forEach(function (t, i) { if ((t.grupo || t.id) === c.id) noPainel[i] = 1; }); });
    ev = ev.filter(function (e) { return noPainel[e[1]]; }); // tipos sem card (ex.: câmera obstruída) ficam fora
    // Turnos e horas (5º e 6º itens do ev), para os quadros de turno e de horas de pico.
    var ciT = T.map(function (t) { var g = t.grupo || t.id; for (var j = 0; j < CATS.length; j++) if (CATS[j].id === g) return j; return -1; });
    var hz = { cur: 0, tu: [0, 0, 0, 0], tuA: [0, 0, 0, 0], tuC: [0, 1, 2, 3].map(function () { return CATS.map(function () { return 0; }); }), tuT: [0, 1, 2, 3].map(function () { return T.map(function () { return 0; }); }), hr: [], hrC: [] };
    // Só um tipo escolhido nos cards e ele tem subtipos (ex.: Fadiga e bocejo, faixas de velocidade): os turnos mostram cada subtipo.
    var selIds = fil_.tipos ? Object.keys(fil_.tipos) : [], selCat = selIds.length === 1 ? CATS.filter(function (c) { return c.id === selIds[0]; })[0] : null;
    var subIx = selCat ? T.map(function (t, i) { return CATS[ciT[i]] === selCat ? i : -1; }).filter(function (i) { return i >= 0; }) : [];
    if (subIx.length > 1) hz.sub = subIx.map(function (i) { return { i: i, nome: T[i].nome }; });
    for (k = 0; k < 24; k++) { hz.hr.push(0); hz.hrC.push(CATS.map(function () { return 0; })); }
    // Filtro de tipo (clicando nos cards, desde 17/11/2026): os cards mostram sempre o próprio número; o resto da aba, só os tipos escolhidos.
    var tOn = T.map(function (t, i) { return ciT[i] >= 0 && (!fil_.tipos || !!fil_.tipos[CATS[ciT[i]].id]); });
    // Os quadros de turno contam todos os turnos (para dar para clicar neles); o resto da aba, só os turnos escolhidos.
    ev.forEach(function (e) {
      if (!tOn[e[1]]) return;
      var t0 = e.length > 4 ? e[4] : 3, tOk = turnoOk(e), hOk = horaOk(e);
      // Quadros de turno: todos os turnos, respeitando as horas escolhidas; barras de hora: todas as horas, respeitando os turnos.
      if (e[0] >= a0 && e[0] <= a1) {
        if (hOk) { hz.tu[t0] += e[3]; if (ciT[e[1]] >= 0) hz.tuC[t0][ciT[e[1]]] += e[3]; hz.tuT[t0][e[1]] += e[3]; }
        if (tOk && e.length > 5) { hz.hr[e[5]] += e[3]; if (ciT[e[1]] >= 0) hz.hrC[e[5]][ciT[e[1]]] += e[3]; }
      }
      else if (hOk && b0 >= 0 && e[0] >= b0 && e[0] < a0) hz.tuA[t0] += e[3];
    });
    ev = ev.filter(function (e) { return turnoOk(e) && horaOk(e); });
    var porCatF = CATS.map(function () { return {}; }); // frotas por tipo de card, para o top 5
    ev.forEach(function (e) {
      var on = tOn[e[1]];
      if (on) porDia[e[0]][e[1]] += e[3];
      if (e[0] >= a0 && e[0] <= a1) {
        cur[e[1]] += e[3];
        if (ciT[e[1]] >= 0) { var pcf = porCatF[ciT[e[1]]]; pcf[e[2]] = (pcf[e[2]] || 0) + e[3]; }
        if (!on) return;
        porFrota[e[2]] = (porFrota[e[2]] || 0) + e[3];
        hz.cur += e[3];
      }
      else if (b0 >= 0 && e[0] >= b0 && e[0] < a0) ant[e[1]] += e[3];
    });
    var temBase = b0 >= 0;
    CATS.forEach(function (c) {
      var ix = T.map(function (t, i) { return (t.grupo || t.id) === c.id ? i : -1; }).filter(function (i) { return i >= 0; });
      c.ix = ix; c.n = sum(ix, function (i) { return cur[i]; }); c.ant = temBase ? sum(ix, function (i) { return ant[i]; }) : 0;
    });
    CATS.forEach(function (c) { c.on = !fil_.tipos || !!fil_.tipos[c.id]; });
    var curF = cur.map(function (v, i) { return tOn[i] ? v : 0; });
    var total = sum(CATS, function (c) { return c.on ? c.n : 0; }), totalAnt = sum(CATS, function (c) { return c.on ? c.ant : 0; });
    var nVeic = Object.keys(porFrota).length;
    function dl(cur, ant) { return temBase ? delta(cur, ant) : '<span class="dl neutro">período todo</span>'; }

    var filtros = '<div class="filtros">' +
      '<label>Processo<select data-fil="processo" id="c-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      hC.html +
      perControle("comportamento", stC, diasC, fC) +
      // Frota (Todas/Leve/Pesada) vai para a segunda linha, para as datas caberem na primeira (17/11/2026).
      '<div class="campo"><span class="rot">Frota</span><div class="pills" role="group" aria-label="Tipo de frota">' + [["", "Todas"], ["Leve", "Leve"], ["Pesada", "Pesada"]].map(function (o) {
        return '<button type="button" data-cfrota="' + o[0] + '" aria-pressed="' + (fc.frota === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div></div>" +
      (fc.frota || fil_.processo || hierAtiva() || fil_.tipos || stC.p !== stC.padrao || !todosTurnos() || fil_.horas ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + num(nVeic, 0) + " " + plural(nVeic, "veículo", "veículos") + " com ocorrência, " + rot(a0) + " a " + rot(a1) + (temBase ? " (comparado com " + rot(b0) + " a " + rot(a0 - 1) + ")" : "") + (turnoTexto() ? ", só " + turnoTexto() + " (clique nos turnos ou nas horas para mudar; o mapa mostra todos)" : "") + (fil_.tipos ? ". Tipos: " + CATS.filter(function (c) { return c.on; }).map(function (c) { return c.nome.toLowerCase(); }).join(", ") + " (clique nos cards para mudar)" : "") + "</p></div>";

    // Top 5 veículos de cada tipo, numa gaveta embaixo de cada card (abre e fecha tudo junto; a escolha fica guardada).
    var abreTop = top5Aberto();
    function gaveta(ci) {
      var m = porCatF[ci], l = Object.keys(m).map(function (f) { return { f: f, n: m[f] }; }).sort(function (a, b) { return b.n - a.n || a.f.localeCompare(b.f); }).slice(0, 5);
      var tot = CATS[ci].n, mx = l.length ? l[0].n : 1;
      return '<div class="ktop"><h4>Top 5 veículos</h4>' + (l.length ? "<ol>" + l.map(function (x, i) {
        var v = F[x.f] || {};
        return '<li title="' + esc([x.f, v.processo, v.responsavel].filter(Boolean).join(" · ")) + '"><div class="l1"><span>' + (i + 1) + "º <b>" + esc(x.f) + "</b></span><b>" + num(x.n, 0) + (tot ? " <small>" + num(x.n / tot * 100, 0) + "%</small>" : "") + "</b></div>" +
          '<span class="pr">' + esc(v.processo || "") + '</span><div class="bb"><i style="width:' + (x.n / mx * 100).toFixed(1) + '%"></i></div></li>';
      }).join("") + "</ol>" : '<p class="vz">Sem registros no período.</p>') + "</div>";
    }
    var barTop = '<div class="top5-bar"><button type="button" data-top5="1" aria-expanded="' + abreTop + '">' + (abreTop ? "Minimizar top 5 veículos" : "Maximizar top 5 veículos") + "</button></div>";
    var kpis = barTop + '<div class="kpis' + (abreTop ? " com-top" : "") + '">' +
      CATS.map(function (c, ci) {
        // Cards com mais de um tipo (ex.: fadiga e bocejo) mostram a quantidade de cada um.
        // Detalhe (ex.: Bocejo · Fadiga) numa linha só; os outros cards têm a mesma linha vazia, para tudo ficar alinhado.
        var partes = '<span class="kp">' + (c.ix.length > 1 && c.id !== "vel" ? c.ix.map(function (i) { return esc(T[i].nome) + " <b>" + num(cur[i], 0) + "</b>"; }).join(" · ") : "&nbsp;") + "</span>";
        var cab = '<div class="kh">' + ico(c.icone) + '<span class="kl">' + esc(c.nome) + '</span></div><strong class="kv">' + num(c.n, 0) + "</strong>" + partes + dl(c.n, c.ant) + '<span class="ks">' + (temBase ? "vs. período anterior" : "&nbsp;") + "</span>";
        // Com o top 5 aberto, o topo do card vira um bloco só, para as gavetas começarem na mesma altura.
        var esc0 = !!fil_.tipos, marc = c.on;
        return '<article class="kpi c-' + c.id + (esc0 ? (marc ? " sel" : " fora") : "") + '" data-tipo="' + c.id + '" role="button" tabindex="0" aria-pressed="' + (esc0 && marc) + '" title="' + (esc0 && marc ? "Clique para tirar " + esc(c.nome.toLowerCase()) + " do filtro" : esc0 ? "Clique para somar " + esc(c.nome.toLowerCase()) + " ao filtro" : "Clique para ver só " + esc(c.nome.toLowerCase())) + '">' + (abreTop ? '<div class="khd">' + cab + "</div>" + gaveta(ci) : cab) + "</article>";
      }).join("") + "</div>";

    // Evolução: por dia até 14 dias, senão por semana.
    var dados = [];
    if (J <= 14) {
      for (k = a0; k <= a1; k++) dados.push({ d: rot(k), partes: CATS.map(function (c) { return sum(c.ix, function (i) { return porDia[k][i]; }); }) });
    } else {
      for (var s = a0; s <= a1; s += 7) {
        var e2 = Math.min(s + 7, a1 + 1), partes = CATS.map(function (c) { var t = 0; for (var q = s; q < e2; q++) t += sum(c.ix, function (i) { return porDia[q][i]; }); return t; });
        dados.push({ d: rot(s), partes: partes });
      }
      if (dados.length > 14) { // muitas semanas: agrupa de duas em duas
        var d2 = []; for (k = 0; k < dados.length; k += 2) { var b = dados[k + 1]; d2.push({ d: dados[k].d, partes: dados[k].partes.map(function (v, i) { return v + (b ? b.partes[i] : 0); }) }); } dados = d2;
      }
    }
    dados.forEach(function (x) { x.total = sum(x.partes, function (v) { return v; }); });
    var leg = CATS.map(function (c) { return '<li><i class="c-' + c.id + '"></i>' + esc(c.nome) + "</li>"; }).join("");
    var evolucao = '<section class="card"><h3>Evolução das ocorrências</h3><p class="cs">' + (J <= 14 ? "Por dia." : "Por semana, a partir da data indicada.") + '</p><ul class="legend">' + leg + "</ul>" + empilhado(dados, false, 1300) + "</section>";

    var ord = CATS.filter(function (c) { return c.on; }).sort(function (a, b) { return b.n - a.n; });
    var part = '<section class="card"><h3>Participação por tipo</h3><div class="rosca-w">' + rosca(ord, total) + '<ul class="rleg">' + ord.map(function (c) {
      return '<li><i class="c-' + c.id + '"></i><span>' + esc(c.nome) + "</span><b>" + (total ? num(c.n / total * 100, 1) : "0,0") + "%</b></li>";
    }).join("") + "</ul></div></section>";

    // Tendência mensal (desde 17/11/2026; antes semanal): total por mês, do início dos dados até o fim do período escolhido (no máximo 12 meses).
    var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"], sem = [], mesAtual = null;
    for (k = 0; k <= a1; k++) {
      var dk = new Date(dia0); dk.setDate(dk.getDate() + k);
      var chM = dk.getFullYear() * 12 + dk.getMonth();
      if (!mesAtual || mesAtual.ch !== chM) { mesAtual = { ch: chM, d: MESES[dk.getMonth()] + "/" + String(dk.getFullYear()).slice(2), partes: [], total: 0 }; sem.push(mesAtual); }
      mesAtual.total += sum(porDia[k], function (v) { return v; });
    }
    sem = sem.slice(-12);
    var dFim = new Date(dia0); dFim.setDate(dFim.getDate() + a1);
    var fimMes = new Date(dFim.getFullYear(), dFim.getMonth() + 1, 0).getDate() === dFim.getDate();
    var tend = '<section class="card"><h3>Tendência mensal</h3><p class="cs">Total por mês' + (sem.length ? ", de " + sem[0].d + " a " + sem[sem.length - 1].d : "") + "." + (fimMes ? "" : " O último mês vai até " + rot(a1) + " (parcial).") + "</p>" + empilhado(sem, true, 520) + "</section>";

    var velC = CATS[0], velIx = velC.ix, velN = velC.on ? velC.n : 0, mxV = Math.max.apply(null, [1].concat(velIx.map(function (i) { return curF[i]; })));
    var velCard = '<section class="card"><h3>Excesso de velocidade por faixa</h3><p class="cs">Faixas da nova política de frotas, pelo quanto passou do limite da via. ' + (velC.on ? num(velN, 0) + " " + plural(velN, "ocorrência", "ocorrências") + " no período." : "Fora do filtro de tipo.") + "</p>" + velIx.map(function (i, kk) {
      return '<div class="li"><span class="t">' + esc(T[i].nome) + '</span><span class="n">' + num(curF[i], 0) + "<small>" + (velN ? num(curF[i] / velN * 100, 0) + "%" : "") + '</small></span><div class="bb"><div class="ff v' + (kk + 1) + '" style="width:' + (curF[i] / mxV * 100).toFixed(1) + "%;--i:" + kk + '"></div></div></div>';
    }).join("") + "</section>";

    // Onde se concentram: por processo; com processo escolhido, por veículo.
    var porVeic = !!fil_.processo, mapa = {};
    Object.keys(porFrota).forEach(function (f) {
      var chave = porVeic ? f : F[f].processo, m = mapa[chave] || (mapa[chave] = { n: 0, v: {} });
      m.n += porFrota[f]; m.v[f] = 1;
    });
    var lista = Object.keys(mapa).map(function (kx) { return { nome: kx, n: mapa[kx].n, nv: Object.keys(mapa[kx].v).length }; }).sort(function (a, b) { return b.n - a.n; });
    var mx = Math.max.apply(null, [1].concat(lista.map(function (x) { return x.n; })));
    var conc = '<section class="card"><h3>Onde se concentram</h3><p class="cs">' + (porVeic ? "Por veículo do processo." : "Por processo. Clique para filtrar.") + '</p><div class="rolagem">' + lista.map(function (x, kk) {
      var sub = porVeic ? esc([F[x.nome].placa, F[x.nome].grupo].filter(Boolean).join(" · ")) : x.nv + " " + plural(x.nv, "veículo", "veículos") + " · " + num(x.n / x.nv, 1) + " por veículo";
      var corpo = '<span class="t">' + esc(x.nome) + "<small>" + sub + '</small></span><span class="n">' + num(x.n, 0) + "<small>" + (total ? num(x.n / total * 100, 0) + "%" : "") + '</small></span><div class="bb"><div class="ff" style="width:' + (x.n / mx * 100).toFixed(1) + "%;--i:" + kk + '"></div></div>';
      return porVeic ? '<div class="li">' + corpo + "</div>" : '<button type="button" class="li lib" data-set="processo:' + esc(x.nome) + '">' + corpo + "</button>";
    }).join("") + "</div></section>";

    var com = temBase ? CATS.filter(function (c) { return c.on && variacao(c.n, c.ant) !== null && (c.n + c.ant) >= 10; }) : [];
    var sobe = com.slice().sort(function (a, b) { return variacao(b.n, b.ant) - variacao(a.n, a.ant); })[0];
    var desce = com.slice().sort(function (a, b) { return variacao(a.n, a.ant) - variacao(b.n, b.ant); })[0];
    var alertas = [];
    if (total) alertas.push(["ruim", "!", "<b>" + esc(ord[0].nome) + "</b> é o tipo mais frequente, com " + num(ord[0].n / total * 100, 0) + "% das ocorrências."]);
    if (lista.length > 1 && total) alertas.push(["atencao", "▲", "<b>" + esc(lista[0].nome) + "</b> concentra " + num(lista[0].n / total * 100, 0) + "% das ocorrências."]);
    if (velN && curF[velIx[2]]) alertas.push(["ruim", "!", "<b>" + num(curF[velIx[2]], 0) + "</b> " + plural(curF[velIx[2]], "excesso", "excessos") + " de velocidade acima de 50% do limite."]);
    if (sobe && variacao(sobe.n, sobe.ant) > 0) alertas.push(["atencao", "↑", "Aumento de <b>" + esc(sobe.nome.toLowerCase()) + "</b> (+" + num(variacao(sobe.n, sobe.ant), 0) + "%) vs. período anterior."]);
    if (desce && variacao(desce.n, desce.ant) < 0) alertas.push(["bom", "↓", "Redução de <b>" + num(-variacao(desce.n, desce.ant), 0) + "%</b> em " + esc(desce.nome.toLowerCase()) + " vs. período anterior."]);
    if (!alertas.length) alertas.push(["bom", "✓", "Nenhuma ocorrência para esse filtro."]);
    var alerta = '<section class="card"><h3>Principais alertas</h3><ul class="alertas">' + alertas.slice(0, 4).map(function (a) {
      return '<li><span class="ai ' + a[0] + '" aria-hidden="true">' + a[1] + "</span><span>" + a[2] + "</span></li>";
    }).join("") + "</ul></section>";

    var horario = blocosHorario(hz, rot(a0) + " – " + rot(a1), "do período", temBase ? "variação sobre " + rot(b0) + " – " + rot(a0 - 1) : "");
    // Turnos e horas de pico logo abaixo dos cards de ocorrências (pedido em 16/11/2026).
    // Evolução das ocorrências num bloco só, largura toda, logo abaixo de turnos/horas de pico (pedido em 17/11/2026).
    // Divergências ocorrências × tratativas (23/11/2026): só para jeffersonmelo e giovannatulio (flag dv).
    var DV = C.diverg, divHtml = "", dBr = function (x) { return x.slice(8, 10) + "/" + x.slice(5, 7) + "/" + x.slice(0, 4); };
    if (window.painelDv && DV && (DV.ocSemTrat.length || DV.tratSemOc.length)) {
      var NTD = { celular: "Uso de celular", cinto: "Sem cinto", cigarro: "Uso de cigarro", faixa: "Ultrapassagem em faixa contínua", distracao: "Distração" };
      var lin = DV.ocSemTrat.map(function (x) { return [x, "Na planilha de ocorrências, sem tratativa"]; })
        .concat(DV.tratSemOc.map(function (x) { return [x, "Tratativa sem ocorrência equivalente"]; }))
        .sort(function (a, b) { return a[0].d < b[0].d ? 1 : a[0].d > b[0].d ? -1 : 0; });
      divHtml = '<details class="card diverg"' + (DV.ocSemTrat.length ? " open" : "") + '><summary><span class="dv-ic" aria-hidden="true">!</span> <b>' + lin.length + " " + plural(lin.length, "divergência", "divergências") +
        "</b> entre ocorrências e tratativas" + (DV.ocSemTrat.length ? " · " + DV.ocSemTrat.length + " sem tratativa" : "") + '</summary><p class="cs">Desde ' + dBr(DV.ini) +
        ". Celular, sem cinto, cigarro e ultrapassagem que estão na planilha de ocorrências sem tratativa, e tratativas sem ocorrência equivalente (mesma frota e tipo, até 1 dia de diferença). Visível só para Jefferson e Giovanna.</p>" +
        '<table class="tb"><thead><tr><th scope="col">Frota</th><th scope="col">Data</th><th scope="col">Hora</th><th scope="col">Tipo</th><th scope="col">Situação</th></tr></thead><tbody>' +
        lin.map(function (x) { var o = x[0]; return '<tr><th scope="row">' + esc(o.f) + "</th><td>" + dBr(o.d) + "</td><td>" + esc(o.h || "") + "</td><td>" + esc(NTD[o.t] || o.t) + '</td><td class="' + (x[1].indexOf("sem tratativa") >= 0 ? "dv-oc" : "dv-tr") + '">' + x[1] + "</td></tr>"; }).join("") + "</tbody></table></details>";
    }
    return filtros + divHtml + kpis + (horario ? '<div class="rz-dash comp-hz">' + horario + "</div>" : "") +
      '<div class="evo-larga">' + evolucao + '</div><div class="g3 g-a2">' + part + tend + '</div><div class="g3 g-b">' + velCard + conc + alerta + "</div>" + mapaComp(C, fc, a0, a1);
  }

  // ---------- Comportamental: mapa de calor por tipo de ocorrência (sem bocejo) ----------
  var moSel = null; // período clicado no gráfico de motor ocioso (filtra o Top 5)
  var cm = { tipo: "", mapa: null, base: "ruas", pontos: [], locs: [], marcas: [] };
  function mapaComp(C, fc, a0, a1) {
    var M = C.mapa; if (!M || !M.pts || !M.pts.length) return "";
    var T = C.tipos, iBoc = T.map(function (t) { return t.id; }).indexOf("bocejo");
    var cats = CATS.map(function (c) {
      var ix = T.map(function (t, i) { return (t.grupo || t.id) === c.id && i !== iBoc ? i : -1; }).filter(function (i) { return i >= 0; });
      return { id: c.id, nome: c.id === "fadiga" ? "Fadiga" : c.nome, ix: ix };
    }).filter(function (c) { return c.ix.length; });
    if (cm.tipo && !cats.some(function (c) { return c.id === cm.tipo; })) cm.tipo = "";
    // Os pontos do mapa vêm por semana (dias 0–6, 7–13...): entra a semana que toca o período.
    var semOk = function (w) { return w * 7 <= a1 && w * 7 + 6 >= a0; }, aprox = a0 % 7 !== 0 || (a1 + 1) % 7 !== 0;
    var gOk = M.grupos.map(function (g) { return (!fc.frota || g[0] === fc.frota) && (!fil_.processo || g[1] === fil_.processo) && (!fil_.h || ((!fil_.h.resp || g[2] === fil_.h.resp) && (!fil_.h.ger || g[3] === fil_.h.ger) && (!fil_.h.gest || g[4] === fil_.h.gest) && (!fil_.h.lid || g[5] === fil_.h.lid))); });
    var porTipo = {}, tOk = {};
    // Filtro de tipo dos cards também vale no mapa.
    var catOn = function (id) { return !fil_.tipos || !!fil_.tipos[id === "fadiga" ? "fadiga" : id]; };
    if (cm.tipo && !catOn(cm.tipo)) cm.tipo = "";
    cats.forEach(function (c) { c.n = 0; c.ix.forEach(function (i) { porTipo[i] = c; if (catOn(c.id) && (!cm.tipo || cm.tipo === c.id)) tOk[i] = 1; }); });
    var cel = {}, loc = {}, total = 0;
    M.pts.forEach(function (e) {
      if (!semOk(e[0]) || !gOk[e[2]] || !porTipo[e[1]]) return;
      porTipo[e[1]].n += e[6];
      if (!tOk[e[1]]) return;
      total += e[6];
      var k = e[3] + "," + e[4]; cel[k] = (cel[k] || 0) + e[6];
      var l = loc[e[5]] || (loc[e[5]] = { i: e[5], n: 0, la: 0, lo: 0, t: {} });
      l.n += e[6]; l.la += e[3] * e[6]; l.lo += e[4] * e[6]; l.t[e[1]] = (l.t[e[1]] || 0) + e[6];
    });
    cm.pontos = Object.keys(cel).map(function (k) { var p = k.split(","); return [p[0] * M.cel, p[1] * M.cel, cel[k]]; });
    cm.locs = Object.keys(loc).map(function (k) { var l = loc[k]; return { nome: M.locais[l.i], n: l.n, lat: l.la / l.n * M.cel, lon: l.lo / l.n * M.cel, t: l.t }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 10);
    var todos = sum(cats, function (c) { return c.n; });
    var pills = '<div class="pills mc-tipos" role="group" aria-label="Tipo de ocorrência no mapa"><button type="button" data-mtipo="" aria-pressed="' + !cm.tipo + '">Todos <small>' + num(todos, 0) + "</small></button>" +
      cats.map(function (c) { return '<button type="button" class="c-' + c.id + '" data-mtipo="' + c.id + '" aria-pressed="' + (cm.tipo === c.id) + '"' + (c.n ? "" : " disabled") + '><i></i>' + esc(c.nome) + " <small>" + num(c.n, 0) + "</small></button>"; }).join("") + "</div>";
    var mx = Math.max.apply(null, [1].concat(cm.locs.map(function (x) { return x.n; })));
    var ranking = '<section class="card"><h3>Locais com maior incidência</h3><p class="cs">' + (cm.tipo ? esc(cats.filter(function (c) { return c.id === cm.tipo; })[0].nome) : "Todos os tipos, sem bocejo") + ". Clique para ver no mapa.</p>" +
      (cm.locs.length ? '<div class="rolagem alta">' + cm.locs.map(function (x, k) {
        var tp = Object.keys(x.t).sort(function (a, b) { return x.t[b] - x.t[a]; })[0], tn = T[tp] ? (porTipo[tp] ? porTipo[tp].nome : T[tp].nome) : "";
        return '<button type="button" class="li lib" data-cloc="' + k + '"><span class="t">' + (k + 1) + ". " + esc(x.nome) + "<small>" + (cm.tipo ? "" : "mais comum: " + esc(tn.toLowerCase())) + '</small></span><span class="n">' + num(x.n, 0) + "<small>" + (total ? num(x.n / total * 100, 0) + "%" : "") + '</small></span><div class="bb"><div class="ff" style="width:' + (x.n / mx * 100).toFixed(1) + "%;--i:" + k + '"></div></div></button>';
      }).join("") + "</div>" : '<p class="cs">Nenhuma ocorrência com local para esse filtro.</p>') + "</section>";
    return '<section class="sec mc"><h2>Mapa de calor das ocorrências</h2><p class="sub">Onde as ocorrências acontecem, no período e nos filtros escolhidos acima. Escolha um tipo para ver os locais com maior incidência. Bocejo fica de fora.' + (aprox ? " O mapa conta semanas inteiras, então pode incluir alguns dias antes ou depois do período." : "") + "</p>" + pills +
      '<div class="mapa-g"><section class="card mapa-card"><div id="mapa-comp" class="mapa" role="region" aria-label="Mapa de calor das ocorrências comportamentais"><p class="mapa-msg">Carregando mapa…</p></div>' +
      '<p class="mapa-leg"><span>Menos</span><i class="esc"></i><span>Mais ocorrências</span></p></section><div class="mapa-lado">' + ranking + "</div></div></section>";
  }
  function montarMapaComp() {
    var el = document.getElementById("mapa-comp"); if (!el) return;
    var L = window.L;
    if (!L || !L.map) {
      var t = (montarMapaComp.t = (montarMapaComp.t || 0) + 1);
      if (t > 60) { el.innerHTML = '<p class="mapa-msg">Não foi possível carregar o mapa. Verifique a internet e atualize a página.</p>'; return; }
      return setTimeout(montarMapaComp, 150);
    }
    montarMapaComp.t = 0;
    if (cm.mapa) { cm.mapa.remove(); cm.mapa = null; }
    el.innerHTML = "";
    var mapa = cm.mapa = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    var ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" });
    var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagens &copy; Esri" });
    (cm.base === "sat" ? sat : ruas).addTo(mapa);
    L.control.layers({ "Mapa": ruas, "Satélite": sat }, null, { position: "topright" }).addTo(mapa);
    mapa.on("baselayerchange", function (e) { cm.base = e.layer === sat ? "sat" : "ruas"; });
    mapa.on("focus", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("blur", function () { mapa.scrollWheelZoom.disable(); });
    if (cm.pontos.length) camadaCalor(L, cm.pontos, 12).addTo(mapa);
    var mx = Math.max.apply(null, [1].concat(cm.locs.map(function (x) { return x.n; })));
    cm.marcas = cm.locs.map(function (x, k) {
      return L.circleMarker([x.lat, x.lon], { radius: 5 + Math.sqrt(x.n / mx) * 9, color: "#16251E", weight: 1.5, fillColor: "#FFFFFF", fillOpacity: .85 })
        .bindPopup("<b>" + (k + 1) + ". " + esc(x.nome) + "</b><br>" + num(x.n, 0) + " " + plural(x.n, "ocorrência", "ocorrências"))
        .bindTooltip(esc(x.nome), { direction: "top", offset: [0, -6] }).addTo(mapa);
    });
    if (cm.pontos.length) mapa.fitBounds(L.latLngBounds(cm.pontos.map(function (p) { return [p[0], p[1]]; })).pad(.1), { maxZoom: 13 });
    else mapa.setView([-18.6, -48.6], 9);
  }

  // ---------- Motor ocioso (dados reais do Power BI "Ociosidade Frota Leve") ----------
  function horas(h) { return h >= 100 ? num(h, 0) + " h" : num(h, 1).replace(",0", "") + " h"; }
  var om = { dia: "" };
  function abaOcioso() {
    var m = D.motorOcioso, meta = m.metaPct, V = m.veiculos;
    // Dia: só os dias com dados que têm a coluna dia a dia (ultDias).
    var U = m.ultDias || [], diasOp = (m.diasIncluidos || []).filter(function (d) { return U.indexOf(d) >= 0; }).sort();
    var stO = perEstado("motor-ocioso", "todo"), fO = diasOp.length ? perFaixa(stO, diasOp) : { todo: true };
    var kds = fO.todo ? null : U.map(function (d, i) { return d >= fO.de && d <= fO.ate ? i : -1; }).filter(function (i) { return i >= 0; });
    var somaD = function (arr) { return sum(kds, function (q) { return (arr || [])[q] || 0; }); };
    var processos = unicos(V.map(function (v) { return v.processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    var doProc = V.filter(function (v) { return !fil_.processo || v.processo === fil_.processo; });
    var hO = hier(doProc, function (v) { return v; }, "o"), vs = hO.itens;
    var tot = function (a) { return sum(a, function (x) { return x; }); };
    var rows = vs.map(function (v) {
      var li = kds ? somaD(v.dl) : tot(v.ligado), oc = kds ? somaD(v.do) : tot(v.ocioso);
      return { v: v, li: li, oc: oc, pct: li ? oc / li * 100 : 0 };
    }).filter(function (r) { return !kds || r.li > 0; });
    var li = sum(rows, function (r) { return r.li; }), oc = sum(rows, function (r) { return r.oc; }), pct = li ? oc / li * 100 : 0;
    var porSem = m.semanas.map(function (_, k) {
      var a = sum(vs, function (v) { return v.ligado[k]; }), b = sum(vs, function (v) { return v.ocioso[k]; });
      return a ? b / a * 100 : 0;
    });
    var acima = rows.filter(function (r) { return r.pct > meta; }).sort(function (a, b) { return b.pct - a.pct; });
    // Ativos e inativos (ferramentas/frotas_ativas.json, marcado no gerar_acesso.py), em qualquer período (22/11/2026).
    var nIna = rows.filter(function (r) { return r.v.inativa; }).length, nAtv = rows.length - nIna;

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="o-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      hO.html +
      (diasOp.length ? perControle("motor-ocioso", stO, diasOp, fO) : "") +
      (fil_.processo || hierAtiva() || stO.p !== stO.padrao ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + rows.length + " " + plural(rows.length, "veículo leve", "veículos leves") + " (" + nAtv + " " + plural(nAtv, "ativo", "ativos") + ", " + nIna + " " + plural(nIna, "inativo", "inativos") + "), " + (kds ? (fO.de === fO.ate ? "em " : "de ") + perTexto(fO) : esc(m.periodo)) + "</p></div>";

    // Resumo do período: saiu do topo e foi para os Insights (20/11/2026).
    var insResumo = '<li><span class="mo-ii">%</span><span>' + (kds ? (fO.de === fO.ate ? "Em " : "De ") + perTexto(fO) + ", os" : "Os") + " veículos ficaram <b>" + num(pct, 1) + "%</b> do tempo de motor ligado parados, <b>" + horas(oc) + "</b> de " + horas(li) + ".</span></li>" +
      '<li><span class="mo-ii">' + (acima.length ? "⚑" : "✓") + "</span><span>" + (acima.length ? "<b>" + acima.length + "</b> " + plural(acima.length, "veículo passou", "veículos passaram") + " da meta de " + meta + "%, e o <b>" + esc(acima[0].v.id) + "</b> tem o maior percentual, " + num(acima[0].pct, 1) + "% (" + horas(acima[0].oc) + " ociosas de " + horas(acima[0].li) + ")."
                    : "Todos os veículos estão dentro da meta de " + meta + "%.") + "</span></li>";

    function quadro(lista, chave, clicavel) {
      var maxP = Math.max.apply(null, [meta].concat(lista.map(function (r) { return r.pct; }))) * 1.12, mkPos = (meta / maxP * 100).toFixed(1);
      var cab = '<div class="row hd"><div></div><div class="plot"><span class="mkl" style="left:' + mkPos + '%">meta ' + meta + '%</span></div><div></div></div>';
      return '<div class="board">' + cab + lista.map(function (r, i) {
        var over = r.pct > meta;
        var corpo = '<div class="who">' + r.quem + '</div><div class="plot"><div class="bar solo' + (over ? " over" : "") + '" style="width:' + (r.pct / maxP * 100).toFixed(1) + "%;--i:" + i + '"></div><i class="mk" style="left:' + mkPos + '%"></i></div>' +
          '<div class="res"><strong class="' + (over ? "n-critico" : "n-bom") + '">' + num(r.pct, 1) + "%</strong><small>" + horas(r.oc) + " de " + horas(r.li) + "</small></div>";
        return clicavel ? '<button type="button" class="row rowbtn" style="--i:' + i + '" data-set="' + chave + ":" + esc(r.nome) + '">' + corpo + "</button>"
                        : '<div class="row" style="--i:' + i + '">' + corpo + "</div>";
      }).join("") + "</div>";
    }

    var secoes = "";
    if (processos.length > 1) {
      // O gráfico de processos fica sempre com todos (respeitando gerente/coordenador/…); o escolhido fica marcado (20/11/2026).
      var mp = {};
      hier(V, function (v) { return v; }, "o").itens.map(function (v) {
        var li = kds ? somaD(v.dl) : tot(v.ligado), oc = kds ? somaD(v.do) : tot(v.ocioso);
        return { v: v, li: li, oc: oc };
      }).filter(function (r) { return !kds || r.li > 0; }).forEach(function (r) { var x = mp[r.v.processo] || (mp[r.v.processo] = { li: 0, oc: 0, n: 0 }); x.li += r.li; x.oc += r.oc; x.n++; });
      var lp = Object.keys(mp).map(function (k) { var x = mp[k]; return { nome: k, li: x.li, oc: x.oc, n: x.n, pct: x.li ? x.oc / x.li * 100 : 0, quem: "<b>" + esc(k) + "</b><span>" + x.n + " " + plural(x.n, "veículo", "veículos") + "</span>" }; })
        .sort(function (a, b) { return b.pct - a.pct; });
      // Em colunas, no estilo do gráfico de evolução (20/11/2026).
      var colP = (function () {
        var n = lp.length, W = Math.max(720, n * 96), H = 330, pl = 46, pr = 12, pt = 30, pb = 74, iw = W - pl - pr, ih = H - pt - pb, bw = iw / n;
        var mxP = Math.max(meta * 1.25, Math.max.apply(null, lp.map(function (x) { return x.pct; })) * 1.15), pP = mxP > 40 ? 10 : 5, topo = Math.ceil(mxP / pP) * pP;
        var sv = '<svg viewBox="0 0 ' + W + " " + H + '" class="mo-combo mo-proc" role="img" aria-label="% de motor ocioso por processo">';
        for (var g = 0; g <= topo; g += pP) { var y = pt + ih - g / topo * ih; sv += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (pl - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + g + "%</text>"; }
        lp.forEach(function (x, i) {
          var bh = x.pct / topo * ih, cx = pl + i * bw + bw / 2, over = x.pct > meta;
          var pal = String(x.nome).split(/\s+/).map(function (w) { return /^(SESMT|CCT|TI|RH)$/.test(w) ? w : w.toLowerCase(); }), lin = [], cur = "";
          pal.forEach(function (w) { if (cur && (cur + " " + w).length > 14) { lin.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }); if (cur) lin.push(cur);
          lin = lin.slice(0, 3);
          sv += '<g class="mo-col' + (fil_.processo ? (fil_.processo === x.nome ? " sel" : " fora") : "") + '" data-set="processo:' + esc(x.nome) + '" role="button" tabindex="0" aria-pressed="' + (fil_.processo === x.nome) + '"><rect x="' + (pl + i * bw).toFixed(1) + '" y="' + pt + '" width="' + bw.toFixed(1) + '" height="' + (H - pt) + '" class="mo-hit" fill="#000" fill-opacity="0"/>' +
            '<rect x="' + (cx - bw * .3).toFixed(1) + '" y="' + (pt + ih - bh).toFixed(1) + '" width="' + (bw * .6).toFixed(1) + '" height="' + Math.max(bh, 1).toFixed(1) + '" rx="3" class="mo-bar' + (over ? " acima" : "") + '"><title>' + esc(x.nome) + ": " + num(x.pct, 1) + "% · " + horas(x.oc) + " ociosas de " + horas(x.li) + " de ignição · " + x.n + " " + plural(x.n, "veículo", "veículos") + " · clique para ver os veículos</title></rect>" +
            '<text x="' + cx.toFixed(1) + '" y="' + (pt + ih - bh - 8).toFixed(1) + '" text-anchor="middle" class="mo-bl' + (over ? " acima" : "") + '">' + num(x.pct, 1) + "%</text>" +
            lin.map(function (t, j) { return '<text x="' + cx.toFixed(1) + '" y="' + (pt + ih + 16 + j * 13) + '" text-anchor="middle" class="ax mo-pn">' + esc(t) + "</text>"; }).join("") +
            '<text x="' + cx.toFixed(1) + '" y="' + (pt + ih + 18 + lin.length * 13) + '" text-anchor="middle" class="ax">' + x.n + " " + plural(x.n, "veíc.", "veíc.") + "</text></g>";
        });
        var ym = pt + ih - meta / topo * ih;
        sv += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + ym + '" y2="' + ym + '" class="mo-meta"/><text x="' + (W - pr - 4) + '" y="' + (ym - 6) + '" text-anchor="end" class="mo-metat">meta ' + meta + "%</text>";
        return sv + "</svg>";
      })();
      secoes += '<section class="sec"><h2>Processos do mais ocioso ao menos</h2><section class="card mo-card">' + colP + '<p class="mo-nota">Cada coluna é o % do tempo de motor ligado em que os veículos do processo ficaram parados (vermelho acima da meta de ' + meta + '%). Passe o mouse para ver as horas; clique em um processo para filtrar a aba por ele e de novo para tirar.</p></section></section>';
    }
    var lv = rows.map(function (r) { r.quem = "<b>" + esc(r.v.id) + "</b><span>" + esc([r.v.placa, fil_.processo ? r.v.responsavel : r.v.processo].filter(Boolean).join(" · ")) + "</span>"; return r; })
      .sort(function (a, b) { return b.pct - a.pct; });
    var limite = fil_.processo || hierAtiva() ? lv.length : 15;
    secoes += '<section class="sec"><h2>' + (limite < lv.length ? "Os " + limite + " veículos mais ociosos" : "Veículos do mais ocioso ao menos") + "</h2>" +
      '<p class="sub">Horas de motor ligado parado ' + (kds && fO.de === fO.ate ? "no dia" : "no período") + "." + (limite < lv.length ? " Escolha um processo para ver todos os veículos dele." : "") + "</p>" + quadro(lv.slice(0, limite)) + "</section>";

    // Com datas escolhidas (até 31 dias), o gráfico mostra o período dia a dia; com 1 dia, os 7 dias até ele.
    var graf;
    if (kds && kds.length && kds.length <= 31) {
      var ks = kds.length === 1 ? [] : kds.slice();
      if (kds.length === 1) for (var q = Math.max(0, kds[0] - 6); q <= kds[0]; q++) ks.push(q);
      graf = dias(ks.map(function (q) { var a = sum(vs, function (v) { return (v.dl || [])[q] || 0; }), b = sum(vs, function (v) { return (v.do || [])[q] || 0; }); return a ? b / a * 100 : 0; }),
        "%", meta, "Motor ocioso por dia" + (kds.length === 1 ? " até " + dd(U[kds[0]]) : "") + " (linha tracejada: meta de " + meta + "%)", ks.map(function (q) { return dd(U[q]); }));
    } else graf = dias(porSem, "%", meta, "Motor ocioso por semana (linha tracejada: meta de " + meta + "%)", m.semanas);
    // Painel no estilo do modelo enviado (20/11/2026): evolução (horas + %), top 5, por processo, insights e ações.
    var serie = [];
    if (kds && kds.length && kds.length <= 31) {
      var ks2 = kds.length === 1 ? [] : kds.slice();
      if (kds.length === 1) for (var q2 = Math.max(0, kds[0] - 6); q2 <= kds[0]; q2++) ks2.push(q2);
      if (ks2.length > 14) {
        // Períodos longos (ex.: "Últimas 4 semanas"): uma barra por semana de 7 dias, contando para trás a partir do último dia (20/11/2026).
        var fimMs = new Date(fO.ate + "T12:00:00").getTime(), blocos = [];
        ks2.forEach(function (q) { var j = Math.floor(Math.round((fimMs - new Date(U[q] + "T12:00:00").getTime()) / 864e5) / 7); (blocos[j] = blocos[j] || []).push(q); });
        serie = blocos.filter(Boolean).reverse().map(function (qs) {
          var so = function (arr) { return sum(qs, function (q) { return (arr || [])[q] || 0; }); };
          var a = sum(vs, function (v) { return so(v.dl); }), b = sum(vs, function (v) { return so(v.do); });
          return { r: dd(U[qs[0]]) + " a " + dd(U[qs[qs.length - 1]]), h: b, l: a, p: a ? b / a * 100 : 0, parcial: false, vo: function (v) { return so(v.do); }, vl: function (v) { return so(v.dl); } };
        });
      } else
      serie = ks2.map(function (q) { var a = sum(vs, function (v) { return (v.dl || [])[q] || 0; }), b = sum(vs, function (v) { return (v.do || [])[q] || 0; }); return { r: dd(U[q]), h: b, l: a, p: a ? b / a * 100 : 0, vo: function (v) { return (v.do || [])[q] || 0; }, vl: function (v) { return (v.dl || [])[q] || 0; } }; });
    } else {
      // Semana incompleta (a última, se os dados ainda não chegaram ao domingo) fica marcada com * e fora da comparação.
      var ultDia = (m.diasIncluidos || []).slice().sort().pop() || "", i0s = new Date((m.inicioSemana || "2026-01-01") + "T00:00:00");
      serie = m.semanas.map(function (w, k) {
        var a = sum(vs, function (v) { return v.ligado[k]; }), b = sum(vs, function (v) { return v.ocioso[k]; });
        var fimS = new Date(i0s); fimS.setDate(fimS.getDate() + 7 * k + 6);
        var fimTxt = fimS.getFullYear() + "-" + ("0" + (fimS.getMonth() + 1)).slice(-2) + "-" + ("0" + fimS.getDate()).slice(-2);
        var parc = !!ultDia && fimTxt > ultDia;
        return { r: w + (parc ? "*" : ""), faixa: w + " a " + dd(parc ? ultDia : fimTxt), h: b, l: a, p: a ? b / a * 100 : 0, parcial: parc, vo: function (v) { return v.ocioso[k] || 0; }, vl: function (v) { return v.ligado[k] || 0; } };
      }).slice(-12);
    }
    var LH = m.consumoLh || 0.66, PRECO = m.precoLitro || 4; // etanol, média da região de Minas (informada em 20/11/2026)
    // Clique numa barra: o Top 5 passa a mostrar as frotas mais ociosas daquele dia/semana (20/11/2026).
    var xSel = serie.filter(function (x) { return x.r === moSel; })[0] || null; if (!xSel) moSel = null;
    var baseTop = xSel ? rows.map(function (r) { var o = xSel.vo(r.v), l = xSel.vl(r.v); return { v: r.v, oc: o, li: l, pct: l ? o / l * 100 : 0 }; }).filter(function (r) { return r.oc > 0; }) : rows;
    var top5 = baseTop.slice().sort(function (a, b) { return b.oc - a.oc; }).slice(0, 5), mxT = top5.length ? top5[0].oc : 1;
    var mpP = {}; rows.forEach(function (r) { mpP[r.v.processo || "Sem processo"] = (mpP[r.v.processo || "Sem processo"] || 0) + r.oc; });
    var lpP = Object.keys(mpP).map(function (k) { return { nome: k, h: mpP[k] }; }).sort(function (a, b) { return b.h - a.h; });
    var donut = lpP.slice(0, 3); if (lpP.length > 3) donut.push({ nome: "Outros", h: sum(lpP.slice(3), function (x) { return x.h; }) });
    var CORD = ["#1F5E35", "#3E9B4F", "#7CC56B", "#B9DDA9"];
    // Comparação: último ponto da série contra o anterior.
    var compl = serie.filter(function (x) { return !x.parcial; }), sU = compl[compl.length - 1], sA = compl[compl.length - 2];
    var varH = sU && sA && sA.h ? (sU.h - sA.h) / sA.h * 100 : null;
    var litros = oc * LH, custo = litros * PRECO;
    var combo = (function () {
      var W = 900, H = 300, pl = 54, pr = 46, pt = 34, pb = 30, iw = W - pl - pr, ih = H - pt - pb, n = serie.length || 1;
      var mxH = Math.max.apply(null, [1].concat(serie.map(function (x) { return x.l; }))), passo = [10, 20, 25, 50, 100, 200, 250, 500, 1000].filter(function (p) { return mxH / p <= 6; })[0] || 2000, topoH = Math.ceil(mxH * 1.12 / passo) * passo;
      var mxP = Math.max(meta * 1.4, Math.max.apply(null, [0].concat(serie.map(function (x) { return x.p; }))) * 1.25), pP = mxP > 40 ? 10 : 5, topoP = Math.ceil(mxP / pP) * pP;
      var bw = iw / n, sv = '<svg viewBox="0 0 ' + W + " " + H + '" class="mo-combo" role="img" aria-label="Horas de ignição ligada e percentual de motor ocioso por período">';
      for (var g = 0; g <= topoH; g += passo) { var y = pt + ih - g / topoH * ih; sv += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (pl - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + num(g, 0) + " h</text>"; }
      for (var gp = 0; gp <= topoP; gp += pP) { var yp = pt + ih - gp / topoP * ih; sv += '<text x="' + (W - pr + 8) + '" y="' + (yp + 4) + '" class="ax axp">' + gp + "%</text>"; }
      var ym = pt + ih - meta / topoP * ih; sv += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + ym + '" y2="' + ym + '" class="mo-meta"/>';
      var pts = [];
      serie.forEach(function (x, i) {
        var bh = x.l / topoH * ih, bx = pl + i * bw + bw * .2, cx = pl + i * bw + bw / 2, py = pt + ih - x.p / topoP * ih;
        sv += '<g class="mo-col' + (x.r === moSel ? " sel" : moSel ? " fora" : "") + '" data-mobar="' + esc(x.r) + '" role="button" tabindex="0" aria-pressed="' + (x.r === moSel) + '"><rect x="' + (pl + i * bw).toFixed(1) + '" y="' + pt + '" width="' + bw.toFixed(1) + '" height="' + ih + '" class="mo-hit" fill="#000" fill-opacity="0"/><rect x="' + bx.toFixed(1) + '" y="' + (pt + ih - bh).toFixed(1) + '" width="' + (bw * .6).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3" class="mo-bar' + (x.p > meta ? " acima" : "") + '"><title>' + x.r + ": ignição ligada " + horas(x.l) + ", motor ocioso " + horas(x.h) + " (" + num(x.p, 1) + "%) · clique para ver as frotas no Top 5</title></rect></g>" +
          '<text x="' + cx.toFixed(1) + '" y="' + (pt + ih - bh - 8).toFixed(1) + '" text-anchor="middle" class="mo-bl">' + horas(x.l) + "</text>" +
          '<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">' + x.r + "</text>";
        pts.push([cx, py, x.p]);
      });
      sv += '<polyline class="mo-line" points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
      pts.forEach(function (p) { var acima0 = p[2] > meta; sv += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" class="mo-pt"/><rect x="' + (p[0] - 27).toFixed(1) + '" y="' + (p[1] + 8).toFixed(1) + '" width="54" height="20" rx="10" class="mo-pill' + (acima0 ? " acima" : "") + '"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 22).toFixed(1) + '" text-anchor="middle" class="mo-pillt">' + num(p[2], 1) + "%</text>"; });
      return sv + "</svg>" + (serie.some(function (x) { return x.parcial; }) ? '<p class="mo-nota">* semana ainda incompleta.</p>' : "");
    })();
    var rosc = (function () {
      var r = 15.9155, acum = 0, tot = sum(donut, function (x) { return x.h; }), sv = '<svg viewBox="0 0 42 42" class="rosca" role="img" aria-label="Motor ocioso por processo"><circle cx="21" cy="21" r="' + r + '" fill="none" stroke="var(--soft)" stroke-width="6"/>';
      donut.forEach(function (x, i) { if (!tot || !x.h) return; var p = x.h / tot * 100; sv += '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="' + CORD[i] + '" stroke-width="6" stroke-dasharray="' + Math.max(p - .5, 0).toFixed(2) + " " + (100 - Math.max(p - .5, 0)).toFixed(2) + '" stroke-dashoffset="' + (25 - acum).toFixed(2) + '"><title>' + esc(x.nome) + "</title></circle>"; acum += p; });
      return sv + '<text x="21" y="21.5" text-anchor="middle" class="rc-n">' + horas(tot) + '</text><text x="21" y="26.5" text-anchor="middle" class="rc-t">Total</text></svg>';
    })();
    var totD = sum(donut, function (x) { return x.h; });
    // Veículos menos usados: menor tempo de ignição ligada no período (20/11/2026).
    var usados = rows.slice().sort(function (a, b) { return a.li - b.li; });
    var menosUsados = usados.length ? '<div class="mo-mu"><p class="mo-mut"><small>Tempo de ignição ligada (tempo de uso) no período, do menor para o maior · ' + usados.length + " " + plural(usados.length, "veículo", "veículos") + '.</small></p><ol class="rolagem">' + usados.map(function (r) {
      return "<li><span>Frota <b>" + esc(r.v.id) + "</b><small>" + esc(r.v.processo || "") + "</small></span><strong>" + horas(r.li) + "</strong></li>";
    }).join("") + "</ol></div>" : "";
    var piorProc = lpP[0];
    var painelMO = '<div class="mo-g1"><section class="card mo-card"><div class="mo-h"><h3><span class="mo-ic">▮▮</span> Evolução do motor ocioso</h3><ul class="mo-leg"><li><i class="b"></i>Ignição ligada (h)</li><li><i class="b r"></i>Acima da meta</li><li><i class="l"></i>% motor ocioso</li></ul></div>' + '<div class="mo-cw"><div class="mo-tot"><div><small>Ignição ligada</small><b>' + horas(xSel ? xSel.l : li) + '</b></div><div class="oc"><small>Horas ociosas</small><b>' + horas(xSel ? xSel.h : oc) + '</b><small>' + num(xSel ? xSel.p : pct, 1) + '% da ignição</small></div><small class="mo-totp">' + (xSel ? (xSel.parcial === undefined ? "dia " + esc(xSel.r) : esc(xSel.faixa || xSel.r)) : (kds ? dd(fO.de) + " a " + dd(fO.ate) : esc((m.periodo || "").replace(/\/2026/g, "")))) + '</small></div>' + combo.replace(/<p class="mo-nota">/, '</div><p class="mo-nota">') + (combo.indexOf('<p class="mo-nota">') < 0 ? "</div>" : "") + (kds ? "" : '<p class="mo-nota">Cada barra representa uma semana, de segunda a domingo (o rótulo é o primeiro dia da semana).</p>') + '<p class="mo-nota">Clique numa barra para ver no Top 5 as frotas mais ociosas ' + (serie.length && serie[0].parcial === undefined ? "do dia" : "da semana") + ".</p></section>" +
      '<section class="card mo-card"><div class="longas-h"><h3>Top 5 veículos' + (xSel ? " · " + (xSel.parcial === undefined ? "dia " : "semana de ") + esc(xSel.r.replace("*", "")) : "") + "</h3>" + (xSel ? '<button type="button" class="limpar" data-mobar-todos="1">Ver período todo</button>' : "") + '</div><ol class="mo-top">' + (top5.length ? "" : "<li><span></span><span>Nenhuma frota com motor ocioso nesse período.</span></li>") + top5.map(function (r, i) {
        return '<li><span class="mo-n">' + (i + 1) + '</span><span class="mo-f">Frota ' + esc(r.v.id) + '</span><span class="mo-pr" title="' + esc(r.v.processo || "") + '">' + esc((r.v.processo || "—").toLowerCase()) + '</span><span class="mo-b"><i style="width:' + (r.oc / mxT * 100).toFixed(1) + '%"></i></span><span class="mo-hh">' + horas(r.oc) + '</span><strong class="' + (r.pct > meta ? "acima" : "") + '">' + num(r.pct, 1) + "%</strong></li>";
      }).join("") + '</ol><p class="mo-nota">Horas ociosas ' + (xSel ? (xSel.parcial === undefined ? "no dia <b>" + esc(xSel.r) + "</b>" : "de <b>" + esc(xSel.faixa || xSel.r) + "</b>") : "de <b>" + (kds ? dd(fO.de) + " a " + dd(fO.ate) : esc((m.periodo || "").replace(/\/2026/g, ""))) + "</b>") + ' e % do tempo de motor ligado (vermelho acima da meta de ' + meta + "%).</p></section></div>" +
      '<div class="mo-g2"><section class="card mo-card"><h3><span class="mo-ic">●</span> Por processo</h3><div class="mo-ctx">' + rosc + '<ul class="mo-cl">' + donut.map(function (x, i) {
        return '<li><i style="background:' + CORD[i] + '"></i><span>' + esc(x.nome) + "</span><b>" + num(totD ? x.h / totD * 100 : 0, 1) + "%</b></li>";
      }).join("") + "</ul></div></section>" +
      '<section class="card mo-card"><h3><span class="mo-ic">💡</span> Conclusões</h3><ul class="mo-ins">' + insResumo +
        (varH !== null ? '<li><span class="mo-ii">' + (varH > 0 ? "↗" : "↘") + "</span><span>O tempo de motor ocioso " + (varH > 0 ? "aumentou" : "diminuiu") + " <b>" + num(Math.abs(varH), 0) + "%</b> " + (sU.parcial === undefined ? "no dia " + sU.r + " em relação ao dia " + sA.r : "na semana de " + (sU.faixa || sU.r) + " em relação à de " + (sA.faixa || sA.r)) + ".</span></li>" : "") +
        '<li><span class="mo-ii">⛽</span><span>Isso representa um consumo estimado de <b>' + num(litros, 0) + " litros</b> de etanol no período.</span></li>" +
        '<li><span class="mo-ii">$</span><span>O custo estimado é de <b>R$ ' + num(custo, 2) + "</b> no período.</span></li>" +
        '</ul><p class="mo-nota">Estimativa: ' + num(LH, 2) + " L por hora ociosa e R$ " + num(PRECO, 2) + " por litro de etanol (média da região de Minas).</p></section>" +
      // "Ações recomendadas" saiu (20/11/2026): fica só o quadro dos veículos menos usados.
      '<section class="card mo-card"><h3><span class="mo-ic">⏱</span> Veículos menos usados</h3>' + menosUsados + "</section></div>";
    return filtros + painelMO + secoes; // sem a área "Atualizar a aba Motor ocioso" (pedido em 20/11/2026: a atualização é pelo botão Atualizar dados)
  }

  // ---------- Permanência: mapa de calor (dados reais da tabela Ocorrências do Power BI) ----------
  var pm = { frotas: [], medida: "tempo", dias: 0, dia: "", abertoFrotas: false, refit: true, mapa: null, vista: null, marcas: {}, localSel: null };
  function permFiltrados() {
    var P = D.permanencia, V = P.veiculos;
    var processos = unicos(Object.keys(V).map(function (f) { return V[f].processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    var hP = hier(Object.keys(V).filter(function (f) { return !fil_.processo || V[f].processo === fil_.processo; }), function (f) { return V[f]; }, "p");
    var frotasProc = hP.itens.sort();
    pm.frotas = []; // filtro de frotas retirado da Permanência (21/11/2026)
    var sel = pm.frotas.length ? pm.frotas : frotasProc, set = {};
    sel.forEach(function (f) { set[f] = 1; });
    var diasEv = unicos(P.eventos.map(function (e) { return e[5]; })).sort();
    var st = perEstado("permanencia", "todo"), f = perFaixa(st, diasEv);
    var ev = P.eventos.filter(function (e) { return set[e[0]] && (f.todo || (e[5] >= f.de && e[5] <= f.ate)); });
    return { P: P, V: V, processos: processos, frotasProc: frotasProc, ev: ev, diasEv: diasEv, st: st, f: f, hierHtml: hP.html };
  }
  function dataBR(s) { return s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4); }
  function hmin(m) { return m >= 6000 ? num(m / 60, 0) + " h" : m >= 60 ? dur(Math.round(m)) : num(m, 0) + " min"; }

  function longasHtml(ev, P, V) {
    var sel = pm.localSel, lst = ev.filter(function (e) { return sel === null || sel === undefined || e[4] === sel; });
    var longas = lst.slice().sort(function (a, b) { return b[3] - a[3]; }).slice(0, 12);
    var tit = sel === null || sel === undefined ? "Permanências mais longas" : "Permanências mais longas em " + esc(P.locais[sel].nome);
    return '<section class="card longas-card"><div class="longas-h"><h3>' + tit + "</h3>" + (sel === null || sel === undefined ? "" : '<button type="button" class="limpar" data-local-todos="1">Ver todos os locais</button>') + "</div>" +
      (longas.length ? '<ul class="longas longas-2">' + longas.map(function (e) {
        return "<li><span><b>" + esc(e[0]) + "</b> em " + esc(P.locais[e[4]].nome) + "<small>" + dataBR(e[5]) + " às " + e[6] + " · " + esc(V[e[0]].processo) + "</small></span><strong>" + hmin(e[3]) + "</strong></li>";
      }).join("") + "</ul>" : '<p class="cs">Nenhuma permanência.</p>') + "</section>";
  }
  function trocaLocal(i) {
    pm.localSel = pm.localSel === i ? null : i;
    var c = document.querySelector(".longas-card"), P = D.permanencia;
    if (c && pm.ultimo) c.outerHTML = longasHtml(pm.ultimo.ev, P, P.veiculos);
    document.querySelectorAll("[data-local]").forEach(function (b) { var on = +b.dataset.local === pm.localSel; b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on); });
  }

  function abaPermanencia() {
    var F = permFiltrados(), P = F.P, V = F.V, ev = F.ev;
    var porLocal = {};
    ev.forEach(function (e) {
      var x = porLocal[e[4]] || (porLocal[e[4]] = { i: e[4], n: 0, min: 0, lat: 0, lon: 0, fr: {} });
      x.n++; x.min += e[3]; x.lat += e[1]; x.lon += e[2]; x.fr[e[0]] = 1;
    });
    var locais = Object.keys(porLocal).map(function (k) { return porLocal[k]; })
      .sort(function (a, b) { return pm.medida === "tempo" ? b.min - a.min : b.n - a.n; });
    var totMin = sum(ev, function (e) { return e[3]; });
    var nFrotas = Object.keys(ev.reduce(function (o, e) { o[e[0]] = 1; return o; }, {})).length;

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="p-processo">' + opcoes(F.processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" + F.hierHtml +
      (F.diasEv.length ? perControle("permanencia", F.st, F.diasEv, F.f) : "") +
      '<div class="campo"><span class="rot">Calor por</span><div class="pills" role="group" aria-label="Medida do mapa de calor"><button type="button" data-medida="tempo" aria-pressed="' + (pm.medida === "tempo") + '">Tempo parado</button><button type="button" data-medida="vezes" aria-pressed="' + (pm.medida === "vezes") + '">Nº de permanências</button></div></div>' +
      (fil_.processo || hierAtiva() || F.st.p !== F.st.padrao ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") + "</div>";

    // Nas observações, só estabelecimentos (posto, padaria, restaurante...), nunca cercas com nome de colaborador.
    var topoX = locais.filter(function (x) { return P.locais[x.i].tipo === "estabelecimento"; })[0];
    var topo = topoX ? P.locais[topoX.i] : null;
    var lead = ev.length ? (!F.f.todo ? (F.f.de === F.f.ate ? "Em " : "De ") + perTexto(F.f) + ": " : "") + "<b>" + num(ev.length, 0) + "</b> " + plural(ev.length, "permanência", "permanências") + " de " + nFrotas + " " + plural(nFrotas, "frota", "frotas") + ", somando <b>" + hmin(totMin) + "</b> parados em " + locais.length + " " + plural(locais.length, "local", "locais") + "." +
      (topo ? " O estabelecimento com " + (pm.medida === "tempo" ? "mais tempo parado" : "mais permanências") + " é <b>" + esc(topo.nome) + "</b>, com " + (pm.medida === "tempo" ? hmin(topoX.min) : topoX.n + " " + plural(topoX.n, "vez", "vezes")) + "." : "")
      : "Nenhuma permanência para esse filtro.";

    // Lista: quantidade de paradas e tempo médio por parada (sem total de horas).
    var porParadas = locais.slice().sort(function (a, b) { return b.n - a.n || b.min / b.n - a.min / a.n; });
    var mx = Math.max.apply(null, [1].concat(porParadas.map(function (x) { return x.n; })));
    var ranking = '<section class="card"><h3>Locais de permanência</h3><p class="cs">Quantidade de paradas e tempo médio de cada parada. Clique para ver no mapa.</p><div class="rolagem alta">' + porParadas.map(function (x, k) {
      var L0 = P.locais[x.i], nf = Object.keys(x.fr).length;
      return '<button type="button" class="li lib' + (pm.localSel === x.i ? " sel" : "") + '" aria-pressed="' + (pm.localSel === x.i) + '" data-local="' + x.i + '"><span class="t">' + esc(L0.nome) + "<small>" + esc([L0.cidade, nf + " " + plural(nf, "frota", "frotas")].filter(Boolean).join(" · ")) + '</small></span><span class="n">' +
        num(x.n, 0) + " " + plural(x.n, "parada", "paradas") + "<small>média de " + hmin(x.min / x.n) + "</small>" +
        '</span><div class="bb"><div class="ff" style="width:' + (x.n / mx * 100).toFixed(1) + "%;--i:" + k + '"></div></div></button>';
    }).join("") + "</div></section>";

    // Permanências mais longas embaixo do mapa, na largura dele, em duas colunas (20/11/2026).
    // Clique num local da lista "Locais de permanência" filtra esta lista por ele (clique de novo para voltar a todos).
    if (pm.localSel !== null && pm.localSel !== undefined && !porLocal[pm.localSel]) pm.localSel = null;
    var tabela = longasHtml(ev, P, V);
    pm.ultimo = { ev: ev, locais: locais };
    // Resumo em cards, no estilo da Conectividade (21/11/2026); o texto corrido continua no "lead" para leitores de tela.
    var kc = function (cls, icone, rot, val, sub, extra) { return '<article class="kpi ' + cls + (extra || "") + '"><div class="kh">' + ico(icone) + '<span class="kl">' + rot + '</span></div><strong class="kv">' + val + '</strong><span class="ks">' + sub + "</span></article>"; };
    var kpisPm = ev.length ? '<div class="kpis kpis5 kpis-st kpis-pm" role="group" aria-label="Resumo das permanências">' +
      kc("c-pm1", "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 10h.01", "Permanências", num(ev.length, 0), !F.f.todo ? perTexto(F.f) : "no período todo") +
      kc("c-pm2", "M3 13l2-6h14l2 6v5H3zM7 18v2M17 18v2M6.5 14h.01M17.5 14h.01", "Frotas", num(nFrotas, 0), "com permanência") +
      kc("c-pm3", "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "Tempo parado", hmin(totMin), "somando todas") +
      kc("c-pm4", "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15", "Locais", num(locais.length, 0), plural(locais.length, "local", "locais") + " com parada") +
      (topo ? kc("c-pm5", "M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6", pm.medida === "tempo" ? "Mais tempo parado" : "Mais permanências", esc(topo.nome), pm.medida === "tempo" ? hmin(topoX.min) + " parados" : topoX.n + " " + plural(topoX.n, "vez", "vezes"), " kpi-nome") : "") +
      '</div><p class="sr-only">' + lead + "</p>" : '<div class="head"><p class="lead">' + lead + "</p></div>";
    return filtros + kpisPm +
      '<div class="mapa-g"><div class="mapa-esq"><section class="card mapa-card"><div id="mapa" class="mapa" role="region" aria-label="Mapa de calor das permanências"><p class="mapa-msg">Carregando mapa…</p></div>' +
      '<div class="escala"><span>Menos</span><i></i><span>Mais ' + (pm.medida === "tempo" ? "tempo parado" : "permanências") + "</span></div></section>" + tabela + "</div>" +
      '<div class="mapa-lado">' + ranking + "</div></div>";
  }

  // Camada de calor simples (canvas), sem plugin.
  function camadaCalor(L, pontos, raio) {
    var Calor = L.Layer.extend({
      onAdd: function (map) {
        this._map = map;
        this._c = L.DomUtil.create("canvas", "calor leaflet-zoom-hide");
        map.getPanes().overlayPane.appendChild(this._c);
        map.on("moveend zoomend resize", this._desenha, this);
        this._desenha();
      },
      onRemove: function (map) { map.off("moveend zoomend resize", this._desenha, this); L.DomUtil.remove(this._c); },
      _desenha: function () {
        var map = this._map, c = this._c, sz = map.getSize();
        L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
        c.width = sz.x; c.height = sz.y;
        var g = c.getContext("2d"), r = raio + Math.max(0, map.getZoom() - 11) * 4, blur = r * .9;
        if (!this._pincel || this._r !== r) {
          var b = this._pincel = document.createElement("canvas"), rr = r + blur; this._r = r;
          b.width = b.height = rr * 2;
          var bg = b.getContext("2d");
          bg.shadowOffsetX = bg.shadowOffsetY = rr * 2; bg.shadowBlur = blur; bg.shadowColor = "#000";
          bg.beginPath(); bg.arc(-rr, -rr, r, 0, Math.PI * 2, true); bg.closePath(); bg.fill();
        }
        var rr2 = r + blur, mx = 0;
        pontos.forEach(function (p) { if (p[2] > mx) mx = p[2]; });
        pontos.forEach(function (p) {
          var q = map.latLngToContainerPoint([p[0], p[1]]);
          if (q.x < -rr2 || q.y < -rr2 || q.x > sz.x + rr2 || q.y > sz.y + rr2) return;
          g.globalAlpha = Math.min(Math.max(Math.sqrt(p[2] / mx), .08), 1);
          g.drawImage(this._pincel, q.x - rr2, q.y - rr2);
        }, this);
        var img = g.getImageData(0, 0, sz.x, sz.y), px = img.data, pal = paleta();
        for (var i = 0; i < px.length; i += 4) {
          var a = px[i + 3]; if (!a) continue;
          var j = a * 4; px[i] = pal[j]; px[i + 1] = pal[j + 1]; px[i + 2] = pal[j + 2]; px[i + 3] = Math.min(255, a * 1.15);
        }
        g.putImageData(img, 0, 0);
      }
    });
    return new Calor();
  }
  var _pal;
  function paleta() {
    if (_pal) return _pal;
    var c = document.createElement("canvas"); c.width = 256; c.height = 1;
    var g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, "#3E9B34"); gr.addColorStop(.35, "#8CC63F"); gr.addColorStop(.6, "#E9A800"); gr.addColorStop(.8, "#E2701B"); gr.addColorStop(1, "#C23B2B");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 1);
    return (_pal = g.getImageData(0, 0, 256, 1).data);
  }

  function montarMapa() {
    var el = document.getElementById("mapa"); if (!el) return;
    var L = window.L;
    if (!L || !L.map) {
      var t = (montarMapa.t = (montarMapa.t || 0) + 1);
      if (t > 60) { el.innerHTML = '<p class="mapa-msg">Não foi possível carregar o mapa. Verifique a internet e atualize a página.</p>'; return; }
      return setTimeout(montarMapa, 150);
    }
    montarMapa.t = 0;
    if (pm.mapa && !pm.refit) pm.vista = { c: pm.mapa.getCenter(), z: pm.mapa.getZoom() };
    if (pm.mapa) { pm.mapa.remove(); pm.mapa = null; }
    el.innerHTML = "";
    var P = D.permanencia, U = pm.ultimo;
    var mapa = pm.mapa = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    var ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" });
    var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagens &copy; Esri" });
    (pm.base === "sat" ? sat : ruas).addTo(mapa);
    L.control.layers({ "Mapa": ruas, "Satélite": sat }, null, { position: "topright" }).addTo(mapa);
    mapa.on("baselayerchange", function (e) { pm.base = e.layer === sat ? "sat" : "ruas"; });
    mapa.on("focus", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("blur", function () { mapa.scrollWheelZoom.disable(); });

    // Agrupa pontos próximos (~10 m) para o calor.
    var cel = {};
    U.ev.forEach(function (e) {
      var k = e[1].toFixed(4) + "," + e[2].toFixed(4), x = cel[k] || (cel[k] = [0, 0, 0, 0]);
      x[0] += e[1]; x[1] += e[2]; x[2] += pm.medida === "tempo" ? e[3] : 1; x[3]++;
    });
    var pontos = Object.keys(cel).map(function (k) { var x = cel[k]; return [x[0] / x[3], x[1] / x[3], x[2]]; });
    if (pontos.length) camadaCalor(L, pontos, 14).addTo(mapa);

    pm.marcas = {};
    var mxMin = Math.max.apply(null, [1].concat(U.locais.map(function (x) { return x.min; })));
    U.locais.forEach(function (x) {
      var L0 = P.locais[x.i];
      if (/^Sem cerca/.test(L0.nome)) return;
      var m = L.circleMarker([x.lat / x.n, x.lon / x.n], { radius: 5 + Math.sqrt(x.min / mxMin) * 9, color: "#16251E", weight: 1.5, fillColor: "#FFFFFF", fillOpacity: .85 })
        .bindPopup("<b>" + esc(L0.nome) + "</b><br>" + esc(L0.cidade) + "<br>" + x.n + " " + plural(x.n, "permanência", "permanências") + ", " + hmin(x.min) + "<br>Média de " + hmin(x.min / x.n) + " · " + Object.keys(x.fr).length + " " + plural(Object.keys(x.fr).length, "frota", "frotas"))
        .bindTooltip(esc(L0.nome), { direction: "top", offset: [0, -6] })
        .addTo(mapa);
      pm.marcas[x.i] = m;
    });

    if (!pm.refit && pm.vista) mapa.setView(pm.vista.c, pm.vista.z);
    else if (pontos.length) mapa.fitBounds(L.latLngBounds(pontos.map(function (p) { return [p[0], p[1]]; })).pad(.15), { maxZoom: 15 });
    else mapa.setView([-18.6, -48.6], 10);
    pm.refit = false;
  }

  // Pasta de envio no OneDrive ("Solicitar arquivos"): qualquer usuário salva ali o arquivo exportado.
  // Uma tarefa agendada confere a pasta de exportação às 11h, 13h e 14h (dias úteis), aplica as regras e publica para todos.
  var LINK_ENVIO = "";
  var ENVIO = {
    conectividade: { arq: "Localização da Frota", sis: "vFleets", aba: "Conectividade" },
    cameras: { arq: "Saúde do Veículo - Análise", sis: "Platform Science", aba: "Câmeras" },
    motorOcioso: { arq: "Boletim do Veículo", aba: "Motor ocioso", obs: "um dia por arquivo" }
  };
  var previa = {}; // abas com arquivo carregado neste navegador: { nome, original }
  function secaoEnvio(qual, dados) {
    var e = ENVIO[qual], pv = previa[qual];
    return '<section class="envio"><div><h3>Atualizar a aba ' + e.aba + "</h3>" +
      '<p>Exporte o arquivo <b>' + esc(e.arq) + "</b>" + (e.sis ? " no " + esc(e.sis) : "") + (e.obs ? " (" + esc(e.obs) + ")" : "") + " e carregue aqui, sem mudar o nome (a data vai no nome). A aba atualiza na hora, para você. " +
      "Os dados publicados para todos são atualizados automaticamente às 11h, 13h e 14h, em dias úteis.</p>" +
      (pv ? '<p class="envio-pv" role="status">Mostrando o arquivo <b>' + esc(pv.nome) + "</b> só neste navegador. " + esc(pv.msg) + ' <button type="button" class="limpar" data-desfazer="' + qual + '">Voltar aos dados publicados</button></p>' : "") +
      '<p class="envio-at">Dados ' + (pv ? "do arquivo" : "publicados") + ": <b>" + esc(dados) + "</b></p></div>" +
      '<div class="envio-bt"><label class="btn btn-arq">Carregar arquivo<input type="file" accept=".csv,text/csv" data-carregar="' + qual + '"></label>' +
      (LINK_ENVIO ? '<a class="btn btn-sec" href="' + LINK_ENVIO + '" target="_blank" rel="noopener">Enviar para todos <span aria-hidden="true">↗</span></a>' : "") + "</div></section>";
  }

  // ----- Leitura dos arquivos exportados no navegador (mesmas regras de ferramentas/cameras.py e conectividade.py) -----
  var EXCLUIR = { ZZSEE4G55: 1, ZSEE4G55: 1, "961313": 1 }; // igual a ferramentas/frotas_excluidas.json
  var DE_PARA = { USG4J27: "40904", UAG4J26: "40898", ARO0157: "10157", UCM7H97: "30168", UCO7E57: "40907" }; // igual a ferramentas/frotas_de_para.json
  var PROC_INFORMADO = { "40771": "TRANSPORTE", "40777": "TRATOS CULTURAIS", "40845": "TRATOS CULTURAIS", "40743": "TRATOS CULTURAIS", "40833": "FACILITIES", "40690": "FACILITIES", "40908": "FACILITIES" }; // igual a ferramentas/processos_frotas.json
  function frotaCerta(f) { return DE_PARA[String(f).toUpperCase()] || f; }
  function nrm(t) { return String(t == null ? "" : t).normalize("NFC").trim(); }
  function decodifica(buf) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, ""); } catch (e) { return new TextDecoder("windows-1252").decode(buf); }
  }
  function lerCSV(txt) {
    var linhas = [], lin = [], campo = "", aspas = false;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i];
      if (aspas) { if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch; continue; }
      if (ch === '"') aspas = true;
      else if (ch === ";") { lin.push(campo); campo = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; lin.push(campo); campo = ""; if (lin.some(function (c) { return c.trim(); })) linhas.push(lin); lin = []; }
      else campo += ch;
    }
    lin.push(campo); if (lin.some(function (c) { return c.trim(); })) linhas.push(lin);
    if (!linhas.length) return { cab: [], rows: [] };
    var cab = linhas[0].map(function (c) { return nrm(c).toUpperCase(); });
    return { cab: cab, rows: linhas.slice(1).map(function (r) { var o = {}; cab.forEach(function (c, k) { o[c] = nrm(r[k]); }); return o; }) };
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function horaLocal(t) { // UTC -> Brasília, "AAAA-MM-DD HH:MM"
    var m = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(t || ""); if (!m) return "";
    var d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) - 3 * 3600000);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
  }
  function mapaProcessos() {
    var m = {};
    ((D.motorOcioso || {}).veiculos || []).forEach(function (v) { if (v.id && v.processo) m[v.id] = v.processo; });
    [["permanencia", "veiculos"], ["comportamento", "frotas"], ["conectividade", "frotas"]].forEach(function (b) {
      var fr = (D[b[0]] || {})[b[1]] || {}; Object.keys(fr).forEach(function (f) { if (fr[f].processo) m[f] = fr[f].processo; });
    });
    ((previa.cameras && previa.cameras.original) || D.cameras || { lista: [] }).lista.forEach(function (v) { if (!m[v.f]) m[v.f] = v.processo; });
    Object.keys(PROC_INFORMADO).forEach(function (f) { m[f] = PROC_INFORMADO[f]; });
    return m;
  }
  function camDoArquivo(nome, T) {
    var COLS = { motorista: [["CÂMERA MOTORISTA MAL POSICIONADA", "Mal posicionada"], ["CÂMERA MOTORISTA INTERMITENTE", "Intermitente"], ["CÂMERA MOTORISTA NÃO FUNCIONANDO", "Não funcionando"]],
      pista: [["CÂMERA PISTA INTERMITENTE", "Intermitente"], ["CÂMERA PISTA NÃO FUNCIONANDO", "Não funcionando"]],
      auditoria: [["QTD CÂMERAS DE AUDITORIA INTERMITENTES", "Intermitente"]] }; // só essas colunas indicam problema de câmera
    var faltam = []; Object.keys(COLS).forEach(function (t) { COLS[t].forEach(function (c) { if (T.cab.indexOf(c[0]) < 0) faltam.push(c[0]); }); });
    if (faltam.length) throw new Error("Esse não parece o arquivo Saúde do Veículo. Faltam colunas: " + faltam.slice(0, 3).join(", ") + (faltam.length > 3 ? "…" : ""));
    var mm = /(\d{4}-\d{2}-\d{2})T(\d{2})_(\d{2})/.exec(nome), quando = mm ? horaLocal(mm[1] + "T" + mm[2] + ":" + mm[3]) : "";
    if (!quando) T.rows.forEach(function (l) { ["GSM TELEMETRIA", "ÚLTIMA VELOCIDADE"].forEach(function (c) { var h = horaLocal(l[c]); if (h > quando) quando = h; }); });
    function def(v) { v = nrm(v).toUpperCase(); if (v === "SIM" || v === "S") return 1; var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
    var proc = mapaProcessos(), restrito = D.escopo && D.escopo !== "todos", R = {}, lista = [], fora = 0;
    T.rows.forEach(function (l) {
      var f = frotaCerta(l["PREFIXO"] || l["PLACA"] || ""); if (!f || f === "-" || /INATIVO/i.test(f) || EXCLUIR[f.toUpperCase()]) return;
      var p = proc[f];
      if (!p) { if (restrito) { fora++; return; } p = l["UO"] && l["UO"].indexOf(" - ") >= 0 ? l["UO"].split(" - ").slice(1).join(" - ") : "SEM PROCESSO"; }
      var r = R[p] || (R[p] = { n: 0, st: {}, gps: {}, tk: {}, ev: 0 }); r.n++;
      var st = l["STATUS"] || "N/A", gps = l["GPS"] || "N/A", t = l["TICKET"] || "";
      r.st[st] = (r.st[st] || 0) + 1; r.gps[gps] = (r.gps[gps] || 0) + 1;
      if (t.indexOf("http") === 0) r.tk[t] = 1;
      if (horaLocal(l["ÚLTIMO EVENTO COMPORTAMENTAL"]).slice(0, 10) === quando.slice(0, 10)) r.ev++;
      var d = [];
      Object.keys(COLS).forEach(function (tid) { COLS[tid].forEach(function (c) { var n = def(l[c[0]]); if (n) d.push([tid, c[1], n]); }); });
      if (!d.length) return;
      lista.push({ f: f, placa: l["PLACA"] || "", processo: p, sit: (l["SITUAÇÃO"] || "").replace("-", ""), st: (l["STATUS"] || "").replace("N/A", ""), cams: def(l["NÚMERO TOTAL DE CÂMERAS"]),
        foto: horaLocal(l["ÚLTIMA FOTO"]), video: horaLocal(l["ÚLTIMO VÍDEO"]), ticket: t.indexOf("http") === 0 ? t : "", tst: (l["STATUS DO TICKET"] || "").replace("-", ""), d: d });
    });
    if (!Object.keys(R).length) throw new Error(restrito ? "Nenhum veículo dos seus processos nesse arquivo." : "Nenhum veículo no arquivo.");
    Object.keys(R).forEach(function (p) { R[p].tk = Object.keys(R[p].tk).length; });
    lista.sort(function (a, b) { return a.processo.localeCompare(b.processo, "pt-BR") || a.f.localeCompare(b.f); });
    var dbr = quando.slice(8, 10) + "/" + quando.slice(5, 7) + "/" + quando.slice(0, 4);
    return { bloco: { real: true, periodo: "Câmeras de " + dbr + " às " + quando.slice(11) + " · arquivo carregado", dia: quando.slice(0, 10), hora: quando.slice(11), tipos: (D.cameras || {}).tipos, proc: R, lista: lista },
      msg: lista.length + " " + plural(lista.length, "veículo com alerta", "veículos com alerta") + (fora ? "; " + fora + " de outros processos ficaram de fora" : "") + "." };
  }
  function conDoArquivo(nome, T) {
    if (T.cab.indexOf("VEÍCULO") < 0 || T.cab.indexOf("ÚLTIMA CONEXÃO") < 0) throw new Error("Esse não parece o arquivo Localização da Frota (faltam as colunas VEÍCULO e ÚLTIMA CONEXÃO).");
    var K = JSON.parse(JSON.stringify(D.conectividade));
    function dataBR(t) { var m = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/.exec(t || ""); return m ? { d: m[3] + "-" + m[2] + "-" + m[1], h: m[4] + ":" + m[5] } : null; }
    var mm = /(\d{4}-\d{2}-\d{2})T\d{2}_\d{2}/.exec(nome), dia = mm ? mm[1] : "";
    if (!dia) T.rows.forEach(function (l) { var u = dataBR(l["ÚLTIMA CONEXÃO"]); if (u && u.d > dia) dia = u.d; });
    if (!dia) throw new Error("Não consegui achar a data do arquivo.");
    var i = K.dias.indexOf(dia);
    if (i < 0) {
      K.dias.push(dia); K.dias.sort(); i = K.dias.indexOf(dia);
      Object.keys(K.hist).forEach(function (f) { var h = K.hist[f]; K.hist[f] = h.slice(0, i) + "." + h.slice(i); });
    }
    var ref = Date.UTC(+dia.slice(0, 4), dia.slice(5, 7) - 1, +dia.slice(8, 10)), atual = {}, n = 0, novos = 0, ultimo = i === K.dias.length - 1;
    T.rows.forEach(function (l) {
      var partes = (l["VEÍCULO"] || "").split(" - ").map(nrm); if (!partes[0]) return;
      if (partes.some(function (x) { return x.toLowerCase() === "inativo"; })) return;
      var f = frotaCerta(partes[0]); if (EXCLUIR[f.toUpperCase()]) return;
      if (!K.frotas[f]) { novos++; return; }
      var ap = (l["APELIDO"] || "").toUpperCase().replace("MANUTENCAO", "MANUTENÇÃO"), u = dataBR(l["ÚLTIMA CONEXÃO"]);
      var off = u ? Math.round((ref - Date.UTC(+u.d.slice(0, 4), u.d.slice(5, 7) - 1, +u.d.slice(8, 10))) / 86400000) : 999;
      var st = ap === "MANUTENÇÃO" ? "M" : ap === "PARADO" ? "P" : off >= 2 ? "O" : "C";
      var h = K.hist[f] || new Array(K.dias.length + 1).join("."), ant = i > 0 ? h[i - 1] : ".", man = (K.atual[f] || {}).manual;
      // O último dia é a referência: manutenção/parado continua até a planilha dizer OPERANDO.
      if ("CO".indexOf(st) >= 0 && (ant === "M" || ant === "P" || ((ant === "m" || ant === "p") && man && man.status !== "OPERANDO"))) st = ant;
      K.hist[f] = h.slice(0, i) + st + h.slice(i + 1); n++;
      if (ultimo) atual[f] = { dias: off, ult: u ? u.d + " " + u.h : "", sis: (l["STATUS CONEXÃO"] || "").toUpperCase(), mov: (l["STATUS"] || ""), st: st, manual: man };
    });
    if (!n) throw new Error("Nenhum veículo dos seus processos nesse arquivo.");
    if (ultimo) K.atual = atual;
    var di = K.dias[0], df = K.dias[K.dias.length - 1];
    K.periodo = di.slice(8, 10) + "/" + di.slice(5, 7) + "/" + di.slice(0, 4) + " a " + df.slice(8, 10) + "/" + df.slice(5, 7) + "/" + df.slice(0, 4) + " · arquivo carregado";
    return { bloco: K, msg: n + " " + plural(n, "veículo atualizado", "veículos atualizados") + " em " + dia.slice(8, 10) + "/" + dia.slice(5, 7) + (novos ? "; " + novos + " fora do cadastro ou de outros processos" : "") + "." };
  }
  function segs(t) { var m = /^(\d+):(\d{2}):(\d{2})/.exec(t || ""); return m ? m[1] * 3600 + m[2] * 60 + +m[3] : 0; }
  function ocioDoArquivo(nome, T) {
    if (T.cab.indexOf("PARADO LIGADO") < 0 || T.cab.indexOf("TEMPO IGNIÇÃO LIGADA") < 0) throw new Error("Esse não parece o arquivo Boletim do Veículo (faltam as colunas TEMPO IGNIÇÃO LIGADA e PARADO LIGADO).");
    var M = JSON.parse(JSON.stringify(D.motorOcioso)) // soma aos arquivos já carregados nesta visita;
    var mm = /(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/.exec(nome), dia = "";
    if (mm && mm[1] !== mm[2]) throw new Error("O arquivo precisa ser de um dia só.");
    if (mm) dia = mm[1]; else { var dd = /(\d{2})\/(\d{2})\/(\d{4})/.exec((T.rows[0] || {})["DIA"] || ""); if (dd) dia = dd[3] + "-" + dd[2] + "-" + dd[1]; }
    if (!dia) throw new Error("Não consegui achar o dia do arquivo.");
    if (M.diasIncluidos.indexOf(dia) >= 0) throw new Error("O dia " + dia.slice(8, 10) + "/" + dia.slice(5, 7) + " já está no painel.");
    function utc(s) { return Date.UTC(+s.slice(0, 4), s.slice(5, 7) - 1, +s.slice(8, 10)); }
    if (utc(dia) < utc(M.inicioSemana)) throw new Error("Esse dia é anterior ao período do painel.");
    var k = Math.floor((utc(dia) - utc(M.inicioSemana)) / (7 * 86400000));
    while (M.semanas.length <= k) {
      var s0 = new Date(utc(M.inicioSemana) + M.semanas.length * 7 * 86400000);
      M.semanas.push(pad(s0.getUTCDate()) + "/" + pad(s0.getUTCMonth() + 1));
      M.veiculos.forEach(function (v) { v.ligado.push(0); v.ocioso.push(0); });
    }
    var cad = (D.conectividade || {}).frotas || {}, porId = {}, restrito = D.escopo && D.escopo !== "todos", n = 0;
    M.veiculos.forEach(function (v) { porId[v.id] = v; });
    // Dias recentes, dia a dia (Resumo): abre as colunas até o dia do arquivo.
    var ku = -1;
    if (M.ultDias) {
      while (M.ultDias[M.ultDias.length - 1] < dia) {
        var u = new Date(utc(M.ultDias[M.ultDias.length - 1]) + 86400000);
        M.ultDias.push(u.getUTCFullYear() + "-" + pad(u.getUTCMonth() + 1) + "-" + pad(u.getUTCDate()));
      }
      M.veiculos.forEach(function (v) { v.dl = v.dl || []; v.do = v.do || []; while (v.dl.length < M.ultDias.length) { v.dl.push(0); v.do.push(0); } });
      ku = M.ultDias.indexOf(dia);
    }
    T.rows.forEach(function (l) {
      var f = frotaCerta(l["PREFIXO"] || ""); if (!f || f === "-" || EXCLUIR[f.toUpperCase()]) return;
      var i = segs(l["TEMPO IGNIÇÃO LIGADA"]), p = segs(l["PARADO LIGADO"]); if (i <= 0 && p <= 0) return;
      var v = porId[f];
      if (!v) { // veículo leve que ainda não estava na aba (só para quem vê todos os processos)
        var c = cad[f]; if (restrito || !c || (c.grupo || "").toUpperCase() !== "VEÍCULOS LEVES") return;
        v = porId[f] = { id: f, placa: l["PLACA"] || c.placa || "", processo: PROC_INFORMADO[f] || c.processo || "Sem processo", responsavel: c.responsavel || "", dias: 0,
          ligado: M.semanas.map(function () { return 0; }), ocioso: M.semanas.map(function () { return 0; }),
          dl: (M.ultDias || []).map(function () { return 0; }), do: (M.ultDias || []).map(function () { return 0; }) };
        M.veiculos.push(v);
      }
      v.ligado[k] = Math.round((v.ligado[k] + i / 3600) * 100) / 100; v.ocioso[k] = Math.round((v.ocioso[k] + p / 3600) * 100) / 100;
      if (ku >= 0) { v.dl[ku] = Math.round((v.dl[ku] + i / 3600) * 100) / 100; v.do[ku] = Math.round((v.do[ku] + p / 3600) * 100) / 100; }
      if (i > 0) v.dias++;
      n++;
    });
    if (!n) throw new Error("Nenhum veículo leve" + (restrito ? " dos seus processos" : "") + " nesse arquivo.");
    M.diasIncluidos.push(dia); M.diasIncluidos.sort();
    var a = M.diasIncluidos[0], b = M.diasIncluidos[M.diasIncluidos.length - 1];
    M.periodo = a.slice(8, 10) + "/" + a.slice(5, 7) + "/" + a.slice(0, 4) + " a " + b.slice(8, 10) + "/" + b.slice(5, 7) + "/" + b.slice(0, 4) + " · arquivo carregado";
    return { bloco: M, msg: n + " " + plural(n, "veículo leve", "veículos leves") + " em " + dia.slice(8, 10) + "/" + dia.slice(5, 7) + " somados ao período." };
  }
  function carregarArquivo(qual, arq) {
    var r = new FileReader();
    r.onload = function () {
      var antes = previa[qual] ? previa[qual].original : D[qual];
      try {
        var T = lerCSV(decodifica(r.result)), x = qual === "cameras" ? camDoArquivo(arq.name, T) : qual === "motorOcioso" ? ocioDoArquivo(arq.name, T) : conDoArquivo(arq.name, T);
        previa[qual] = { nome: (previa[qual] && qual !== "cameras" ? previa[qual].nome + ", " : "") + arq.name, original: antes, msg: x.msg };
        D[qual] = x.bloco; if (qual === "conectividade") fco.dia = -1;
      } catch (err) { alert(err.message || "Não consegui ler esse arquivo."); return; }
      render();
      var s = document.querySelector(".envio"); if (s) s.scrollIntoView({ block: "nearest" });
    };
    r.readAsArrayBuffer(arq);
  }

  // ---------- Conectividade (Power BI "Conectividade" + planilha manual de parados e manutenção) ----------
  var ST = [
    { id: "con", l: "C", nome: "Conectados", um: "Conectado", icone: "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a14.5 14.5 0 0 1 20 0" },
    { id: "off", l: "O", nome: "Offline", um: "Offline", icone: "M2 9a14.5 14.5 0 0 1 6-3.4M22 9a14.5 14.5 0 0 0-9.5-4.5M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M3 3l18 18" },
    { id: "man", l: "M", nome: "Manutenção", um: "Manutenção", icone: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" },
    { id: "par", l: "P", nome: "Parados", um: "Parado", icone: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM10 9v6M14 9v6" }
  ];
  var fco = { dia: -1, mes: "", todos: false };
  // Planilha de parados e manutenção no OneDrive (link só para pessoas da Bioenergética Aroeira).
  var LINK_STATUS = "https://bioaroeira0500-my.sharepoint.com/:x:/g/personal/jeffersonmelo_bioaroeira_com_br/IQCBOXgux4WkRLqhbxJaqrmVAbGk8PWZR-k1z45-LiRN5w4?e=cqk76A";
  function letraSt(c) { return c === "m" ? "M" : c === "p" ? "P" : c; }
  function abaConectividade() {
    var K = D.conectividade, F = K.frotas, nd = K.dias.length;
    var ids = Object.keys(F);
    var processos = unicos(ids.map(function (f) { return F[f].processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    ids = ids.filter(function (f) { return !fil_.processo || F[f].processo === fil_.processo; });
    // Período: o gráfico mostra os dias do período; a situação é a do último dia dele (ou do ponto clicado).
    var stK = perEstado("conectividade", "todo"), fK = perFaixa(stK, K.dias), k0 = K.dias.indexOf(fK.de), k1 = K.dias.indexOf(fK.ate);
    var di = fco.dia >= k0 && fco.dia <= k1 ? fco.dia : k1, ehHoje = di === nd - 1;
    function dbr(s) { return s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4); }

    // Situação no dia escolhido.
    var cont = { C: 0, O: 0, M: 0, P: 0 }, manuais = 0, linhasDia = [];
    ids.forEach(function (f) {
      var c = (K.hist[f] || "")[di]; if (!c || c === ".") return;
      var s = letraSt(c); if (cont[s] === undefined) return;
      cont[s]++; if (c === "m" || c === "p") manuais++;
      linhasDia.push({ f: f, c: c, s: s });
    });
    var total = cont.C + cont.O + cont.M + cont.P;
    var pend = (K.pendencias || []).filter(function (p) { return ids.indexOf(p.f) >= 0 || !fil_.processo; });
    // Pendências em campo: número informado manualmente (K.pendCampo) até a fonte própria chegar; sem ele, a lista antiga.
    var nPend = typeof K.pendCampo === "number" ? K.pendCampo : pend.length;

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="k-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      perControle("conectividade", stK, K.dias, fK) +
      (fil_.processo || !ehHoje || stK.p !== stK.padrao ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + total + " " + plural(total, "veículo", "veículos") + " em " + dbr(K.dias[di]) + (manuais ? ". " + manuais + " " + plural(manuais, "informado", "informados") + " na planilha de parados e manutenção" : "") + "</p></div>";

    var kpis = '<div class="kpis kpis5 kpis-st">' + ST.map(function (s) {
      var n = cont[s.l], pc = total ? n / total * 100 : 0;
      return '<article class="kpi c-' + s.id + (fco.st === s.l ? " sel" : "") + '" data-kst="' + s.l + '" role="button" tabindex="0" aria-pressed="' + (fco.st === s.l) + '" title="' + (fco.st === s.l ? "Clique de novo para voltar à lista de offline" : "Clique para ver a lista desses equipamentos") + '"><div class="kh">' + ico(s.icone) + '<span class="kl">' + s.nome + '</span></div><strong class="kv">' + num(n, 0) + '</strong>' +
        '<span class="kbar" aria-hidden="true"><i style="width:' + pc.toFixed(1) + '%"></i></span><span class="ks">' + (total ? num(pc, 1) + "% da frota" : "&nbsp;") + "</span></article>";
    }).join("") + '<article class="kpi c-pen"><div class="kh">' + ico("M12 3l9 16H3zM12 10v4M12 17h.01") + '<span class="kl">Pendências</span></div><strong class="kv">' + num(nPend, 0) + '</strong><span class="kbar vazio" aria-hidden="true"></span><span class="ks">em campo</span></article></div>';

    // Rosca da situação e do status do sistema (só no último dia, que é o que o rastreador informa).
    var cats = ST.map(function (s) { return { id: s.id, nome: s.nome, n: cont[s.l] }; });
    var sit = '<section class="card"><h3>Situação da conectividade</h3><div class="rosca-w">' + rosca(cats, total) + '<ul class="rleg">' + cats.map(function (c) {
      return '<li><i class="c-' + c.id + '"></i><span>' + c.nome + "</span><b>" + num(c.n, 0) + "</b></li>";
    }).join("") + "</ul></div></section>";
    var sisCont = { LIBERADO: 0, AVALIE: 0, "ATENÇÃO": 0 };
    ids.forEach(function (f) { var a = K.atual[f]; if (a && sisCont[a.sis] !== undefined) sisCont[a.sis]++; });
    var sc = [{ id: "lib", nome: "Liberado", n: sisCont.LIBERADO }, { id: "ava", nome: "Avalie", n: sisCont.AVALIE }, { id: "ate", nome: "Atenção", n: sisCont["ATENÇÃO"] }];
    var sisT = sc[0].n + sc[1].n + sc[2].n;
    var sis = '<section class="card"><h3>Status do sistema</h3><p class="cs">Situação atual informada pelo rastreador (' + dbr(K.dias[nd - 1]) + ").</p><div class=\"rosca-w\">" + rosca(sc, sisT) + '<ul class="rleg">' + sc.map(function (c) {
      return '<li><i class="c-' + c.id + '"></i><span>' + c.nome + "</span><b>" + num(c.n, 0) + "</b></li>";
    }).join("") + "</ul></div></section>";

    // Evolução diária de conectados e offline.
    var serie = K.dias.map(function (d, i) {
      var o = { C: 0, O: 0 };
      ids.forEach(function (f) { var c = letraSt((K.hist[f] || "")[i] || "."); if (o[c] !== undefined) o[c]++; });
      return o;
    });
    var evol = '<section class="card"><h3>Conexão por dia</h3><p class="cs">Veículos conectados e offline em cada dia do período. Clique num ponto para ver o dia.</p>' + linhaDias(serie.slice(k0, k1 + 1), K.dias.slice(k0, k1 + 1), di - k0, k0) + "</section>";

    // Lista de equipamentos do status escolhido nos cards (padrão: offline; 20/11/2026), do que tem menos dias no status para o que tem mais.
    var stSel = fco.st || "O", stObj = ST.filter(function (x) { return x.l === stSel; })[0];
    var B_ST = { O: "critico", C: "bom", M: "man", P: "atencao" };
    var sem = linhasDia.filter(function (x) { return x.s === stSel; }).map(function (x) {
      var a = ehHoje ? K.atual[x.f] : null, h = K.hist[x.f], dS = 0;
      for (var k = di; k >= 0 && letraSt(h[k]) === stSel; k--) dS++;
      return { f: x.f, dias: stSel === "O" && a ? a.dias : dS, ult: a ? a.ult : "", man: a && a.manual && a.manual.desde ? a.manual.desde : "" };
    }).sort(function (a, b) { return a.dias - b.dias || a.f.localeCompare(b.f); });
    var expl = { O: "do que está há menos dias sem comunicar para o que está há mais", C: "do que está há menos dias conectado para o que está há mais", M: "do que está há menos dias em manutenção para o que está há mais", P: "do que está há menos dias parado para o que está há mais" }[stSel];
    var tab = '<section class="card tab-card"><h3>Equipamentos ' + (stSel === "O" ? "offline" : stSel === "C" ? "conectados" : stSel === "M" ? "em manutenção" : "parados") + ' <span class="cnt' + (stSel === "O" ? " off" : "") + '">' + sem.length + '</span></h3><p class="cs">Em ' + dbr(K.dias[di]) + ", " + expl + ". " + (fco.st ? "Clique de novo no card para voltar aos offline." : "Clique num card de status para ver os equipamentos dele.") + "</p>" +
      (sem.length ? '<div class="scroll rolagem alta"><table class="tb tb-k tb-off"><thead><tr><th scope="col">Frota</th><th scope="col">Processo</th><th scope="col" class="r" title="Dias seguidos nesse status">Dias</th>' + (ehHoje ? '<th scope="col">Última conexão</th>' : "") + "</tr></thead><tbody>" + sem.map(function (x) {
        var v = F[x.f];
        return '<tr><th scope="row" title="' + esc([v.placa, v.grupo].filter(Boolean).join(" · ")) + '">' + esc(x.f) + (v.placa ? " <small>" + esc(v.placa) + "</small>" : "") + "</th><td title=\"" + esc(v.processo) + "\">" + esc(v.processo) + '</td><td class="r"><span class="b ' + B_ST[stSel] + '"' + (x.man ? ' title="Na planilha desde ' + esc(x.man) + '"' : "") + ">" + num(x.dias, 0) + "</span></td>" +
          (ehHoje ? "<td>" + (x.ult ? esc(x.ult.slice(8, 10) + "/" + x.ult.slice(5, 7) + " " + x.ult.slice(11)) : "") + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>" : '<p class="cs">Nenhum equipamento ' + esc(stObj.um.toLowerCase()) + " nesse dia.</p>") + "</section>";

    // Status por processo: colunas empilhadas (para cima). Clique para filtrar.
    var porP = {};
    linhasDia.forEach(function (x) { var p = F[x.f].processo, o = porP[p] || (porP[p] = { C: 0, O: 0, M: 0, P: 0, t: 0 }); o[x.s]++; o.t++; });
    var lp = Object.keys(porP).map(function (p) { return { p: p, o: porP[p] }; }).sort(function (a, b) { return b.o.t - a.o.t; });
    var porProc = '<section class="card"><h3>Status por processo</h3><ul class="legend">' + ST.map(function (s) { return '<li><i class="c-' + s.id + '"></i>' + s.nome + "</li>"; }).join("") + "</ul>" + colunasProc(lp) + "</section>";

    // Confirmar status: está como manutenção ou parado (no rastreador ou na planilha),
    // mas comunicou há menos de 2 dias. Pode já ter voltado a operar.
    var confirmar = ehHoje ? ids.map(function (f) {
      var a = K.atual[f]; if (!a || "MPmp".indexOf(a.st) < 0 || (a.dias || 0) >= 2) return null;
      return { f: f, st: a.st.toUpperCase() === "M" ? "Manutenção" : "Parado", fonte: a.st === "m" || a.st === "p" ? "planilha" : "rastreador", a: a };
    }).filter(Boolean) : [];
    var avisos = "";
    if (confirmar.length) avisos += '<section class="card confirmar"><h3>Confirmar status <span class="cnt">' + confirmar.length + '</span></h3><p class="cs">Estão como parado ou em manutenção, mas o rastreador comunicou há menos de 2 dias. Confirme se já voltaram a operar: se sim, informe <b>OPERANDO</b> na planilha <b>status_frotas.xlsx</b>; se não, pode manter.</p><ul class="longas">' +
      confirmar.map(function (x) {
        var v = F[x.f], u = x.a.ult;
        return "<li><span><b>" + esc(x.f) + "</b> " + esc(v.processo) + "<small>" + esc([v.placa, v.grupo, "marcado como " + x.st.toLowerCase() + (x.fonte === "planilha" ? " na planilha" : " (rastreador ou último dia)"), x.a.manual && x.a.manual.obs].filter(Boolean).join(" · ")) + "</small></span><strong>" +
          (u ? "Comunicou em " + esc(u.slice(8, 10) + "/" + u.slice(5, 7) + " " + u.slice(11)) : "Comunicando") + (x.a.mov === "Movimento" ? '<small class="mov">em movimento</small>' : "") + "</strong></li>";
      }).join("") + "</ul></section>";


    // Histórico do mês (como a página de histórico do BI): status por dia e por veículo.
    var meses = unicos(K.dias.map(function (d) { return d.slice(0, 7); }));
    if (meses.indexOf(fco.mes) < 0) fco.mes = meses[meses.length - 1];
    var NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    function nomeMes(m) { return NOMES_MES[+m.slice(5, 7) - 1] + " de " + m.slice(0, 4); }
    var dm = []; K.dias.forEach(function (d, i) { if (d.slice(0, 7) === fco.mes) dm.push(i); });
    var porDiaSt = dm.map(function (i) {
      var o = { C: 0, O: 0, M: 0, P: 0 };
      ids.forEach(function (f) { var c = letraSt((K.hist[f] || "")[i] || "."); if (o[c] !== undefined) o[c]++; });
      return { d: K.dias[i].slice(8, 10) + "/" + K.dias[i].slice(5, 7), partes: [o.C, o.O, o.M, o.P], total: o.C + o.O + o.M + o.P, o: o };
    });
    var somaMes = porDiaSt.reduce(function (a, x) { a.C += x.o.C; a.O += x.o.O; a.M += x.o.M; a.P += x.o.P; return a; }, { C: 0, O: 0, M: 0, P: 0 });
    var tMes = somaMes.C + somaMes.O + somaMes.M + somaMes.P;
    var veic = ids.map(function (f) {
      var h = K.hist[f] || "", cel = dm.map(function (i) { return h[i] || "."; }), n = { C: 0, O: 0, M: 0, P: 0 };
      cel.forEach(function (c) { var s2 = letraSt(c); if (n[s2] !== undefined) n[s2]++; });
      return { f: f, cel: cel, n: n, prob: n.O + n.M + n.P, temDado: n.C + n.O + n.M + n.P > 0 };
    }).filter(function (v) { return v.temDado && (fco.todos || v.prob > 0); })
      .sort(function (a, b) { return b.n.O - a.n.O || b.prob - a.prob || a.f.localeCompare(b.f); });
    var nomeLetra = { C: "Conectado", O: "Offline", M: "Manutenção", P: "Parado", m: "Manutenção (planilha)", p: "Parado (planilha)", ".": "Sem registro" };
    var clsLetra = { C: "con", O: "off", M: "man", P: "par", m: "man pl", p: "par pl", ".": "nd" };
    var historico = '<section class="card hist"><div class="hist-cab"><h3>Histórico de ' + nomeMes(fco.mes) + '</h3><label class="mes">Mês<select data-kon="mes" id="k-mes">' + meses.map(function (m) {
      return '<option value="' + m + '"' + (m === fco.mes ? " selected" : "") + ">" + nomeMes(m) + "</option>";
    }).join("") + "</select></label></div>" +
      '<p class="cs">Quantos veículos estiveram em cada situação, dia a dia. No mês: ' + ST.map(function (s2) { return s2.nome.toLowerCase() + " " + (tMes ? num(somaMes[s2.l] / tMes * 100, 1) : "0") + "%"; }).join(", ") + '.</p><ul class="legend">' + ST.map(function (s2) { return '<li><i class="c-' + s2.id + '"></i>' + s2.nome + "</li>"; }).join("") + "</ul>" +
      empilhado(porDiaSt, false, Math.max(520, porDiaSt.length * 34), ST) +
      '<h4 class="sub-h">Situação de cada veículo no mês</h4><p class="cs">' + (fco.todos ? "Todos os veículos." : "Só os veículos que tiveram algum dia offline, parado ou em manutenção.") + ' Cada quadrado é um dia. Hachurado = informado na planilha. <button type="button" class="limpar" data-ktodos="1">' + (fco.todos ? "Mostrar só com problema" : "Mostrar todos os veículos") + "</button></p>" +
      (veic.length ? '<div class="scroll mapa-st"><table class="tb tb-h"><thead><tr><th scope="col">Frota</th><th scope="col" class="r" title="Dias offline no mês">Off.</th>' + dm.map(function (i) { return '<th scope="col" class="dd">' + K.dias[i].slice(8, 10) + "</th>"; }).join("") + "</tr></thead><tbody>" + veic.map(function (v) {
        var fr = F[v.f];
        return '<tr><th scope="row">' + esc(v.f) + "<small>" + esc(fr.processo) + '</small></th><td class="r">' + v.n.O + "</td>" + v.cel.map(function (c, k) {
          return '<td class="dd"><i class="q ' + clsLetra[c] + '" title="' + esc(v.f + " em " + K.dias[dm[k]].slice(8, 10) + "/" + K.dias[dm[k]].slice(5, 7) + ": " + nomeLetra[c]) + '"></i></td>';
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>" : '<p class="cs">Nenhum veículo com problema nesse mês.</p>') + "</section>";
    var informar = '<div class="informar"><p><b>Algum equipamento parado ou em manutenção?</b> Informe na planilha de status. O painel passa a mostrar na próxima atualização.</p><a class="btn" href="' + LINK_STATUS + '" target="_blank" rel="noopener">Informar parado/manutenção <span aria-hidden="true">↗</span></a></div>';
    return filtros + kpis + '<div class="g2 g2k">' + tab + porProc + '</div><div class="g3 g-a">' + evol + sit + sis + "</div>" + historico + avisos + informar + secaoEnvio("conectividade", dbr(K.dias[nd - 1]));
  }

  function colunasProc(lp) {
    var n = lp.length; if (!n) return '<p class="cs">Sem veículos nesse filtro.</p>';
    var bw = 36, W = Math.max(360, n * bw + 90), H = 330, pl = 70, pt = 22, pb = 104, ih = H - pt - pb;
    var mx = Math.max.apply(null, lp.map(function (x) { return x.o.t; }));
    var passo = [1, 2, 5, 10, 20, 25, 50, 100].filter(function (p) { return mx / p <= 6; })[0] || 200, topo = Math.ceil(mx / passo) * passo;
    var y = function (v) { return pt + ih - v / topo * ih; };
    var sv = '<div class="scroll"><svg viewBox="0 0 ' + W + " " + H + '" class="chart colp" width="' + W + '" height="' + H + '" role="img" aria-label="Status dos veículos por processo">';
    for (var g = 0; g <= topo; g += passo) sv += '<line class="grade" x1="' + pl + '" x2="' + W + '" y1="' + y(g).toFixed(1) + '" y2="' + y(g).toFixed(1) + '"/><text class="tl" x="' + (pl - 5) + '" y="' + (y(g) + 3).toFixed(1) + '" text-anchor="end">' + g + "</text>";
    lp.forEach(function (x, i) {
      var cx = pl + 8 + i * bw, w = bw - 10, acum = 0;
      sv += '<g class="colg" data-set="processo:' + esc(x.p) + '" tabindex="0" role="button" aria-label="' + esc(x.p + ": " + x.o.t + " veículos, " + x.o.C + " conectados") + '"><rect class="hit" x="' + (cx - 4) + '" y="' + pt + '" width="' + bw + '" height="' + (ih + 30) + '" fill="transparent"/>';
      ST.forEach(function (s) {
        var v = x.o[s.l]; if (!v) return;
        sv += '<rect class="seg c-' + s.id + '" x="' + cx + '" y="' + y(acum + v).toFixed(1) + '" width="' + w + '" height="' + (v / topo * ih).toFixed(1) + '" style="animation-delay:' + i * 40 + 'ms"><title>' + esc(x.p + " · " + s.nome + ": " + v) + "</title></rect>";
        acum += v;
      });
      sv += '<text class="tv" x="' + (cx + w / 2) + '" y="' + (y(x.o.t) - 5).toFixed(1) + '" text-anchor="middle">' + x.o.t + "</text>";
      // rótulo inclinado embaixo da coluna
      var rot = x.p.length > 17 ? x.p.slice(0, 16) + "…" : x.p, lx = cx + w / 2 + 3, ly = pt + ih + 10;
      sv += '<text class="tl tp" x="' + lx + '" y="' + ly + '" text-anchor="end" transform="rotate(-40 ' + lx + " " + ly + ')">' + esc(rot) + "</text></g>";
    });
    return sv + "</svg></div>";
  }

  function linhaDias(serie, dias, sel, off) {
    off = off || 0;
    var W = 440, H = 260, pl = 34, pr = 12, pt = 20, pb = 26, iw = W - pl - pr, ih = H - pt - pb, n = serie.length;
    var mx = Math.max.apply(null, [1].concat(serie.map(function (o) { return o.C; })));
    var topo = Math.ceil(mx * 1.1 / 10) * 10;
    var x = function (i) { return pl + (n > 1 ? i / (n - 1) : .5) * iw; }, y = function (v) { return pt + ih - v / topo * ih; };
    var sv = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart big" role="img" aria-label="Conectados e offline por dia">';
    for (var g = 0; g <= 4; g++) { var v = Math.round(topo * g / 4), yy = y(v); sv += '<line class="grade" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/><text class="tl" x="' + (pl - 5) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end">' + v + "</text>"; }
    ["C", "O"].forEach(function (k) {
      sv += '<polyline class="ln ln-' + k + '" fill="none" points="' + serie.map(function (o, i) { return x(i).toFixed(1) + "," + y(o[k]).toFixed(1); }).join(" ") + '"/>';
    });
    var passo = Math.max(1, Math.ceil(n / 7));
    serie.forEach(function (o, i) {
      if ((i % passo === 0 && n - 1 - i >= passo / 2) || i === n - 1) sv += '<text class="tl" x="' + x(i).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + dias[i].slice(8, 10) + "/" + dias[i].slice(5, 7) + "</text>";
      sv += '<circle class="pt' + (i === sel ? " on" : "") + '" cx="' + x(i).toFixed(1) + '" cy="' + y(o.C).toFixed(1) + '" r="' + (i === sel ? 5 : 3) + '" data-kdia="' + (i + off) + '"><title>' + dias[i].slice(8, 10) + "/" + dias[i].slice(5, 7) + ": " + o.C + " conectados, " + o.O + " offline</title></circle>";
    });
    var s = serie[sel];
    sv += '<text class="tv" x="' + x(sel).toFixed(1) + '" y="' + (y(s.C) - 9).toFixed(1) + '" text-anchor="middle">' + s.C + "</text>";
    return sv + '</svg><ul class="legend"><li><i class="c-con"></i>Conectados</li><li><i class="c-off"></i>Offline</li></ul>';
  }

  // Câmeras: visualizador do relatório do dia (sem histórico). A observação de cada veículo
  // fica salva só neste navegador e só para o relatório deste dia.
  var fcm = { tipo: "" };
  var OBS = [["", "Pendente"], ["ok", "Câmera ok"], ["int", "Intermitência temporária"], ["rel", "Erro no relatório"], ["def", "Defeito confirmado"]];
  var OBS_RESOLVE = { ok: 1, int: 1, rel: 1 };
  var CHAVE_OBS = "painel-frotas-cameras-obs";
  // Um quadro por câmera; cada coluna marca o defeito daquela câmera.
  var QUADROS = [
    { nome: "Câmera do motorista", tipo: "motorista", cols: ["Intermitente", "Mal posicionada"], rot: ["Intermit.", "Mal posic."] },
    { nome: "Câmera do motorista não funcionando", tipo: "motorista", cols: ["Não funcionando"], rot: ["Câmera"] },
    { nome: "Câmera da pista intermitente", tipo: "pista", cols: ["Intermitente"], rot: ["Câmera"] },
    { nome: "Câmera da pista não funcionando", tipo: "pista", cols: ["Não funcionando"], rot: ["Câmera"] },
    { nome: "Câmeras de auditoria intermitentes", tipo: "auditoria", cols: ["Intermitente"], rot: ["Câmeras"], qtd: true }
  ];
  var NOME_OC = { motorista: "Câmera motorista", pista: "Câmera pista", auditoria: "Auditoria", gps: "GPS" };
  var X_ICO = '<svg class="cm-x" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/></svg>';
  var V_ICO = '<svg class="cm-v-ok" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';
  function obsLer() {
    try { var o = JSON.parse(localStorage.getItem(CHAVE_OBS) || "{}"); return o && o.dia === D.cameras.dia ? o.obs || {} : {}; } catch (e) { return {}; }
  }
  var obsMem = {}; // vale nesta visita, mesmo se o navegador não deixar salvar
  function obsGravar(k, v) {
    obsMem[k] = v;
    var o = obsLer(); if (v) o[k] = v; else delete o[k];
    try { localStorage.setItem(CHAVE_OBS, JSON.stringify({ dia: D.cameras.dia, obs: o })); } catch (e) { /* fica só nesta visita */ }
  }
  function obsTodas() { var o = obsLer(); for (var k in obsMem) o[k] = obsMem[k]; return o; }
  function hbr(s) { return s ? s.slice(8, 10) + "/" + s.slice(5, 7) + " " + s.slice(11) : "—"; }
  function camFiltrados() {
    var M = D.cameras, processos = unicos(Object.keys(M.proc));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    var ps = processos.filter(function (p) { return !fil_.processo || p === fil_.processo; });
    var r = { n: 0, tk: 0, ev: 0, st: {}, gps: {} };
    ps.forEach(function (p) {
      var x = M.proc[p]; r.n += x.n; r.tk += x.tk; r.ev += x.ev;
      ["st", "gps"].forEach(function (k) { for (var s in x[k]) r[k][s] = (r[k][s] || 0) + x[k][s]; });
    });
    return { processos: processos, r: r, lista: M.lista.filter(function (v) { return !fil_.processo || v.processo === fil_.processo; }) };
  }
  // Linhas dos quadros: um veículo por câmera com defeito. O status é por veículo e câmera.
  function camLinhas(lista) {
    var out = [];
    QUADROS.forEach(function (q, qi) {
      lista.forEach(function (v) {
        var ds = v.d.filter(function (d) { return d[0] === q.tipo && q.cols.indexOf(d[1]) >= 0; });
        if (ds.length) out.push({ q: q, qi: qi, v: v, ds: ds, k: v.f + "|" + qi });
      });
    });
    return out;
  }
  function abaCameras() {
    var M = D.cameras, obs = obsTodas(), F = camFiltrados(), r = F.r, linhas = camLinhas(F.lista);
    function pendente(l) { return !OBS_RESOLVE[obs[l.k]]; }
    var nPend = linhas.filter(pendente).length;

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="cm-processo">' + opcoes(F.processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      (fil_.processo ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      (linhas.length ? '<button type="button" class="limpar" data-cbaixar="1">Baixar lista (Excel)</button>' : "") +
      '<p class="ctx">Relatório de ' + M.dia.slice(8, 10) + "/" + M.dia.slice(5, 7) + " às " + esc(M.hora) + "</p></div>";

    var kpi = function (cls, icone, rot, v, sub) {
      return '<article class="kpi ' + cls + '"><div class="kh">' + ico(icone) + '<span class="kl">' + rot + '</span></div><strong class="kv">' + v + '</strong><span class="ks">' + sub + "</span></article>";
    };
    var kpis = '<div class="kpis kpis4">' +
      kpi("c-con", "M12 21a9 9 0 100-18 9 9 0 000 18M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3", "Frotas monitoradas", num(r.n, 0), "no relatório do dia") +
      kpi("c-vel", "M3 3v18h18M7 15l4-4 3 3 5-6", "Geraram eventos comportamentais hoje", num(r.ev, 0), r.n ? num(r.ev / r.n * 100, 1) + "% da frota" : "&nbsp;") +
      kpi("c-man", "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z", "Chamados em aberto", num(r.tk, 0), "tickets com a Platform Science") +
      kpi("c-off", "M12 3l9 16H3zM12 10v4M12 17h.01", "Câmeras com defeito", num(nPend, 0), nPend ? "a confirmar" : "&nbsp;") + "</div>";

    function roscaCard(titulo, sub, cats) {
      var t = sum(cats, function (c) { return c.n; });
      return '<section class="card"><h3>' + titulo + '</h3><p class="cs">' + sub + '</p><div class="rosca-w rosca-l">' + rosca(cats.filter(function (c) { return c.n; }), t) + '<ul class="rleg">' + cats.map(function (c) {
        return '<li><i class="c-' + c.id + '"></i><span>' + c.nome + "</span><b>" + num(c.n, 0) + "</b></li>";
      }).join("") + "</ul></div></section>";
    }
    var st = r.st;
    var saude = roscaCard("Saúde da frota", "Status geral do equipamento no relatório.", [
      { id: "lib", nome: "Saudável", n: st["Saudável"] || 0 }, { id: "ava", nome: "Avalie", n: st["Avalie"] || 0 },
      { id: "ate", nome: "Atenção", n: st["Atenção"] || 0 }, { id: "na", nome: "N/A", n: st["N/A"] || 0 }]);
    var gps = roscaCard("Status GPS", "Sinal de GPS de cada equipamento.", [
      { id: "lib", nome: "Saudável", n: r.gps["Saudável"] || 0 }, { id: "ate", nome: "Não saudável", n: r.gps["Não Saudável"] || 0 }]);

    // Um quadro por câmera; abaixo de cada veículo, o status para confirmar se a câmera está mesmo com defeito.
    var quadros = QUADROS.map(function (q, qi) {
      var ls = linhas.filter(function (l) { return l.qi === qi; }), np = ls.filter(pendente).length;
      return '<section class="card cm-q"><h3>' + esc(q.nome) + ' <span class="cnt ' + (np ? "off" : "zero") + '">' + np + "</span></h3>" +
        (ls.length ? '<table class="tb tb-q"><thead><tr><th scope="col">Frota</th>' + (q.rot || q.cols).map(function (c, j) { return '<th scope="col" class="c" title="' + esc(q.cols[j]) + '">' + esc(c) + "</th>"; }).join("") + "</tr></thead>" + ls.map(function (l) {
          var v = l.v, o = obs[l.k] || "", res = !!OBS_RESOLVE[o], id = "cm-obs-" + qi + "-" + v.f;
          var tk = v.ticket ? '<a href="' + esc(v.ticket) + '" target="_blank" rel="noopener">' + esc(v.ticket.split("/").pop()) + "</a>" + (v.tst ? " · " + esc(v.tst) : "") : "";
          return '<tbody class="' + (res ? "cm-ok" : o === "def" ? "cm-def" : "cm-pen") + '"><tr><th scope="row">' + esc(v.f) + "<small>" + esc(v.processo) + "</small></th>" + q.cols.map(function (c) {
            var d = l.ds.filter(function (x) { return x[1] === c; })[0];
            if (!d) return '<td class="c"></td>';
            return '<td class="c">' + (res ? V_ICO : X_ICO) + (q.qtd && d[2] > 1 ? "<b>" + d[2] + "</b>" : "") + '<span class="sr">' + (res ? "revisado" : "com defeito") + "</span></td>";
          }).join("") + '</tr><tr class="cm-st"><td colspan="' + (q.cols.length + 1) + '">' + (tk ? '<small class="cm-tk">' + tk + "</small>" : "") +
            '<select class="obs obs-' + (o || "pen") + '" data-obs="' + esc(l.k) + '" id="' + esc(id) + '" aria-label="Status de ' + esc(v.f) + ", " + esc(q.nome) + '">' + OBS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === o ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></td></tr></tbody>";
        }).join("") + "</table>" : '<p class="cm-vazio">Nenhum veículo.</p>') + "</section>";
    }).join("");

    return filtros + kpis + '<div class="cm-grade">' + quadros + '</div><div class="g2 g2-eq">' + saude + gps + "</div>" + secaoEnvio("cameras", M.dia.slice(8, 10) + "/" + M.dia.slice(5, 7) + "/" + M.dia.slice(0, 4) + " às " + M.hora);
  }
  function camBaixar() {
    var M = D.cameras, obs = obsTodas(), nomes = {};
    OBS.forEach(function (x) { nomes[x[0]] = x[1]; });
    function c(x) { x = String(x == null ? "" : x); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
    var linhas = [["Câmera", "Frota", "Placa", "Processo", "Situação", "Defeito", "Ticket", "Status do ticket", "Última foto", "Último vídeo", "Status"]].concat(camLinhas(camFiltrados().lista).map(function (l) {
      var v = l.v;
      return [l.q.nome, v.f, v.placa, v.processo, v.sit, l.ds.map(function (d) { return d[1] + (l.q.qtd ? " (" + d[2] + ")" : ""); }).join(", "), v.ticket, v.tst, hbr(v.foto), hbr(v.video), nomes[obs[l.k] || ""]];
    }));
    var blob = new Blob(["﻿" + linhas.map(function (r) { return r.map(c).join(";"); }).join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "cameras-" + M.dia + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- Resumo: os últimos 7 dias de cada aba, com diagnóstico ----------
  // Cada área usa os 7 dias até o último dia com dados dela e compara com os 7 dias anteriores.
  var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  function dd(s) { return s.slice(8, 10) + "/" + s.slice(5, 7); }
  function isoMais(s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function diaSem(s) { return SEMANA[new Date(s + "T12:00:00").getDay()]; }
  function noProc(p) { return !fil_.processo || p === fil_.processo; }

  // Colunas dos 7 dias; null = dia sem dados. O último dia fica em amarelo.
  function barras7(vals, dias, fmt, rotulo) {
    var W = 210, H = 66, base = 46, bw = W / vals.length;
    var mx = Math.max.apply(null, [0].concat(vals.filter(function (v) { return v !== null; }))) || 1;
    var desc = vals.map(function (v, i) { return dd(dias[i]) + " " + (v === null ? "sem dados" : fmt(v)); }).join(", ");
    var s = '<svg class="rz-b" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(rotulo + ": " + desc) + '">';
    vals.forEach(function (v, i) {
      var x = i * bw + bw * .18, w = bw * .64, cx = (i * bw + bw / 2).toFixed(1), dica = dd(dias[i]) + " (" + diaSem(dias[i]) + "): " + (v === null ? "sem dados" : fmt(v));
      if (v === null) s += '<rect class="rz-nd" x="' + x.toFixed(1) + '" y="' + (base - 2) + '" width="' + w.toFixed(1) + '" height="2" rx="1"/>';
      else { var h = Math.max(v / mx * (base - 4), v > 0 ? 3 : 1); s += '<rect class="rz-col' + (i === vals.length - 1 ? " ult" : "") + '" x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2"/>'; }
      s += '<text class="tl" x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + diaSem(dias[i]) + "</text>" +
        '<rect class="rz-hit" fill="#000" fill-opacity="0" x="' + (i * bw).toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + H + '"><title>' + esc(dica) + "</title></rect>";
    });
    return s + "</svg>";
  }
  function deltaPP(cur, ant) {
    if (cur === null || ant === null) return '<span class="dl neutro">sem base</span>';
    var v = cur - ant, ig = Math.abs(v) < 0.05;
    return '<span class="dl ' + (ig ? "neutro" : v < 0 ? "bom" : "ruim") + '"><span aria-hidden="true">' + (ig ? "=" : v < 0 ? "↓" : "↑") + "</span> " + (v > 0 ? "+" : "") + num(v, 1).replace("-", "−") + " p.p.</span>";
  }

  // Semana do Resumo: segunda a domingo da última semana fechada (o domingo mais recente antes de hoje),
  // comparada com a segunda a domingo anterior. Mesma semana do resumo enviado no WhatsApp.
  function semanaRef() {
    var h = new Date(); h.setHours(12, 0, 0, 0);
    var volta = h.getDay() || 7; // dias até o domingo anterior (segunda 1, terça 2, ..., domingo 7)
    h.setDate(h.getDate() - volta);
    var fim = h.getFullYear() + "-" + pad(h.getMonth() + 1) + "-" + pad(h.getDate()), dias = [];
    for (var k = 6; k >= 0; k--) dias.push(isoMais(fim, -k));
    return { ini: dias[0], fim: fim, dias: dias, ant: dias.map(function (d) { return isoMais(d, -7); }) };
  }
  function entre(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
  function semDados(S, aba, nome, un) {
    return { aba: aba, nome: nome, ini: S.ini, fim: S.fim, valor: "—", un: un, delta: '<span class="dl neutro">sem dados</span>',
      graf: barras7(S.dias.map(function () { return null; }), S.dias, String, nome), diag: "Ainda sem dados desta semana.", alertas: [] };
  }

  function rzComportamento(S) {
    var C = D.comportamento; if (!C) return null;
    var F = C.frotas, T = C.tipos, ultT = {};
    // Leves e pesadas vêm de BIs diferentes: só contam os dias que as duas já têm.
    C.ev.forEach(function (e) { var t = (F[e[2]] || {}).frota || ""; if (!(ultT[t] >= e[0])) ultT[t] = e[0]; });
    var fimC = Math.min.apply(null, Object.keys(ultT).map(function (t) { return ultT[t]; }).concat(C.ndias - 1));
    var i0 = entre(C.inicio, S.ini), a0 = i0 - 7;
    var por = S.dias.map(function (_, k) { return i0 + k <= fimC && i0 + k >= 0 ? 0 : null; });
    var okA = S.dias.map(function (_, k) { return por[k] !== null && a0 + k >= 0; });
    if (por.every(function (v) { return v === null; })) return semDados(S, "comportamento", "Comportamental", "ocorrências");
    var cur = 0, ant = 0, porT = T.map(function () { return 0; }), porTA = porT.slice(), porP = {}, porF = {}, porFC = {};
    var ci = T.map(function (t) { var g = t.grupo || t.id; for (var j = 0; j < CATS.length; j++) if (CATS[j].id === g) return j; return -1; });
    var porDC = S.dias.map(function () { return CATS.map(function () { return 0; }); });
    // Turno pela hora da ocorrência (5º item do ev): 0 = A, 1 = B, 2 = C; sem o item = sem hora.
    var tu = [0, 0, 0, 0], tuA = [0, 0, 0, 0], tuC = [0, 1, 2, 3].map(function () { return CATS.map(function () { return 0; }); });
    // Hora cheia (6º item do ev), para os picos por hora.
    var hr = [], hrC = [];
    for (var h0 = 0; h0 < 24; h0++) { hr.push(0); hrC.push(CATS.map(function () { return 0; })); }
    C.ev.forEach(function (e) {
      var f = F[e[2]]; if (!f || !noProc(f.processo) || e[0] > fimC || ci[e[1]] < 0) return; // só tipos com card
      var k = e[0] - i0, q = e[0] - a0, t0 = e.length > 4 ? e[4] : 3, nk = k >= 0 && k < 7 && por[k] !== null;
      // Quadros de turno: todos os turnos (são eles que filtram); o resto, só os turnos escolhidos.
      var hOk = horaOk(e);
      if (nk) { if (hOk) { tu[t0] += e[3]; tuC[t0][ci[e[1]]] += e[3]; } if (turnoOk(e) && e.length > 5) { hr[e[5]] += e[3]; hrC[e[5]][ci[e[1]]] += e[3]; } }
      else if (hOk && q >= 0 && q < 7 && okA[q]) tuA[t0] += e[3];
      if (!turnoOk(e) || !hOk) return;
      if (nk) {
        por[k] += e[3]; cur += e[3]; porT[e[1]] += e[3]; porP[f.processo] = (porP[f.processo] || 0) + e[3]; porF[e[2]] = (porF[e[2]] || 0) + e[3];
        if (ci[e[1]] >= 0) { var pfc = porFC[e[2]] || (porFC[e[2]] = CATS.map(function () { return 0; })); pfc[ci[e[1]]] += e[3]; }
        porDC[k][ci[e[1]]] += e[3];
      }
      else if (q >= 0 && q < 7 && okA[q]) { ant += e[3]; porTA[e[1]] += e[3]; }
    });
    var cats = CATS.map(function (c) {
      var ix = T.map(function (t, i) { return (t.grupo || t.id) === c.id ? i : -1; }).filter(function (i) { return i >= 0; });
      return { c: c, n: sum(ix, function (i) { return porT[i]; }), a: sum(ix, function (i) { return porTA[i]; }) };
    }).sort(function (x, y) { return y.n - x.n; });
    var procs = Object.keys(porP).sort(function (x, y) { return porP[y] - porP[x]; });
    var al = [], i3 = T.map(function (t) { return t.id; }).indexOf("vel3");
    if (i3 >= 0 && porT[i3]) al.push(["ruim", "!", "<b>" + num(porT[i3], 0) + "</b> " + plural(porT[i3], "excesso", "excessos") + " de velocidade acima de 50% do limite da via."]);
    cats.forEach(function (x) {
      if ((x.c.id === "celular" || x.c.id === "cinto") && x.n) al.push(["ruim", "!", "<b>" + num(x.n, 0) + "</b> " + plural(x.n, "ocorrência", "ocorrências") + " de " + esc(x.c.nome.toLowerCase()) + "."]);
    });
    var sobe = cats.filter(function (x) { return x.a + x.n >= 10 && x.a > 0 && (x.n - x.a) / x.a > .1; })
      .sort(function (x, y) { return (y.n - y.a) / y.a - (x.n - x.a) / x.a; })[0];
    if (sobe) al.push(["atencao", "↑", "<b>" + esc(sobe.c.nome) + "</b> subiu " + num((sobe.n - sobe.a) / sobe.a * 100, 0) + "% em relação à semana anterior."]);
    var diag = cur ? "<b>" + esc(cats[0].c.nome) + "</b> é " + num(cats[0].n / cur * 100, 0) + "% das ocorrências" +
      (procs.length > 1 ? "; <b>" + esc(procs[0]) + "</b> concentra " + num(porP[procs[0]] / cur * 100, 0) + "%." : ".") : "Nenhuma ocorrência na semana.";
    var dFim = isoMais(C.inicio, fimC);
    return { aba: "comportamento", nome: "Comportamental", ini: S.ini, fim: S.fim, ate: dFim < S.fim ? dFim : null,
      valor: num(cur, 0), un: plural(cur, "ocorrência", "ocorrências"), delta: ant ? delta(cur, ant) : '<span class="dl neutro">sem base</span>',
      graf: barras7(por, S.dias, function (v) { return num(v, 0) + " " + plural(v, "ocorrência", "ocorrências"); }, "Ocorrências por dia"),
      diag: diag, alertas: al, cur: cur, ant: ant, tu: tu, tuA: tuA, tuC: tuC, hr: hr, hrC: hrC, vals: por, porDC: porDC, cats: cats, porP: porP, porF: porF, porFC: porFC, frotas: F,
      vel: ["vel1", "vel2", "vel3"].map(function (id) { var i = T.map(function (t) { return t.id; }).indexOf(id); return i >= 0 ? { nome: T[i].nome, n: porT[i] } : null; }).filter(Boolean) };
  }

  function rzOcioso(S) {
    var M = D.motorOcioso; if (!M || !M.ultDias) return null;
    var U = M.ultDias, meta = M.metaPct, vs = M.veiculos.filter(function (v) { return noProc(v.processo) && v.dl; });
    function tot(d) {
      var k = U.indexOf(d); if (k < 0) return null;
      var l = sum(vs, function (v) { return v.dl[k] || 0; }); return l ? { k: k, l: l, o: sum(vs, function (v) { return v.do[k] || 0; }) } : null;
    }
    var cur = S.dias.map(tot), ant = S.ant.map(tot);
    if (cur.every(function (x) { return !x; })) return semDados(S, "motor-ocioso", "Motor ocioso", "do tempo ligado parado");
    var lc = 0, oc = 0, la = 0, oa = 0;
    cur.forEach(function (x, i) { if (!x) return; lc += x.l; oc += x.o; if (ant[i]) { la += ant[i].l; oa += ant[i].o; } });
    var pct = lc ? oc / lc * 100 : null, pAnt = la ? oa / la * 100 : null;
    var ks = cur.filter(Boolean).map(function (x) { return x.k; });
    var rows = vs.map(function (v) {
      var l = sum(ks, function (k) { return v.dl[k] || 0; }), o = sum(ks, function (k) { return v.do[k] || 0; });
      return { v: v, l: l, o: o, p: l ? o / l * 100 : 0 };
    }).filter(function (r) { return r.l >= 2; });
    var acima = rows.filter(function (r) { return r.p > meta; }).sort(function (a, b) { return b.p - a.p; });
    var al = [];
    if (pct !== null && pct > meta) al.push(["ruim", "!", "Motor ocioso em <b>" + num(pct, 1) + "%</b>, acima da meta de " + meta + "%."]);
    if (acima.length) al.push(["atencao", "▲", "<b>" + acima.length + "</b> " + plural(acima.length, "veículo passou", "veículos passaram") + " da meta de " + meta + "%; o <b>" + esc(acima[0].v.id) + "</b> ficou " + num(acima[0].p, 1) + "% do tempo ligado parado."]);
    var diag = (acima.length ? "<b>" + acima.length + "</b> " + plural(acima.length, "veículo acima", "veículos acima") + " da meta de " + meta + "%. " : "Todos os veículos dentro da meta de " + meta + "%. ") + horas(oc) + " de motor ligado parado.";
    var ultD = S.dias.filter(function (d, i) { return cur[i]; }).pop();
    return { aba: "motor-ocioso", nome: "Motor ocioso", ini: S.ini, fim: S.fim, ate: ultD < S.fim ? ultD : null,
      valor: num(pct, 1) + "%", un: "do tempo ligado parado", delta: deltaPP(pct, pAnt),
      graf: barras7(cur.map(function (x) { return x ? x.o / x.l * 100 : null; }), S.dias, function (v) { return num(v, 1) + "%"; }, "Motor ocioso por dia"),
      diag: diag, alertas: al, pct: pct, pAnt: pAnt, oc: oc, lc: lc, meta: meta, acima: acima.length, acimaL: acima.slice(0, 3), rows: rows,
      vals: cur.map(function (x) { return x ? x.o / x.l * 100 : null; }),
      procs: (function () {
        var o = {}; rows.forEach(function (r) { var p = o[r.v.processo] || (o[r.v.processo] = { nome: r.v.processo, l: 0, o: 0 }); p.l += r.l; p.o += r.o; });
        return Object.keys(o).map(function (k) { var p = o[k]; p.p = p.l ? p.o / p.l * 100 : 0; return p; }).sort(function (a, b) { return b.p - a.p; });
      })() };
  }

  function rzPermanencia(S) {
    var P = D.permanencia; if (!P || !P.eventos.length) return null;
    var V = P.veiculos, ult = P.eventos[P.eventos.length - 1][5];
    var porDia = S.dias.map(function (d) { return d <= ult ? 0 : null; });
    if (porDia[0] === null) return semDados(S, "permanencia", "Permanência", "parados");
    var loc = {}, n = 0, min = 0, minA = 0, evS = [];
    P.eventos.forEach(function (e) {
      var v = V[e[0]]; if (!v || !noProc(v.processo)) return;
      var k = S.dias.indexOf(e[5]), q = S.ant.indexOf(e[5]);
      if (k >= 0 && porDia[k] !== null) {
        n++; min += e[3]; porDia[k] += e[3]; evS.push(e);
        var x = loc[e[4]] || (loc[e[4]] = { i: e[4], n: 0, min: 0, fr: {} }); x.n++; x.min += e[3]; x.fr[e[0]] = 1;
      } else if (q >= 0 && porDia[q] !== null) minA += e[3];
    });
    var top = Object.keys(loc).map(function (q) { return loc[q]; }).sort(function (a, b) { return b.min - a.min; });
    // Nas observações só entram estabelecimentos (postos, padarias, restaurantes...).
    var est = top.filter(function (x) { return P.locais[x.i].tipo === "estabelecimento"; })[0];
    var al = [];
    if (est) al.push(["atencao", "◷", "Paradas em <b>" + esc(P.locais[est.i].nome) + "</b> somam " + hmin(est.min) + " na semana (" + est.n + " " + plural(est.n, "vez", "vezes") + ", média de " + hmin(est.min / est.n) + ")."]);
    var diag = n ? num(n, 0) + " " + plural(n, "permanência", "permanências") + " em " + top.length + " " + plural(top.length, "local", "locais") + "." +
      (est ? " O estabelecimento com mais tempo parado é <b>" + esc(P.locais[est.i].nome) + "</b>." : "") : "Nenhuma permanência na semana.";
    return { aba: "permanencia", nome: "Permanência", ini: S.ini, fim: S.fim, ate: ult < S.fim ? ult : null,
      valor: min >= 600 ? num(Math.round(min / 60), 0) + " h" : hmin(min), un: "parados em " + num(n, 0) + " " + plural(n, "permanência", "permanências"), delta: minA ? delta(min, minA) : '<span class="dl neutro">sem base</span>',
      graf: barras7(porDia, S.dias, hmin, "Tempo de permanência por dia"),
      diag: diag, alertas: al, top: top.slice(0, 5), locais: P.locais, vals: porDia, n: n, min: min,
      longas: evS.sort(function (a, b) { return b[3] - a[3]; }).slice(0, 3),
      // Pontos de parada da mensagem semanal: só estabelecimentos, pelos que mais receberam paradas.
      topEst: top.filter(function (x) { return P.locais[x.i].tipo === "estabelecimento"; }).sort(function (a, b) { return b.n - a.n || b.min - a.min; }).slice(0, 3),
      obs: " em " + top.length + " " + plural(top.length, "local", "locais") + "." + (est ? " O estabelecimento com mais tempo parado é <b>" + esc(P.locais[est.i].nome) + "</b> (" + hmin(est.min) + " em " + est.n + " " + plural(est.n, "vez", "vezes") + ")." : "") };
  }

  function rzConectividade(S) {
    var K = D.conectividade; if (!K || !K.dias.length) return null;
    var nd = K.dias.length, ids = Object.keys(K.frotas).filter(function (f) { return noProc(K.frotas[f].processo); });
    function conta(i) {
      var o = { C: 0, O: 0, M: 0, P: 0 };
      ids.forEach(function (f) { var s = letraSt((K.hist[f] || "")[i] || "."); if (o[s] !== undefined) o[s]++; });
      return o;
    }
    // Conectividade no Resumo é a situação atual (último dia com dados), não a da semana do Resumo.
    var li = -1;
    for (var q0 = nd - 1; q0 >= 0 && li < 0; q0--) { var o0 = conta(q0); if (o0.C + o0.O + o0.M + o0.P) li = q0; }
    if (li < 0) return semDados(S, "conectividade", "Conectividade", "veículos offline");
    var dias7 = []; for (var k7 = 6; k7 >= 0; k7--) dias7.push(isoMais(K.dias[li], -k7));
    var vals = dias7.map(function (d) { var i = K.dias.indexOf(d); if (i < 0) return null; var o = conta(i); return o.C + o.O + o.M + o.P ? o.O : null; });
    var hoje = conta(li), ia = K.dias.indexOf(isoMais(K.dias[li], -7)), antes = ia >= 0 ? conta(ia) : null, tot = hoje.C + hoje.O + hoje.M + hoje.P;
    var longos = ids.map(function (f) {
      var h = K.hist[f] || "", d = 0; for (var q = li; q >= 0 && h[q] === "O"; q--) d++;
      return { f: f, d: d };
    }).filter(function (x) { return x.d >= 2; }).sort(function (a, b) { return b.d - a.d; });
    var al = [];
    if (longos.length) al.push([longos[0].d >= 5 ? "ruim" : "atencao", "⌁", "<b>" + longos.length + "</b> " + plural(longos.length, "veículo está", "veículos estão") + " offline há 2 dias ou mais; o <b>" + esc(longos[0].f) + "</b> há " + longos[0].d + " dias."]);
    var diag = num(hoje.C, 0) + " de " + num(tot, 0) + " " + plural(tot, "veículo conectado", "veículos conectados") + "; " + hoje.M + " em manutenção e " + hoje.P + " " + plural(hoje.P, "parado", "parados") + ".";
    return { aba: "conectividade", nome: "Conectividade", ini: dias7[0], fim: K.dias[li], ate: null, atual: true,
      valor: num(hoje.O, 0), un: plural(hoje.O, "veículo offline", "veículos offline") + " na situação atual, de " + dd(K.dias[li]),
      delta: antes ? delta(hoje.O, antes.O) : '<span class="dl neutro">sem base</span>',
      graf: barras7(vals, dias7, function (v) { return v + " offline"; }, "Veículos offline por dia"),
      diag: diag, alertas: al, offline: hoje.O, hoje: hoje, tot: tot, dia: K.dias[li], vals: vals,
      longos: longos.slice(0, 5).map(function (x) { return { f: x.f, d: x.d, processo: K.frotas[x.f].processo }; }), nLongos: longos.length };
  }

  var CAM_CURTO = ["Motorista, intermitente ou mal posicionada", "Motorista sem funcionar", "Pista intermitente", "Pista sem funcionar", "Auditoria"];
  function rzCameras() {
    var M = D.cameras; if (!M) return null;
    var obs = obsTodas(), F = camFiltrados(), linhas = camLinhas(F.lista).filter(function (l) { return !OBS_RESOLVE[obs[l.k]]; });
    var porQ = QUADROS.map(function (q, qi) { return { q: q, n: linhas.filter(function (l) { return l.qi === qi; }).length }; });
    var nv = Object.keys(linhas.reduce(function (o, l) { o[l.v.f] = 1; return o; }, {})).length;
    var al = [];
    if (linhas.length) al.push(["atencao", "◉", "<b>" + linhas.length + "</b> " + plural(linhas.length, "câmera com defeito", "câmeras com defeito") + " a confirmar em " + nv + " " + plural(nv, "veículo", "veículos") + (F.r.tk ? "; " + F.r.tk + " " + plural(F.r.tk, "chamado aberto", "chamados abertos") + " com a Platform Science." : ".")]);
    var g = '<ul class="rz-cam" aria-label="Defeitos a confirmar por câmera">' + porQ.map(function (x, qi) {
      return '<li class="' + (x.n ? "tem" : "") + '"><b>' + x.n + "</b><span>" + esc(CAM_CURTO[qi]) + "</span></li>";
    }).join("") + "</ul>";
    return { aba: "cameras", nome: "Câmeras", ini: M.dia, fim: M.dia, dia: true,
      valor: num(linhas.length, 0), un: plural(linhas.length, "defeito a confirmar", "defeitos a confirmar"),
      delta: '<span class="dl neutro">relatório do dia</span>', graf: g,
      diag: num(F.r.n, 0) + " " + plural(F.r.n, "frota", "frotas") + " no relatório das " + esc(M.hora) + "; " + num(F.r.tk, 0) + " " + plural(F.r.tk, "chamado aberto", "chamados abertos") + ".",
      alertas: al, pend: linhas.length, porQ: porQ, nv: nv, tk: F.r.tk };
  }

  // Ícones das áreas (os mesmos da mensagem do WhatsApp: semáforo, combustível, local, sinal, câmera).
  var RZ_ICO = {
    "comportamento": "M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 5.2a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2zM12 10.4a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2zM12 15.6a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2z",
    "motor-ocioso": "M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.8a2 2 0 0 0-.6-1.4L18 5",
    "permanencia": "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6z",
    "conectividade": "M5 12.6a11 11 0 0 1 14 0M1.5 9a16 16 0 0 1 21 0M8.5 16.1a6 6 0 0 1 7 0M12 20h.01",
    "cameras": "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 10a3 3 0 1 0 0 6a3 3 0 1 0 0-6z"
  };
  // Resumo em estilo dashboard (BI): cards de indicadores, gráficos por dia, tipo e processo, e alertas.
  function rzSpark(vals) {
    var vs = vals.filter(function (v) { return v !== null && v !== undefined; }), mx = Math.max.apply(null, [0].concat(vs)) || 1, ult = -1;
    vals.forEach(function (v, i) { if (v !== null && v !== undefined) ult = i; });
    return '<span class="rz-sp" aria-hidden="true">' + vals.map(function (v, i) {
      return v === null || v === undefined ? '<i class="nd"></i>' : '<i' + (i === ult ? ' class="ult"' : "") + ' style="height:' + Math.max(v / mx * 100, 6).toFixed(0) + '%"></i>';
    }).join("") + "</span>";
  }
  function rzBarras(itens, fmt, opt) {
    // itens: [{nome, v, sub?, cls?}] em ordem; barras horizontais com escala até o maior (ou opt.max).
    opt = opt || {};
    var mx = opt.max || Math.max.apply(null, [1].concat(itens.map(function (x) { return x.v; })));
    return '<div class="rz-hb">' + itens.map(function (x, i) {
      return '<div class="rz-hr"><span class="t">' + esc(x.nome) + '</span><span class="n' + (x.cls ? " " + x.cls : "") + '">' + fmt(x) + '</span><div class="bb"' +
        (opt.meta ? ' style="--meta:' + (opt.meta / mx * 100).toFixed(1) + '%"' : "") + '><div class="ff' + (x.cls ? " " + x.cls : "") + '" style="width:' + Math.min(x.v / mx * 100, 100).toFixed(1) + "%;--i:" + i + '"></div></div></div>';
    }).join("") + "</div>";
  }
  function rzCard(titulo, sub, corpo, cls) {
    return '<section class="card rz-c' + (cls ? " " + cls : "") + '"><div class="rz-ch"><h3>' + titulo + "</h3>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" + corpo + "</section>";
  }

  // Balanço por turno (A 07:00–15:10, B 15:10–23:10, C 23:10–07:00) e horas de pico das ocorrências
  // comportamentais. c = {cur, tu, tuA, tuC, hr, hrC}; per = período ("semana 02/11 – 08/11");
  // daPer = "da semana"; varTxt = de onde vem a variação. Usado no Resumo e na aba Comportamental.
  function blocosHorario(c, per, daPer, varTxt) {
    var linhas = [];
    var tuTot = c ? c.tu[0] + c.tu[1] + c.tu[2] + c.tu[3] : 0;
    if (c && tuTot) {
      // Sem período anterior com dados (ex.: "Todo o período"), não mostra a variação nem o "sem base".
      var temAnt = c.tuA[0] + c.tuA[1] + c.tuA[2] + c.tuA[3] > 0;
      var TURNOS = [["A", "07:00 – 15:10"], ["B", "15:10 – 23:10"], ["C", "23:10 – 07:00"]];
      var mxT = Math.max.apply(null, c.tu.slice(0, 3)), iMx = c.tu.indexOf(mxT);
      var tiles = TURNOS.map(function (t, i) {
        var n = c.tu[i], top = c.tuC[i].map(function (v, j) { return { c: CATS[j], n: v }; }).filter(function (x) { return x.n; }).sort(function (x, y) { return y.n - x.n; });
        var esc0 = !todosTurnos(), marc = !!fil_.turnos[i];
        return '<li class="' + [i === iMx && n ? "mx" : "", esc0 ? (marc ? "sel" : "fora") : ""].join(" ").trim() + '" data-turno="' + i + '" role="button" tabindex="0" aria-pressed="' + (esc0 && marc) + '" title="' + (esc0 && marc ? "Clique para tirar o turno " + t[0] + " do filtro" : esc0 ? "Clique para somar o turno " + t[0] + " ao filtro" : "Clique para ver só o turno " + t[0]) + '"><p class="rz-tuh"><b>Turno ' + t[0] + "</b><span>" + t[1] + "</span></p>" +
          '<p class="rz-tuv"><strong>' + num(n, 0) + "</strong>" + (c.tuA[i] ? delta(n, c.tuA[i]) : temAnt ? '<span class="dl neutro">sem base</span>' : "") + "</p>" +
          '<div class="bb"><div class="ff" style="width:' + (mxT ? n / mxT * 100 : 0).toFixed(1) + '%"></div></div>' +
          '<p class="rz-tus">' + num(n / tuTot * 100, 0) + "% das ocorrências" + (c.sub && c.tuT ? " · " + c.sub.map(function (x) { return esc(x.nome) + " <b>" + num(c.tuT[i][x.i], 0) + "</b>"; }).join(" · ") : top.length ? " · mais comum: " + esc(top[0].c.nome.toLowerCase()) + " (" + num(top[0].n, 0) + ")" : "") + "</p></li>";
      }).join("");
      var semH = c.tu[3] ? " " + num(c.tu[3], 0) + " " + plural(c.tu[3], "ocorrência", "ocorrências") + " sem hora ficaram fora dos turnos." : "";
      linhas.push('<div class="rz-row">' + rzCard("Ocorrências por turno", "comportamental · " + per + (varTxt ? " · " + varTxt : ""),
        '<ul class="rz-tu">' + tiles + '</ul><p class="rz-nota">' + (mxT ? "<b>Turno " + TURNOS[iMx][0] + "</b> concentra " + num(mxT / tuTot * 100, 0) + "% das ocorrências. " : "") + "Clique num turno para filtrar a aba por ele; clique em outro para somar. " +
        "O turno vale pela hora da ocorrência; no turno C, o que passa da meia-noite conta no dia em que aconteceu." + semH + "</p>", "rz-larga") + "</div>");

      // Picos por hora: gráfico das 24 horas e as 3 horas com mais ocorrências.
      var totH = sum(c.hr, function (v) { return v; });
      if (totH) {
        var ordH = c.hr.map(function (v, h) { return { h: h, n: v }; }).filter(function (x) { return x.n; }).sort(function (x, y) { return y.n - x.n || x.h - y.h; });
        var picos = ordH.slice(0, 3), ePico = {}; picos.forEach(function (x) { ePico[x.h] = 1; });
        var turnoDe = function (h) { var m = h * 60 + 30; return m >= 420 && m < 910 ? "A" : m >= 910 && m < 1390 ? "B" : "C"; };
        var faixaH = function (h) { return pad(h) + "h – " + pad((h + 1) % 24) + "h"; };
        var W = 720, H = 190, pl = 6, pr = 6, pt = 22, base = 150, bw = (W - pl - pr) / 24, mxH = Math.max.apply(null, c.hr) || 1;
        var xm = function (min) { return pl + min / 60 * bw; };
        var g = '<svg class="rz-hrs" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc("Ocorrências por hora do dia. Picos: " + picos.map(function (x) { return faixaH(x.h) + ", " + x.n; }).join("; ")) + '">';
        [[0, 420, "C"], [420, 910, "A"], [910, 1390, "B"], [1390, 1440, "C"]].forEach(function (b, i) {
          g += '<rect class="rz-hb-t t' + b[2] + '" x="' + xm(b[0]).toFixed(1) + '" y="' + (base + 22) + '" width="' + (xm(b[1]) - xm(b[0])).toFixed(1) + '" height="14" rx="2"/>';
          if (b[1] - b[0] > 100) g += '<text class="rz-hb-l" x="' + ((xm(b[0]) + xm(b[1])) / 2).toFixed(1) + '" y="' + (base + 32.5) + '" text-anchor="middle">Turno ' + b[2] + "</text>";
        });
        c.hr.forEach(function (v, h) {
          var x = pl + h * bw, hh = v ? Math.max(v / mxH * (base - pt), 2) : 0;
          var hSel = fil_.horas ? (fil_.horas[h] ? " sel" : " fora") : "";
          if (hh) g += '<rect class="rz-hbar' + (ePico[h] ? " pico" : "") + hSel + '" x="' + (x + bw * .14).toFixed(1) + '" y="' + (base - hh).toFixed(1) + '" width="' + (bw * .72).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2"/>';
          if (ePico[h]) g += '<text class="rz-hv" x="' + (x + bw / 2).toFixed(1) + '" y="' + (base - hh - 5).toFixed(1) + '" text-anchor="middle">' + num(v, 0) + "</text>";
          if (h % 3 === 0) g += '<text class="tl" x="' + (x + bw / 2).toFixed(1) + '" y="' + (base + 14) + '" text-anchor="middle">' + pad(h) + "h</text>";
          g += '<rect class="rz-hit" fill="#000" fill-opacity="0" data-hora="' + h + '" role="button" tabindex="0" aria-pressed="' + !!(fil_.horas && fil_.horas[h]) + '" x="' + x.toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + (base + 4) + '"><title>' + esc(faixaH(h) + ": " + num(v, 0) + " " + plural(v, "ocorrência", "ocorrências") + (fil_.horas && fil_.horas[h] ? " · clique para tirar o filtro" : " · clique para filtrar por essa hora")) + "</title></rect>";
        });
        g += '<line class="rz-hax" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + base + '" y2="' + base + '"/></svg>';
        var lp = '<ol class="rz-pic">' + picos.map(function (x, i) {
          var top = x.n ? c.hrC[x.h].map(function (v, j) { return { c: CATS[j], n: v }; }).filter(function (y) { return y.n; }).sort(function (p, q) { return q.n - p.n; }) : [];
          return "<li><span class=\"rz-pn\">" + (i + 1) + "º</span><div><b>" + faixaH(x.h) + "</b> <small>turno " + turnoDe(x.h) + "</small><p><strong>" + num(x.n, 0) + "</strong> " + plural(x.n, "ocorrência", "ocorrências") +
            " · " + num(x.n / totH * 100, 0) + "% " + daPer + (top.length ? "<br>" + top.slice(0, 2).map(function (y) { return esc(y.c.nome.toLowerCase()) + " " + num(y.n, 0); }).join(", ") : "") + "</p></div></li>";
        }).join("") + "</ol>";
        var p3 = sum(picos, function (x) { return x.n; });
        var menos = ordH[ordH.length - 1];
        linhas.push('<div class="rz-row">' + rzCard("Horas de pico", "comportamental · " + per,
          '<div class="rz-hrw"><div class="rz-hrg">' + g + '</div>' + lp + '</div><p class="rz-nota">As 3 horas de pico somam <b>' + num(p3 / totH * 100, 0) + "%</b> das ocorrências " + daPer + "." +
          (menos ? " Hora mais tranquila: " + faixaH(menos.h) + " (" + num(menos.n, 0) + ")." : "") + " Clique numa barra para filtrar a aba por essa hora; clique em outra para somar e de novo para tirar.</p>", "rz-larga") + "</div>");
      }
    }
    return linhas.join("");
  }

  // ---------- Aba Apresentação (17-19/11/2026): pirâmide de Bird e tendência mensal. Por enquanto, DADOS FICTÍCIOS. ----------
  var apm = { mapa: null, pontos: [], locs: [], marcas: [] };
  function montarMapaAp() {
    var el = document.getElementById("mapa-ap"); if (!el) return;
    var L = window.L;
    if (!L || !L.map) { var t = (montarMapaAp.t = (montarMapaAp.t || 0) + 1); if (t > 60) { el.innerHTML = '<p class="mapa-msg">Não foi possível carregar o mapa.</p>'; return; } return setTimeout(montarMapaAp, 150); }
    montarMapaAp.t = 0;
    if (apm.mapa) { apm.mapa.remove(); apm.mapa = null; }
    el.innerHTML = "";
    var mapa = apm.mapa = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    var ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" });
    var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagens &copy; Esri" });
    sat.addTo(mapa);
    L.control.layers({ "Satélite": sat, "Mapa": ruas }, null, { position: "topright" }).addTo(mapa);
    mapa.on("focus", function () { mapa.scrollWheelZoom.enable(); }); mapa.on("blur", function () { mapa.scrollWheelZoom.disable(); });
    if (apm.pontos.length) camadaCalor(L, apm.pontos, 12).addTo(mapa);
    var mx = Math.max.apply(null, [1].concat(apm.locs.map(function (x) { return x.n; })));
    apm.marcas = apm.locs.map(function (x, k) {
      return L.marker([x.lat, x.lon], { icon: L.divIcon({ className: "ap-pin", html: "<span>" + (k + 1) + "</span>", iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .bindPopup("<b>" + (k + 1) + ". " + esc(x.nome) + "</b><br>" + num(x.n, 0) + " excessos").addTo(mapa);
    });
    if (apm.pontos.length) mapa.fitBounds(L.latLngBounds(apm.pontos.map(function (p) { return [p[0], p[1]]; })).pad(.08), { maxZoom: 12 });
    else mapa.setView([-18.6, -48.6], 9);
  }
  function abaApresentacao() {
    // Dados reais do Comportamental (desde 19/11/2026). Acidentes do topo da pirâmide ainda não têm fonte: "a informar".
    var C = D.comportamento;
    if (!C) return '<p class="ap-fic">Sem dados do Comportamental para este usuário.</p>';
    var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    var T = C.tipos, d0 = new Date(C.inicio + "T00:00:00"), dF = new Date(C.fim + "T00:00:00");
    var catDe = T.map(function (t) { var g = t.grupo || t.id; for (var k = 0; k < CATS.length; k++) if (CATS[k].id === g) return k; return -1; });
    var GRAVE = { vel2: 1, vel3: 1, celular: 1, cinto: 1, cigarro: 1, faixa: 1 }; // desvios com potencial grave
    var meses = [], porMes = {}, frotasAno = {}, gravesAno = 0, bocejoAno = 0, LIM_ID = ["vel1", "vel2", "vel3"], limAno = [0, 0, 0];
    C.ev.forEach(function (e) {
      var ci = catDe[e[1]]; if (ci < 0) return;
      var dt = new Date(d0); dt.setDate(dt.getDate() + e[0]);
      var ch = dt.getFullYear() * 12 + dt.getMonth(), m = porMes[ch];
      if (!m) { m = porMes[ch] = { ch: ch, d: MES[dt.getMonth()] + "/" + String(dt.getFullYear()).slice(2), partes: CATS.map(function () { return 0; }), total: 0, graves: 0, lim: [0, 0, 0] }; }
      m.partes[ci] += e[3]; m.total += e[3]; frotasAno[e[2]] = 1;
      if (GRAVE[T[e[1]].id]) { m.graves += e[3]; gravesAno += e[3]; }
      if (T[e[1]].id === "bocejo") bocejoAno += e[3];
      var li = LIM_ID.indexOf(T[e[1]].id); if (li >= 0) { m.lim[li] += e[3]; limAno[li] += e[3]; }
    });
    meses = Object.keys(porMes).map(function (k) { return porMes[k]; }).sort(function (a, b) { return a.ch - b.ch; });
    var fimMes = new Date(dF.getFullYear(), dF.getMonth() + 1, 0).getDate() === dF.getDate();
    if (!fimMes && meses.length) meses[meses.length - 1].parcial = true;
    var completos = meses.filter(function (m) { return !m.parcial; });
    var trat = meses.map(function (m) { return m.graves; });
    var totAno = meses.reduce(function (a, m) { return a + m.total; }, 0);
    var ult = completos[completos.length - 1] || meses[meses.length - 1], pen = completos[completos.length - 2] || ult;
    var pico = completos.reduce(function (a, m) { return m.total > a.total ? m : a; }, ult);
    var varUlt = pen.total ? (ult.total - pen.total) / pen.total * 100 : 0, varPico = pico.total ? (ult.total - pico.total) / pico.total * 100 : 0;
    var dd2 = function (d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2); };
    var perTxt = "02/01 a " + dd2(dF) + "/" + dF.getFullYear();
    var ficticio = '<p class="ap-fic"><b>Dados reais</b> do Comportamental (' + perTxt + ", todos os processos). Só os acidentes do topo da pirâmide ainda estão a informar.</p>";
    var capa = '<section class="ap-slide ap-capa"><div><p class="ap-kick">Monitoramento comportamental da frota · Safra 2026</p><h2>Ocorrências, desvios graves e tendência</h2><p class="ap-sub">' + perTxt + " · todos os processos</p></div>" +
      '<div class="ap-kpis">' + [[num(totAno, 0), "ocorrências registradas"], [num(gravesAno, 0), "desvios com potencial grave"], [num(Object.keys(frotasAno).length, 0), "frotas com ocorrência no ano"], [(varPico < 0 ? "↓ " : "↑ ") + num(Math.abs(varPico), 0) + "%", "de " + pico.d + " (pico) a " + ult.d]].map(function (k) {
        return '<div class="ap-kpi"><strong>' + k[0] + "</strong><span>" + k[1] + "</span></div>";
      }).join("") + "</div></section>";
    // Pirâmide de Bird adaptada à frota (fictício). Referência de Frank Bird (1969): 1 : 10 : 30 : 600.
    var NIV = [
      { n: null, nome: "Acidente com afastamento", desc: "lesão grave ou incapacitante", ref: "1", cor: "#C23B2B" },
      { n: null, nome: "Acidente sem afastamento", desc: "lesão leve, primeiros socorros", ref: "10", cor: "#E2701B" },
      { n: null, nome: "Danos materiais", desc: "avarias, colisões sem vítima", ref: "30", cor: "#E9A800" },
      { n: gravesAno, nome: "Desvios com potencial grave", desc: "excesso acima de 20%, celular, sem cinto, cigarro, faixa contínua", ref: "", cor: "#3E9B34" },
      { n: totAno - gravesAno, nome: "Demais desvios", desc: "excesso até 20%, fadiga, bocejo, distração", ref: "", cor: "#0F4A2A" }];
    var W = 1120, H = 470, cx = 300, hN = 82, gap = 6, pir = '<svg viewBox="0 0 ' + W + " " + H + '" class="ap-pir" role="img" aria-label="Pirâmide de Bird adaptada à frota">';
    NIV.forEach(function (v, i) {
      var y0 = 10 + i * (hN + gap), y1 = y0 + hN, meia = function (y) { return (y - 10) / (H - 20) * 280 + 18; };
      var l0 = cx - meia(y0), r0 = cx + meia(y0), l1 = cx - meia(y1), r1 = cx + meia(y1), ym = (y0 + y1) / 2;
      pir += '<path d="M' + l0.toFixed(1) + " " + y0 + "L" + r0.toFixed(1) + " " + y0 + "L" + r1.toFixed(1) + " " + y1 + "L" + l1.toFixed(1) + " " + y1 + 'Z" fill="' + v.cor + '" class="ap-niv" style="animation-delay:' + (NIV.length - i) * 90 + 'ms"/>' +
        '<text x="' + cx + '" y="' + (ym + 9) + '" text-anchor="middle" class="ap-pn">' + (v.n === null ? "?" : num(v.n, 0)) + "</text>" +
        '<line x1="' + (r0 + (r1 - r0) / 2 + 8).toFixed(1) + '" y1="' + ym + '" x2="620" y2="' + ym + '" class="ap-ld"/>' +
        '<text x="632" y="' + (ym - 4) + '" class="ap-pt">' + esc(v.nome) + '</text><text x="632" y="' + (ym + 16) + '" class="ap-pd">' + esc(v.desc) + (v.n === null ? " · a informar" : "") + (v.ref ? " · Bird: " + v.ref : "") + "</text>";
    });
    pir += "</svg>";
    var razao = gravesAno ? "1 : " + num((totAno - gravesAno) / gravesAno, 0) : "—";
    var piramide = '<section class="ap-slide"><p class="ap-kick">Pirâmide de Bird adaptada</p><h2>Cada acidente grave tem uma base de desvios que pode ser tratada antes</h2><p class="ap-sub">Pirâmide de Bird adaptada à frota.</p>' +
      '<div class="ap-pir-w">' + pir + '<aside class="ap-nota"><p><b>Desvio grave : demais desvios</b><br><span class="ap-razao">' + razao + "</span></p>" +
      "<p>Na pirâmide de Frank Bird (1969), para cada acidente grave há em média 10 leves, 30 com danos materiais e 600 quase-acidentes.</p>" +
      "<p>O monitoramento atua na <b>base</b>, com foco nos desvios com potencial grave: são eles que mais se aproximam dos acidentes do topo.</p><p>Os três níveis de cima (acidentes e danos) ainda precisam ser informados.</p></aside></div></section>";
    var leg = CATS.map(function (c) { return '<li><i class="c-' + c.id + '"></i>' + esc(c.nome) + "</li>"; }).join("");
    // Tratativas por mês (linha) sobre as barras: mini gráfico próprio.
    var mx = Math.max.apply(null, trat), lw = 1300, lh = 140, lp = 40, pts = trat.map(function (t, i) { var bw = (lw - lp - 6) / trat.length; return [lp + i * bw + bw / 2, 34 + (1 - t / mx) * (lh - 60)]; });
    var linha = '<svg viewBox="0 0 ' + lw + " " + lh + '" class="ap-linha" role="img" aria-label="Desvios com potencial grave por mês"><polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>' +
      pts.map(function (p, i) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="6"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] - 12).toFixed(1) + '" text-anchor="middle">' + num(trat[i], 0) + '</text><text class="tl" x="' + p[0].toFixed(1) + '" y="' + (lh - 4) + '" text-anchor="middle">' + meses[i].d + "</text>"; }).join("") + "</svg>";
    var tend = '<section class="ap-slide"><p class="ap-kick">Tendência mensal</p><h2>' + (varPico < 0 ? "Ocorrências em queda desde o pico de " + pico.d : varUlt < 0 ? "Ocorrências em queda em " + ult.d : "Ocorrências em alta em " + ult.d) + '</h2><p class="ap-sub">' + ult.d + ": " + num(ult.total, 0) + " ocorrências, " + (varUlt < 0 ? "↓ " : "↑ ") + num(Math.abs(varUlt), 1) + "% sobre " + pen.d + (pico !== ult ? " e " + num(Math.abs(varPico), 0) + "% " + (varPico < 0 ? "abaixo" : "acima") + " do pico de " + pico.d : "") + "." + (meses.length && meses[meses.length - 1].parcial ? " " + meses[meses.length - 1].d + " vai até " + dd2(dF) + " (parcial)." : "") + "</p>" +
      '<ul class="legend">' + leg + "</ul>" + empilhado(meses, false, 1300) +
      '<h3 class="ap-h3">Desvios com potencial grave por mês</h3>' + linha + "</section>";
    // Tipo a tipo: total do ano e variação do último mês.
    var tipos = '<section class="ap-slide"><p class="ap-kick">Por tipo de ocorrência</p><h2>Onde estão os desvios</h2><div class="ap-tipos">' + CATS.map(function (c, k) {
      var tAno = meses.reduce(function (a, m) { return a + m.partes[k]; }, 0), u = ult.partes[k], pe = pen.partes[k];
      var dv = pe ? (u - pe) / pe * 100 : null;
      return '<div class="ap-tipo c-' + c.id + '">' + ico(c.icone) + "<b>" + esc(c.nome) + "</b><strong>" + num(tAno, 0) + "</strong><span>" + num(tAno / totAno * 100, 1) + "% do total</span>" +
        '<em class="' + (dv === null ? "" : dv <= 0 ? "bom" : "ruim") + '">' + (dv === null ? (u ? u + " em " + ult.d : "sem registros em " + ult.d) : (dv <= 0 ? "↓ " : "↑ ") + num(Math.abs(dv), 0) + "% em " + ult.d) + "</em></div>";
    }).join("") + "</div></section>";
    // Proporção (19/11/2026): "a cada N ocorrências, X excessos, 1 celular, 1 sem cinto" — menos números na tela.
    // Proporção sem bocejo (pedido em 19/11/2026): no tipo fadiga e bocejo entra só a fadiga.
    var iFad = CATS.map(function (c) { return c.id; }).indexOf("fadiga");
    var totT = CATS.map(function (c, k) { return meses.reduce(function (a, m) { return a + m.partes[k]; }, 0) - (k === iFad ? bocejoAno : 0); });
    var totP = totAno - bocejoAno, nomeP = function (c) { return c.id === "fadiga" ? "Fadiga" : c.nome; };
    var iCel = 1, iCin = 2, ancora = Math.min(totT[iCel] || Infinity, totT[iCin] || Infinity);
    if (!isFinite(ancora)) ancora = Math.max(1, Math.min.apply(null, totT.filter(Boolean)));
    var baseN = Math.round(totP / ancora);
    var itensP = CATS.map(function (c, k) { return { c: c, v: totT[k] / ancora }; }).sort(function (a, b) { return b.v - a.v; });
    var fmtP = function (v) { return v >= .5 ? num(Math.round(v), 0) : "menos de 1"; };
    // Waffle: 100 quadrinhos = composição a cada 100 ocorrências.
    var q = CATS.map(function (c, k) { return totT[k] / totP * 100; }), inteiro = q.map(Math.floor), resto = 100 - inteiro.reduce(function (a, b) { return a + b; }, 0);
    q.map(function (v, k) { return { k: k, f: v - Math.floor(v) }; }).sort(function (a, b) { return b.f - a.f; }).slice(0, resto).forEach(function (x) { inteiro[x.k]++; });
    var waffle = "";
    CATS.forEach(function (c, k) { for (var w = 0; w < inteiro[k]; w++) waffle += '<i class="c-' + c.id + '" title="' + esc(nomeP(c)) + '"></i>'; });
    var prop = '<section class="ap-slide"><p class="ap-kick">Proporção</p><h2>A cada <span class="ap-dest">' + num(baseN, 0) + "</h2>" +
      '<div class="ap-prop"><ul class="ap-prop-l">' + itensP.map(function (x) {
        return '<li class="c-' + x.c.id + (x.v < .5 ? " ap-zero" : "") + '">' + ico(x.c.icone) + "<strong>" + fmtP(x.v) + "</strong><span>" + esc(nomeP(x.c)) + "</span></li>";
      }).join("") + '</ul><div class="ap-waf-w"><p class="ap-h3">A cada 100 ocorrências</p><div class="ap-waf">' + waffle + '</div><p class="ap-sub">' + CATS.map(function (c, k) { return inteiro[k] ? '<span class="ap-wl"><i class="c-' + c.id + '"></i>' + inteiro[k] + " " + esc(nomeP(c).toLowerCase()) + "</span>" : ""; }).join("") + "</p></div></div></section>";
    var vP = function (k) { return Math.round(totT[k] / ancora); }, eh = function (n) { return n === 1 ? " é " : " são "; };
    var tit = '<span class="ap-dest">' + num(baseN, 0) + " ocorrências</span>, <b>" + num(vP(0), 0) + "</b>" + eh(vP(0)) + "excesso de velocidade, <b>" + num(vP(iCel), 0) + "</b>" + eh(vP(iCel)) + "uso de celular e <b>" + num(vP(iCin), 0) + "</b>" + eh(vP(iCin)) + "sem cinto";
    prop = prop.replace('<span class="ap-dest">' + num(baseN, 0) + "</h2>", tit + "</h2>");

    // Excesso de velocidade por limiar (19/11/2026): até 20%, 20–50% e acima de 50% do limite da via.
    var LIM = [{ id: "lim1", nome: "Até 20%", sub: "dentro da tolerância" }, { id: "lim2", nome: "De 20% até 50%", sub: "gera tratativa" }, { id: "lim3", nome: "Acima de 50%", sub: "gera tratativa" }];
    var totLim = limAno[0] + limAno[1] + limAno[2], mxLim = Math.max(1, limAno[0]);
    var acima = limAno[1] + limAno[2];
    var mesLim = meses.map(function (m) { return { d: m.d + (m.parcial ? "*" : ""), partes: [m.lim[1], m.lim[2]], total: m.lim[1] + m.lim[2] }; });
    var limiar = '<section class="ap-slide"><p class="ap-kick">Excesso de velocidade por limiar</p><h2>' + num(totLim ? limAno[0] / totLim * 100 : 0, 1) + "% dos excessos ficam até 20% acima do limite</h2>" +
      '<p class="ap-sub">' + num(totLim, 0) + " excessos no período. " + num(acima, 0) + " passaram de 20% (" + num(totLim ? acima / totLim * 100 : 0, 1) + "%) e " + num(limAno[2], 0) + " passaram de 50%.</p>";
    var VL = C.vlim;
    if (VL && VL.ev && VL.ev.length) {
      // Limiar = limite de velocidade da via (km/h), da coluna LIMIAR das planilhas de ocorrências (19/11/2026).
      var porL = VL.lims.map(function () { return [0, 0, 0]; });
      VL.ev.forEach(function (e) { porL[e[1]][e[2]] += e[4]; });
      var linhasL = VL.lims.map(function (l, k) { var v = porL[k]; return { l: l, v: v, t: v[0] + v[1] + v[2], a: v[1] + v[2] }; }).filter(function (x) { return x.t; });
      var totL = linhasL.reduce(function (a, x) { return a + x.t; }, 0), mxL2 = Math.max.apply(null, linhasL.map(function (x) { return x.t; }));
      var topL = linhasL.slice().sort(function (a, b) { return b.t - a.t; });
      var baixos = linhasL.filter(function (x) { return x.l <= 25; }), bT = baixos.reduce(function (a, x) { return a + x.t; }, 0), bA = baixos.reduce(function (a, x) { return a + x.a; }, 0);
      var top2 = topL.slice(0, 2), top2p = top2.reduce(function (a, x) { return a + x.t; }, 0) / totL * 100;
      // Estilo "proporção" (regra de 3, 19/11/2026): de cada 100 excessos, quantos em cada limiar; e em cada limiar, 1 a cada N passa de 20%.
      var c100 = linhasL.map(function (x) { return x.t / totL * 100; }), int100 = c100.map(Math.floor), sobra = 100 - int100.reduce(function (a, b) { return a + b; }, 0);
      c100.map(function (v, k) { return { k: k, f: v - Math.floor(v) }; }).sort(function (a, b) { return b.f - a.f; }).slice(0, sobra).forEach(function (x) { int100[x.k]++; });
      var ordL = linhasL.map(function (x, k) { return { x: x, n: int100[k] }; }).sort(function (a, b) { return b.n - a.n || b.x.t - a.x.t; });
      var princ = ordL.filter(function (o) { return o.n >= 1; }).slice(0, 3);
      var tituloL = "A cada <span class=\"ap-dest\">100 excessos</span>, " + princ.map(function (o) { return "<b>" + o.n + "</b> " + (o.n === 1 ? "é" : "são") + " em vias de " + o.x.l + " km/h"; }).join(", ").replace(/, ([^,]*)$/, " e $1");
      var umCada = function (x) { return x.a ? Math.max(1, Math.round(x.t / x.a)) : 0; };
      // Leitura em frase (19/11/2026): "A cada 100 excessos, 40 são em vias de 80 km/h", com quadro de 100 quadradinhos.
      var CORL = ["#0F4A2A", "#2F7D3E", "#5FAE48", "#9CCB5B", "#E9A800", "#E2701B", "#C23B2B"];
      var visiveis = ordL.filter(function (o) { return o.n >= 1; }), raros = ordL.filter(function (o) { return o.n < 1; });
      var corDe = {}; visiveis.forEach(function (o, k) { corDe[o.x.l] = CORL[Math.min(k, CORL.length - 1)]; });
      var wafL = ""; visiveis.forEach(function (o) { for (var w = 0; w < o.n; w++) wafL += '<i style="background:' + corDe[o.x.l] + '" title="' + o.x.l + ' km/h"></i>'; });
      var rarT = raros.reduce(function (a, o) { return a + o.x.t; }, 0);
      limiar = '<section class="ap-slide"><p class="ap-kick">Excesso de velocidade por limiar da via</p><h2>' + tituloL + "</h2>" +
        '<p class="ap-sub">' + num(totL, 0) + " excessos com limite da via registrado.</p>" +
        '<div class="ap-lf"><div class="ap-waf-w"><p class="ap-h3">A cada 100 excessos</p><div class="ap-waf">' + wafL + "</div></div>" +
        '<ul class="ap-frases">' + visiveis.map(function (o) {
          return '<li><i style="background:' + corDe[o.x.l] + '"></i><strong>' + o.n + "</strong><span>a cada 100 excessos " + (o.n === 1 ? "é" : "são") + " em vias de <b>" + o.x.l + " km/h</b></span></li>";
        }).join("") +
        (raros.length ? '<li class="ap-raro"><i></i><strong>&lt;1</strong><span>a cada 100 excessos é em vias de <b>' + raros.map(function (o) { return o.x.l; }).sort(function (a, b) { return a - b; }).join(", ").replace(/, (\d+)$/, " e $1") + " km/h</b> (" + num(rarT, 0) + " excessos no total)</span></li>" : "") +
        "</ul></div></section>";
    } else {
      limiar = "";
    }

    // Mapa dos excessos de velocidade: dados reais do mapa do Comportamental (ano todo, todos os processos).
    var mapaSl = "", C0 = D.comportamento, M0 = C0 && C0.mapa;
    if (M0 && M0.pts && M0.pts.length) {
      var ixV = {}; C0.tipos.forEach(function (t, i) { if ((t.grupo || t.id) === "vel") ixV[i] = 1; });
      var cel = {}, loc = {}, totV = 0;
      M0.pts.forEach(function (e) {
        if (!ixV[e[1]]) return;
        totV += e[6];
        var k = e[3] + "," + e[4]; cel[k] = (cel[k] || 0) + e[6];
        var l = loc[e[5]] || (loc[e[5]] = { i: e[5], n: 0, la: 0, lo: 0 });
        l.n += e[6]; l.la += e[3] * e[6]; l.lo += e[4] * e[6];
      });
      apm.pontos = Object.keys(cel).map(function (k) { var q = k.split(","); return [q[0] * M0.cel, q[1] * M0.cel, cel[k]]; });
      apm.locs = Object.keys(loc).map(function (k) { var l = loc[k]; return { nome: M0.locais[l.i], n: l.n, lat: l.la / l.n * M0.cel, lon: l.lo / l.n * M0.cel }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
      var top5 = apm.locs.reduce(function (a, x) { return a + x.n; }, 0), mxL = apm.locs.length ? apm.locs[0].n : 1;
      mapaSl = '<section class="ap-slide"><p class="ap-kick">Excesso de velocidade · dados reais</p><h2>Onde acontece a maioria dos excessos</h2><p class="ap-sub">' + num(totV, 0) + " excessos com local registrado em 2026. Os 5 locais abaixo concentram " + (totV ? num(top5 / totV * 100, 0) : "0") + "% deles.</p>" +
        '<div class="ap-mapa-w"><div id="mapa-ap" class="mapa ap-mapa" role="region" aria-label="Mapa de calor dos excessos de velocidade"><p class="mapa-msg">Carregando mapa…</p></div><ol class="ap-locs">' +
        apm.locs.map(function (x, k) { return '<li><button type="button" data-aploc="' + k + '"><span class="ap-ln">' + (k + 1) + '</span><span class="ap-lt"><b>' + esc(x.nome) + "</b><small>" + num(x.n, 0) + " excessos · " + num(x.n / totV * 100, 1) + '% do total</small><i style="width:' + (x.n / mxL * 100).toFixed(1) + '%"></i></span></button></li>'; }).join("") +
        '</ol></div><p class="mapa-leg"><span>Menos</span><i class="esc"></i><span>Mais excessos</span></p></section>';
    }
    return '<div class="ap"><div class="ap-bar"><button type="button" data-ap-tela="1">Tela cheia</button></div>' + ficticio + capa + prop + piramide + tend + limiar + mapaSl + tipos + "</div>";
  }

  // ---------- Resumo: versão visual da mensagem semanal aos gestores (25/11/2026) ----------
  // Os mesmos três tópicos da mensagem do WhatsApp, na mesma ordem: ocorrências, motor ocioso e principais pontos de parada.
  // Sem total de ocorrências (só variação e % de cada tipo), sem conectividade e sem câmeras.
  var BL_ICO = {
    oc: "M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 7.2h.01M12 12h.01M12 16.8h.01",
    mo: "M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    pp: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
  };
  var MESES_EXT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  function faixaExt(a, b) {
    var d1 = +a.slice(8, 10), m1 = +a.slice(5, 7) - 1, d2 = +b.slice(8, 10), m2 = +b.slice(5, 7) - 1;
    return m1 === m2 ? d1 + " a " + d2 + " de " + MESES_EXT[m2] : d1 + " de " + MESES_EXT[m1] + " a " + d2 + " de " + MESES_EXT[m2];
  }
  function varTxt(n, a) { // "↓ 18%" / "↑ 7%" / "="; null sem base
    if (!a) return null;
    var v = (n - a) / a * 100;
    return Math.abs(v) < 0.5 ? { cls: "igual", t: "=" } : { cls: v < 0 ? "caiu" : "subiu", t: (v < 0 ? "↓ " : "↑ ") + num(Math.abs(v), 0) + "%" };
  }
  function abaResumo() {
    var S = semanaRef();
    var c = rzComportamento(S), o = rzOcioso(S), pe = rzPermanencia(S);
    var procs = {};
    [["comportamento", "frotas"], ["permanencia", "veiculos"]].forEach(function (b) {
      var x = (D[b[0]] || {})[b[1]] || {}; Object.keys(x).forEach(function (f) { if (x[f].processo) procs[x[f].processo] = 1; });
    });
    ((D.motorOcioso || {}).veiculos || []).forEach(function (v) { procs[v.processo] = 1; });
    var lista = unicos(Object.keys(procs));
    var topo = '<header class="bl-topo"><div><h2 class="bl-tit">Resumo da semana</h2>' +
      '<p class="bl-per"><b>' + faixaExt(S.ini, S.fim) + "</b>, comparada com " + faixaExt(S.ant[0], S.ant[6]) + ".</p></div>" +
      '<div class="filtros bl-fil"><label>Processo<select data-fil="processo" id="r-processo">' + opcoes(lista, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      (fil_.processo || !todosTurnos() || fil_.horas ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<button type="button" class="bl-copiar" data-copiar-resumo="1" title="Copia a imagem do resumo para colar (Ctrl+V) no WhatsApp ou no e-mail">📋 Copiar imagem</button></div></header>';

    function bloco(cls, icone, titulo, corpo, ate) {
      return '<section class="bl-b ' + cls + '"><span class="bl-ic">' + ico(icone) + '</span><div class="bl-c"><h3>' + titulo +
        (ate ? ' <small>dados até ' + dd(ate) + "</small>" : "") + "</h3>" + corpo + "</div></section>";
    }
    var partes = [];

    // 🚦 Ocorrências: frase com a variação; à esquerda a rosca por tipo (% e quantidade), à direita o top 3 veículos.
    if (c && c.cur !== undefined) {
      var vt = varTxt(c.cur, c.ant), cats = c.cats.filter(function (x) { return x.n; });
      var frase = !c.cur ? "Nenhuma ocorrência na semana." : !vt ? "Primeira semana com dados para comparar."
        : vt.cls === "igual" ? "As ocorrências ficaram estáveis em relação à semana anterior."
        : "As ocorrências " + (vt.cls === "caiu" ? "caíram" : "subiram") + ' <b class="bl-n ' + vt.cls + '">' + num(Math.abs((c.cur - c.ant) / c.ant * 100), 0) + "%</b> em relação à semana anterior.";
      var corpoO = '<p class="bl-frase">' + frase + "</p>";
      if (c.cur) {
        var R = 46, C0 = 2 * Math.PI * R, acc = 0;
        var arcos = cats.map(function (x) {
          var f = x.n / c.cur, seg = '<circle class="c-' + x.c.id + '" r="' + R + '" cx="60" cy="60" fill="none" stroke-width="22" stroke-dasharray="' + (f * C0).toFixed(2) + " " + C0.toFixed(2) + '" stroke-dashoffset="' + (-acc * C0).toFixed(2) + '" transform="rotate(-90 60 60)"><title>' + esc(x.c.nome + ": " + num(x.n, 0) + " (" + num(f * 100, 0) + "%)") + "</title></circle>";
          acc += f; return seg;
        }).join("");
        var pizza = '<svg class="bl-rosca" viewBox="0 0 120 120" role="img" aria-label="' + esc(cats.map(function (x) { return x.c.nome + " " + num(x.n / c.cur * 100, 0) + "%"; }).join(", ")) + '">' + arcos +
          (vt ? '<text x="60" y="57" text-anchor="middle" class="bl-rc1 ' + vt.cls + '">' + vt.t + '</text><text x="60" y="73" text-anchor="middle" class="bl-rc2">vs. anterior</text>' : "") + "</svg>";
        var leg = '<ul class="bl-leg2">' + cats.map(function (x) {
          var pT = x.n / c.cur * 100, v = varTxt(x.n, x.a);
          var vf = !x.a ? "não teve na semana anterior" : v.cls === "igual" ? "igual à semana anterior"
            : num(Math.abs((x.n - x.a) / x.a * 100), 0) + "% a " + (v.cls === "caiu" ? "menos" : "mais") + " que a semana anterior";
          return '<li class="c-' + x.c.id + '"><i></i><span>' + esc(x.c.nome) + "</span><b>" + (pT < 1 ? "<1" : num(pT, 0)) + "%</b><em>" + num(x.n, 0) + "</em>" +
            '<small class="bl-v ' + (v ? v.cls : "") + '">' + vf + "</small></li>";
        }).join("") + "</ul>";
        var top3 = Object.keys(c.porF).map(function (f) { return { f: f, n: c.porF[f] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 3);
        var t3 = '<div class="bl-top"><h4>Top 3 veículos</h4><ol>' + top3.map(function (x) {
          var fr = c.frotas[x.f] || {}, pc = c.porFC[x.f] || [], mi = 0;
          pc.forEach(function (v, k) { if (v > pc[mi]) mi = k; });
          return '<li><div><b>Frota ' + esc(x.f) + "</b><span class=\"cap\">" + esc((fr.processo || "").toLowerCase()) + '</span></div><div class="bl-tq"><b>' + num(x.n, 0) + "</b> " + plural(x.n, "ocorrência", "ocorrências") +
            "<span>" + (pc.length ? esc(CATS[mi].nome.toLowerCase()) + " " + num(pc[mi] / x.n * 100, 0) + "%" : "") + "</span></div></li>";
        }).join("") + "</ol></div>";
        corpoO += '<div class="bl-duo"><div class="bl-graf">' + pizza + leg + "</div>" + t3 + "</div>";
      }
      // Tratativas (25/11/2026): celular, sem cinto, distração, faixa e cigarro só entram no painel quando viram tratativa
      // (planilha Notificação das Ocorrências), então a soma deles na semana é o que gerou tratativa.
      var TRT = ["celular", "cinto", "distracao", "faixa", "cigarro"];
      var tr = c.cats.filter(function (x) { return TRT.indexOf(x.c.id) >= 0 && x.n; }), nTr = sum(tr, function (x) { return x.n; });
      corpoO += '<p class="bl-trat' + (nTr ? " tem" : "") + '"><span class="bl-ti" aria-hidden="true">' + (nTr ? "!" : "✓") + "</span><span>" +
        (nTr ? "<b>" + num(nTr, 0) + " " + plural(nTr, "ocorrência gerou", "ocorrências geraram") + " tratativa</b> nesta semana: " +
          tr.map(function (x) { return esc(x.c.nome.toLowerCase()) + " (" + num(x.n, 0) + ")"; }).join(", ") + "."
          : "<b>Nenhuma ocorrência gerou tratativa</b> nesta semana.") + "</span></p>";
      partes.push(bloco("bl-oc", BL_ICO.oc, "Ocorrências", corpoO, c.ate));
    }

    // ⏱️ Motor ocioso: medidor com o % ocioso (meta e semana anterior) e, ao lado, o top 3 veículos por horas ociosas.
    if (o && o.pct !== undefined && o.pct !== null) {
      var mx = Math.max(o.meta * 2, Math.ceil(Math.max(o.pct, o.pAnt || 0) / 5) * 5);
      var dif = o.pAnt !== null && o.pAnt !== undefined ? o.pct - o.pAnt : null;
      var fraseO = "Os veículos ficaram " + '<b class="bl-n ' + (o.pct > o.meta ? "subiu" : "caiu") + '">' + num(o.pct, 1) + "%</b> do tempo de motor ligado parados, " +
        (o.pct > o.meta ? "acima" : "abaixo") + " da meta de " + o.meta + "%.";
      // Medidor semicircular: 0 a mx; verde até a meta, vermelho depois.
      var ang = function (v) { return Math.PI * (1 - Math.min(v, mx) / mx); }, pt = function (v, rr) { return [(100 + rr * Math.cos(ang(v))).toFixed(2), (100 - rr * Math.sin(ang(v))).toFixed(2)]; };
      var arco = function (a, b, rr) { var p1 = pt(a, rr), p2 = pt(b, rr); return "M" + p1[0] + " " + p1[1] + " A" + rr + " " + rr + " 0 0 1 " + p2[0] + " " + p2[1]; };
      var ag = pt(o.pct, 56), mk = [pt(o.meta, 62), pt(o.meta, 90)];
      var medidor = '<svg class="bl-gauge" viewBox="0 0 200 150" role="img" aria-label="' + esc(num(o.pct, 1) + "% de motor ocioso; meta " + o.meta + "%") + '">' +
        '<path d="' + arco(0, mx, 76) + '" class="bl-g0"/><path d="' + arco(0, o.meta, 76) + '" class="bl-gok"/><path d="' + arco(o.meta, mx, 76) + '" class="bl-gru"/>' +
        '<path d="' + arco(0, o.pct, 76) + '" class="bl-gv' + (o.pct > o.meta ? " acima" : "") + '"/>' +
        '<line x1="' + mk[0][0] + '" y1="' + mk[0][1] + '" x2="' + mk[1][0] + '" y2="' + mk[1][1] + '" class="bl-gm"/>' +
        (dif !== null ? '<circle cx="' + pt(o.pAnt, 76)[0] + '" cy="' + pt(o.pAnt, 76)[1] + '" r="5" class="bl-ga"><title>Semana anterior: ' + num(o.pAnt, 1) + "%</title></circle>" : "") +
        '<line x1="100" y1="100" x2="' + ag[0] + '" y2="' + ag[1] + '" class="bl-gp"/><circle cx="100" cy="100" r="6" class="bl-gc"/>' +
        '<text x="100" y="140" text-anchor="middle" class="bl-gt' + (o.pct > o.meta ? " acima" : "") + '">' + num(o.pct, 1) + "%</text>" +
        '<text x="24" y="116" text-anchor="middle" class="bl-gl">0%</text><text x="176" y="116" text-anchor="middle" class="bl-gl">' + num(mx, 0) + "%</text>" +
        '<text x="' + pt(o.meta, 104)[0] + '" y="' + pt(o.meta, 104)[1] + '" text-anchor="middle" class="bl-gl bl-glm">meta ' + o.meta + "%</text></svg>";
      var fatos = '<ul class="bl-fatos bl-fatos-c"><li><b>' + horas(o.oc) + "</b> ociosas de " + horas(o.lc) + " de ignição</li>" +
        (dif !== null ? '<li><b class="' + (Math.abs(dif) < 0.05 ? "" : dif < 0 ? "caiu" : "subiu") + '">' + (Math.abs(dif) < 0.05 ? "igual" : (dif < 0 ? "↓ " : "↑ ") + num(Math.abs(dif), 1) + " p.p.") + "</b> sobre a semana anterior (" + num(o.pAnt, 1) + "%)</li>" : "") +
        "<li>" + (o.acima ? "<b>" + o.acima + "</b> " + plural(o.acima, "veículo acima", "veículos acima") + " da meta" : "Todos os veículos dentro da meta") + "</li></ul>";
      var t3o = o.rows.slice().sort(function (a, b) { return b.o - a.o; }).slice(0, 3);
      var top3o = '<div class="bl-top"><h4>Top 3 veículos</h4><ol>' + t3o.map(function (rw) {
        return '<li><div><b>Frota ' + esc(rw.v.id) + "</b><span class=\"cap\">" + esc((rw.v.processo || "").toLowerCase()) + '</span></div><div class="bl-tq"><b>' + horas(rw.o) + "</b> ociosas" +
          '<span class="' + (rw.p > o.meta ? "acima" : "") + '">' + num(rw.p, 1) + "% do tempo ligado</span></div></li>";
      }).join("") + "</ol></div>";
      partes.push(bloco("bl-mo", BL_ICO.mo, "Motor ocioso", '<p class="bl-frase">' + fraseO + '</p><div class="bl-duo"><div class="bl-graf bl-graf-g">' + medidor + fatos + "</div>" + top3o + "</div>", o.ate));
    }

    // 📍 Permanência: os 3 estabelecimentos com mais paradas (média de tempo) e, ao lado, as 3 permanências mais longas da semana.
    if (pe && pe.topEst) {
      var mxN = Math.max.apply(null, [1].concat(pe.topEst.map(function (x) { return x.n; })));
      var locaisH = '<div class="bl-locs"><h4>Principais locais de parada</h4>' + (pe.topEst.length ? '<ol class="bl-pts">' + pe.topEst.map(function (x) {
        var L0 = pe.locais[x.i];
        return '<li><div class="bl-pn"><b>' + esc(L0.nome) + "</b><span>" + esc(L0.cidade || "") + '</span><div class="bl-pb"><i style="width:' + (x.n / mxN * 100).toFixed(1) + '%"></i></div></div>' +
          '<div class="bl-pv"><b>' + num(x.n, 0) + "</b> " + plural(x.n, "parada", "paradas") + '<span>média de <b>' + hmin(x.min / x.n) + "</b></span></div></li>";
      }).join("") + "</ol>" : '<p class="cs">Nenhuma parada em estabelecimento na semana.</p>') + "</div>";
      var VV = D.permanencia.veiculos;
      var longH = '<div class="bl-top"><h4>Top 3 maiores permanências</h4>' + (pe.longas.length ? "<ol>" + pe.longas.map(function (e) {
        return '<li><div><b>Frota ' + esc(e[0]) + "</b><span><em class=\"cap\">" + esc(pe.locais[e[4]].nome.toLowerCase()) + "</em>, " + dd(e[5]) + (e[6] ? " às " + esc(e[6]) : "") + '</span></div><div class="bl-tq"><b>' + hmin(e[3]) + "</b>" +
          '<span class="cap">' + esc(((VV[e[0]] || {}).processo || "").toLowerCase()) + "</span></div></li>";
      }).join("") + "</ol>" : '<p class="cs">Nenhuma permanência na semana.</p>') + "</div>";
      var fraseP = pe.n ? "Os veículos somaram " + '<b class="bl-n">' + (pe.min >= 600 ? num(Math.round(pe.min / 60), 0) + " h" : hmin(pe.min)) + "</b> parados em " + num(pe.n, 0) + " " + plural(pe.n, "permanência", "permanências") + "." : "Nenhuma permanência na semana.";
      partes.push(bloco("bl-pp", BL_ICO.pp, "Permanência", '<p class="bl-frase">' + fraseP + '</p><div class="bl-duo">' + locaisH + longH + "</div>", pe.ate));
    }

    var rodape = ""; // frase final da mensagem retirada do Resumo a pedido do usuário (25/11/2026)
    return '<div class="bl">' + topo + (partes.length ? '<div class="bl-fio">' + partes.join("") + "</div>" + rodape : '<p class="cs">Ainda sem dados desta semana.</p>') + "</div>";
  }

  // Ícone de cada aba (as mesmas figuras dos cards do Resumo; o Resumo usa um painel de blocos).
  var ABA_ICO = { "resumo": "M4 4h7v8H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 14h7v6H4z", "apresentacao": "M3 4h18v12H3zM12 16v4M8 20h8M7 12l3-3 2 2 4-4" };
  var VIEWS = { "resumo": abaResumo, "comportamento": abaComportamento, "motor-ocioso": abaOcioso, "permanencia": abaPermanencia, "conectividade": abaConectividade, "cameras": abaCameras, "apresentacao": abaApresentacao };
  var tabs = document.getElementById("tabs"), painel = document.getElementById("painel"), fil = document.getElementById("filtro");

  function atual() { var h = (location.hash || "").replace("#", ""); return ABAS.some(function (a) { return a.id === h; }) ? h : ABAS[0].id; }
  function render() {
    var id = atual();
    tabs.innerHTML = ABAS.map(function (a) {
      return '<button role="tab" id="tab-' + a.id + '" aria-selected="' + (a.id === id) + '" aria-controls="painel" tabindex="' + (a.id === id ? 0 : -1) + '" data-tab="' + a.id + '">' + ico(ABA_ICO[a.id] || RZ_ICO[a.id] || "", "ic-aba") + a.nome + "</button>";
    }).join("");
    painel.setAttribute("aria-labelledby", "tab-" + id);
    if (pm.mapa && id !== "permanencia") { pm.mapa.remove(); pm.mapa = null; }
    if (cm.mapa) { cm.mapa.remove(); cm.mapa = null; }
    painel.innerHTML = VIEWS[id]();
    if (id === "permanencia") montarMapa();
    if (id === "comportamento") montarMapaComp();
    if (apm.mapa) { apm.mapa.remove(); apm.mapa = null; }
    if (id === "apresentacao") montarMapaAp();
    fil.hidden = true;
    var blocos = { "apresentacao": { real: false, periodo: "Apresentação" }, "resumo": { real: !D.exemplo, periodo: "Semana de segunda a domingo" }, "comportamento": D.comportamento, "motor-ocioso": D.motorOcioso, "permanencia": D.permanencia, "conectividade": D.conectividade, "cameras": D.cameras }, b = blocos[id], real = b && b.real;
    document.getElementById("periodo").textContent = real ? b.periodo + " · dados reais" : D.periodo;
    document.getElementById("aviso").hidden = real || !D.exemplo;
  }
  function ir(id) { if (location.hash === "#" + id) render(); else location.hash = id; }

  tabs.addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) ir(b.dataset.tab); });
  tabs.addEventListener("keydown", function (e) {
    var i = ABAS.findIndex(function (a) { return a.id === atual(); }), n = null;
    if (e.key === "ArrowRight") n = (i + 1) % ABAS.length; else if (e.key === "ArrowLeft") n = (i + ABAS.length - 1) % ABAS.length;
    else if (e.key === "Home") n = 0; else if (e.key === "End") n = ABAS.length - 1;
    if (n !== null) { e.preventDefault(); ir(ABAS[n].id); setTimeout(function () { var t = document.getElementById("tab-" + ABAS[n].id); if (t) t.focus(); }, 0); }
  });
  painel.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sort]"); if (!b) return;
    var p = b.dataset.sort.split(":"), o = ordem[p[0]];
    ordem[p[0]] = { col: p[1], dir: o && o.col === p[1] ? -o.dir : 1 };
    render();
  });
  painel.addEventListener("change", function (e) {
    var fr = e.target.closest("input[data-frota]");
    if (fr) {
      var todas = permFiltrados().frotasProc, atuais = pm.frotas.length ? pm.frotas.slice() : [];
      if (fr.checked) { if (atuais.indexOf(fr.dataset.frota) < 0) atuais.push(fr.dataset.frota); }
      else atuais = atuais.filter(function (f) { return f !== fr.dataset.frota; });
      pm.frotas = atuais.length === todas.length ? [] : atuais; pm.refit = true; pm.abertoFrotas = true;
      render();
      var n2 = document.querySelector('input[data-frota="' + fr.dataset.frota + '"]'); if (n2) n2.focus();
      return;
    }
    var pr = e.target.closest("select[data-per], input[data-perde], input[data-perate]");
    if (pr) {
      var aba = pr.dataset.per || pr.dataset.perde || pr.dataset.perate, st = PER[aba]; if (!st) return;
      var vx = document.getElementById("perde-" + aba), vy = document.getElementById("perate-" + aba);
      if (pr.dataset.per) {
        if (pr.value === "custom") { st.de = vx ? vx.value : ""; st.ate = vy ? vy.value : ""; }
        st.p = pr.value;
      } else if (pr.value) {
        st.de = vx ? vx.value : ""; st.ate = vy ? vy.value : ""; st.p = "custom";
      }
      fco.dia = -1; pm.refit = true; render();
      var nf = document.getElementById(pr.id); if (nf) nf.focus();
      return;
    }
    var sel = e.target.closest("select[data-fil], select[data-pm], select[data-comp], select[data-kon], select[data-om], select[data-hier]"); if (!sel) return;
    if (sel.dataset.om) { om[sel.dataset.om] = sel.value; render(); var n5 = document.getElementById(sel.id); if (n5) n5.focus(); return; }
    if (sel.dataset.kon) { fco[sel.dataset.kon] = sel.dataset.kon === "dia" ? +sel.value : sel.value; render(); var n4 = document.getElementById(sel.id); if (n4) n4.focus(); return; }
    if (sel.dataset.comp) { fil_.comp[sel.dataset.comp] = sel.dataset.comp === "janela" ? +sel.value : sel.value; render(); var n3 = document.getElementById(sel.id); if (n3) n3.focus(); return; }
    if (sel.dataset.pm) pm[sel.dataset.pm] = sel.dataset.pm === "dia" ? sel.value : +sel.value;
    else if (sel.dataset.hier) { (fil_.h || (fil_.h = {}))[sel.dataset.hier] = sel.value; pm.frotas = []; }
    else { fil_[sel.dataset.fil] = sel.value; if (sel.dataset.fil === "processo") { fil_.responsavel = ""; pm.frotas = []; } }
    pm.refit = true;
    render();
    var n = document.getElementById(sel.id); if (n) n.focus();
  });
  painel.addEventListener("click", function (e) {
    var l = e.target.closest("[data-limpar]");
    if (l) { fil_.processo = ""; fil_.responsavel = ""; fil_.turnos = [1, 1, 1]; fil_.horas = null; fil_.tipos = null; if (fil_.comp) fil_.comp.frota = ""; fil_.h = { ger: "", resp: "", gest: "", lid: "" }; fco.dia = -1; fcm.tipo = ""; pm.frotas = []; Object.keys(PER).forEach(function (a) { PER[a].p = PER[a].padrao; PER[a].de = PER[a].ate = ""; }); pm.refit = true; render(); return; }
    var kt = e.target.closest("[data-ktodos]");
    if (kt) { fco.todos = !fco.todos; render(); return; }
    var kd = e.target.closest("[data-kdia]");
    if (kd) { fco.dia = +kd.getAttribute("data-kdia"); render(); return; }
    var tb = e.target.closest("[data-turno]");
    if (tb) { trocaTurno(+tb.dataset.turno); return; }
    var ks = e.target.closest("[data-kst]");
    if (ks) { fco.st = fco.st === ks.dataset.kst ? "" : ks.dataset.kst; render(); return; }
    var hb = e.target.closest("[data-hora]");
    if (hb) { trocaHora(+hb.dataset.hora); return; }
    if (e.target.closest("[data-top5]")) { trocaTop5(); return; }
    var apl = e.target.closest("[data-aploc]");
    if (apl && apm.mapa) { var x = apm.locs[+apl.dataset.aploc]; apm.mapa.setView([x.lat, x.lon], 13); apm.marcas[+apl.dataset.aploc].openPopup(); return; }
    if (e.target.closest("[data-ap-tela]")) { var ap = document.querySelector(".ap"); if (document.fullscreenElement) document.exitFullscreen(); else if (ap && ap.requestFullscreen) ap.requestFullscreen(); return; }
    if (e.target.closest(".ktop")) return; // clique na gaveta do top 5 não troca o filtro
    var kt0 = e.target.closest("article[data-tipo]");
    if (kt0) { trocaTipo(kt0.dataset.tipo); return; }
    var cf = e.target.closest("[data-cfrota]");
    if (cf) { fil_.comp.frota = cf.dataset.cfrota; render(); return; }
    var mt = e.target.closest("[data-mtipo]");
    if (mt) { cm.tipo = mt.dataset.mtipo; render(); var s0 = document.querySelector(".mc"); if (s0) s0.scrollIntoView({ block: "start" }); return; }
    var cl = e.target.closest("[data-cloc]");
    if (cl && cm.mapa && cm.marcas[cl.dataset.cloc]) { var m0 = cm.marcas[cl.dataset.cloc]; cm.mapa.flyTo(m0.getLatLng(), 13); m0.openPopup(); document.getElementById("mapa-comp").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    var md = e.target.closest("[data-medida]");
    if (md) { pm.medida = md.dataset.medida; render(); return; }
    var fa = e.target.closest("[data-frotas]");
    if (fa) { pm.frotas = fa.dataset.frotas === "todas" ? permFiltrados().frotasProc.slice() : []; if (pm.frotas.length === permFiltrados().frotasProc.length && fa.dataset.frotas !== "todas") pm.frotas = []; pm.refit = true; pm.abertoFrotas = true; render(); return; }
    var mb = e.target.closest("[data-mobar]");
    if (mb) { moSel = moSel === mb.dataset.mobar ? null : mb.dataset.mobar; render(); return; }
    if (e.target.closest("[data-mobar-todos]")) { moSel = null; render(); return; }
    var lc = e.target.closest("[data-local]");
    if (lc) {
      trocaLocal(+lc.dataset.local);
      if (pm.localSel !== null && pm.mapa && pm.marcas[lc.dataset.local]) { var mk = pm.marcas[lc.dataset.local]; pm.mapa.flyTo(mk.getLatLng(), 15); mk.openPopup(); }
      return;
    }
    if (e.target.closest("[data-local-todos]")) { trocaLocal(pm.localSel); return; }
    var b = e.target.closest("[data-set]"); if (!b) return;
    var p = b.dataset.set, k = p.indexOf(":"), cv = p.slice(0, k), vv = p.slice(k + 1);
    fil_[cv] = fil_[cv] === vv ? "" : vv; pm.frotas = []; pm.refit = true; render(); // clicar de novo no mesmo tira o filtro
  });
  fil.addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]"); if (!b) return;
    filtro = b.dataset.f;
    Array.prototype.forEach.call(fil.children, function (c) { c.setAttribute("aria-pressed", c === b); });
    render();
  });
  document.addEventListener("click", function (e) {
    var d = document.getElementById("p-frotas");
    if (d && d.open && !d.contains(e.target)) { d.open = false; pm.abertoFrotas = false; }
  });
  painel.addEventListener("keydown", function (e) {
    var ka = e.target.closest && e.target.closest("article[data-tipo]");
    if (ka && e.target === ka && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); trocaTipo(ka.dataset.tipo); return; }
    var hk = e.target.closest && e.target.closest("[data-hora]");
    if (hk && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); trocaHora(+hk.dataset.hora); return; }
    var kk = e.target.closest && e.target.closest("[data-kst]");
    if (kk && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); fco.st = fco.st === kk.dataset.kst ? "" : kk.dataset.kst; render(); return; }
    var lt = e.target.closest && e.target.closest("li[data-turno]");
    if (lt && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); trocaTurno(+lt.dataset.turno); return; }
    var g = e.target.closest && e.target.closest("g[data-set]");
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); g.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  painel.addEventListener("toggle", function (e) { if (e.target.id === "p-frotas") pm.abertoFrotas = e.target.open; }, true);
  painel.addEventListener("change", function (e) {
    var ca = e.target.closest("input[data-carregar]");
    if (ca) { if (ca.files && ca.files[0]) carregarArquivo(ca.dataset.carregar, ca.files[0]); return; }
    var o = e.target.closest("select[data-obs]");
    if (o) {
      obsGravar(o.dataset.obs, o.value);
      var id = o.id; render(); var n = document.getElementById(id); if (n) n.focus(); return;
    }
  });
  painel.addEventListener("click", function (e) {
    if (e.target.closest("[data-cbaixar]")) camBaixar();
    var dz = e.target.closest("[data-desfazer]");
    if (dz && previa[dz.dataset.desfazer]) { D[dz.dataset.desfazer] = previa[dz.dataset.desfazer].original; delete previa[dz.dataset.desfazer]; fco.dia = -1; render(); }
  });
  window.addEventListener("hashchange", render);

  // ---------- Fotos dos painéis (23/11/2026) ----------
  // Passa por cada aba com os filtros atuais, tira uma foto (PNG) de cada uma e baixa tudo num .zip.
  var btFotos = document.getElementById("fotos");
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function esperaMapas() {
    for (var i = 0; i < 40; i++) { // até ~6 s para os mapas carregarem
      var pend = painel.querySelectorAll(".leaflet-tile:not(.leaflet-tile-loaded)").length;
      if (!pend) break;
      await espera(150);
    }
    await espera(400);
  }
  // A captura não leva o CSS das classes dos gráficos (SVG): copia cor, traço e fonte de cada elemento para atributos.
  // A aba é redesenhada depois da foto, então nada disso fica na tela.
  function fixarSvg(raiz) {
    var P = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity", "opacity", "font-size", "font-weight", "font-family", "text-anchor", "dominant-baseline", "paint-order", "stroke-linejoin", "stroke-linecap"];
    raiz.querySelectorAll("svg *").forEach(function (el) {
      if (el.closest(".leaflet-container")) return;
      var cs = getComputedStyle(el);
      P.forEach(function (p) { var v = cs.getPropertyValue(p); if (v) el.setAttribute(p, v); });
      if (cs.display === "none") el.setAttribute("display", "none");
    });
  }
  // Recortes iguais aos exemplos do usuário (23/11/2026): só as partes principais de cada aba.
  var FOTOS = [
    { id: "comportamento", nome: "Comportamental", keep: [".kpis", ".comp-hz"] },
    { id: "motor-ocioso", nome: "Motor ocioso", keep: [".mo-g1", ".mo-g2"] },
    { id: "permanencia", nome: "Permanência", keep: [".mapa-g"] }
  ];
  async function tirarFotos() {
    if (!window.htmlToImage) { alert("Não foi possível carregar a ferramenta de fotos. Atualize a página (Ctrl+F5) e tente de novo."); return; }
    var orig = atual(), lista = FOTOS.filter(function (f) { return ABAS.some(function (a) { return a.id === f.id; }); }), fotos = [];
    var agora = new Date(), p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    var carimbo = p2(agora.getDate()) + "-" + p2(agora.getMonth() + 1) + "-" + agora.getFullYear() + " " + p2(agora.getHours()) + "h" + p2(agora.getMinutes());
    btFotos.disabled = true; document.body.classList.add("tirando-fotos"); fotoModo = true;
    var fundo = getComputedStyle(document.body).backgroundColor || "#eef0ec";
    try {
      for (var i = 0; i < lista.length; i++) {
        var F = lista[i];
        btFotos.textContent = "Tirando fotos… " + (i + 1) + "/" + lista.length;
        if (atual() !== F.id) { location.hash = F.id; await espera(350); } else render();
        await esperaMapas();
        // Esconde de verdade o que não entra na foto (a aba é redesenhada depois).
        Array.prototype.forEach.call(painel.children, function (n) { if (!F.keep.some(function (sel) { return n.matches(sel); })) n.style.display = "none"; });
        await espera(150);
        fixarSvg(painel);
        try {
          var blob = await window.htmlToImage.toBlob(painel, { pixelRatio: 3, backgroundColor: fundo, // 3x: texto nítido mesmo depois da compressão do WhatsApp
            filter: function (n) { return !(n.classList && (n.classList.contains("leaflet-control-zoom") || n.classList.contains("leaflet-control-layers"))); } });
          fotos.push({ nome: F.nome + " " + carimbo + ".png", titulo: F.nome, blob: blob });
        } catch (err) { console.error("foto " + F.nome, err); }
      }
    } finally {
      fotoModo = false;
      if (atual() !== orig) location.hash = orig; else render();
      btFotos.disabled = false; btFotos.textContent = "📷 Fotos dos painéis"; document.body.classList.remove("tirando-fotos");
    }
    if (fotos.length) mostrarFotos(fotos, carimbo); else alert("Não consegui tirar as fotos. Tente de novo.");
  }
  // Janela com as fotos: copiar para colar no WhatsApp (Ctrl+V), compartilhar (menu do Windows/celular) ou baixar.
  function mostrarFotos(fotos, carimbo) {
    var velha = document.getElementById("dlg-fotos"); if (velha) velha.remove();
    var dl = document.createElement("dialog"); dl.id = "dlg-fotos"; dl.className = "dlg-fotos";
    var arquivos = fotos.map(function (f) { return new File([f.blob], f.nome, { type: "image/png" }); });
    var podeComp = !!(navigator.canShare && navigator.canShare({ files: arquivos }));
    var podeCopiar = !!(navigator.clipboard && window.ClipboardItem);
    dl.innerHTML = '<div class="df-topo"><h2>Fotos dos painéis</h2><button type="button" class="df-x" aria-label="Fechar">✕</button></div>' +
      '<p class="df-dica">' + (podeCopiar ? "Para mandar no WhatsApp Web: clique em <b>Copiar todas</b> (as fotos vão juntas numa imagem só) ou em <b>Copiar</b> numa foto, vá na conversa e aperte <b>Ctrl+V</b>. " : "") +
      (podeComp ? "Ou use <b>Compartilhar</b> para mandar todas de uma vez pelo menu do Windows/celular." : "") + "</p>" +
      '<div class="df-acoes">' + (podeCopiar ? '<button type="button" class="df-copiar-todas">📋 Copiar todas (numa imagem)</button>' : "") + (podeComp ? '<button type="button" class="df-comp">📤 Compartilhar todas</button>' : "") +
      '<a class="df-wa" href="https://web.whatsapp.com/" target="_blank" rel="noopener">💬 Abrir WhatsApp Web</a><button type="button" class="df-baixar">⬇ Baixar todas (.zip)</button></div>' +
      '<div class="df-lista">' + fotos.map(function (f, i) {
        return '<figure><img alt="Foto ' + esc(f.titulo) + '" data-i="' + i + '"><figcaption><b>' + esc(f.titulo) + '</b>' +
          (podeCopiar ? '<button type="button" data-copiar="' + i + '">📋 Copiar</button>' : "") + '<button type="button" data-baixar="' + i + '">⬇ Baixar</button></figcaption></figure>';
      }).join("") + "</div>";
    document.body.appendChild(dl);
    var urls = fotos.map(function (f) { return URL.createObjectURL(f.blob); });
    dl.querySelectorAll("img[data-i]").forEach(function (im) { im.src = urls[+im.dataset.i]; });
    // Junta as fotos uma embaixo da outra numa imagem só (a área de transferência guarda uma imagem por vez).
    function juntar() {
      return Promise.all(urls.map(function (u) { return new Promise(function (ok, er) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = er; im.src = u; }); }))
        .then(function (ims) {
          var gap = 24, w = Math.max.apply(null, ims.map(function (i) { return i.naturalWidth; })), h = ims.reduce(function (a, i) { return a + i.naturalHeight; }, 0) + gap * (ims.length - 1);
          var esc_ = Math.min(1, 30000 / h, 120e6 / (w * h)), c = document.createElement("canvas"); c.width = Math.round(w * esc_); c.height = Math.round(h * esc_);
          var g = c.getContext("2d"); g.fillStyle = getComputedStyle(document.body).backgroundColor || "#eef0ec"; g.fillRect(0, 0, c.width, c.height);
          var y = 0; ims.forEach(function (im) { g.drawImage(im, 0, y, im.naturalWidth * esc_, im.naturalHeight * esc_); y += (im.naturalHeight + gap) * esc_; });
          return new Promise(function (ok) { c.toBlob(ok, "image/png"); });
        });
    }
    function baixar(i) { var a = document.createElement("a"); a.href = urls[i]; a.download = fotos[i].nome; document.body.appendChild(a); a.click(); a.remove(); }
    dl.addEventListener("click", async function (e) {
      var b = e.target.closest("button, a"); if (!b) return;
      if (b.classList.contains("df-x")) { dl.close(); return; }
      if (b.classList.contains("df-baixar")) { // um .zip só: o navegador costuma bloquear vários downloads seguidos
        if (window.JSZip) { var z = new JSZip(); fotos.forEach(function (f) { z.file(f.nome, f.blob); }); var zb = await z.generateAsync({ type: "blob" }), za = document.createElement("a");
          za.href = URL.createObjectURL(zb); za.download = "Painel monitoramento - fotos " + carimbo + ".zip"; document.body.appendChild(za); za.click(); setTimeout(function () { URL.revokeObjectURL(za.href); za.remove(); }, 2000); }
        else for (var k = 0; k < fotos.length; k++) { baixar(k); await espera(600); }
        return; }
      if (b.dataset.baixar) { baixar(+b.dataset.baixar); return; }
      if (b.classList.contains("df-copiar-todas")) {
        var t1 = b.textContent; b.textContent = "Juntando…";
        try { await navigator.clipboard.write([new ClipboardItem({ "image/png": juntar() })]); b.textContent = "✓ Copiadas — cole com Ctrl+V"; }
        catch (err) { console.error(err); b.textContent = "Não copiou — tente de novo"; }
        setTimeout(function () { b.textContent = t1; }, 3000); return;
      }
      if (b.classList.contains("df-comp")) { try { await navigator.share({ files: arquivos, title: "Painel de monitoramento " + carimbo }); } catch (err) {} return; }
      if (b.dataset.copiar) {
        var t0 = b.textContent;
        try { await navigator.clipboard.write([new ClipboardItem({ "image/png": fotos[+b.dataset.copiar].blob })]); b.textContent = "✓ Copiada"; }
        catch (err) { b.textContent = "Não copiou"; }
        setTimeout(function () { b.textContent = t0; }, 2000);
      }
    });
    dl.addEventListener("close", function () { urls.forEach(URL.revokeObjectURL); dl.remove(); });
    dl.showModal();
  }
  // Copiar a imagem do quadro do Resumo (25/11/2026): para colar com Ctrl+V no WhatsApp/e-mail.
  painel.addEventListener("click", async function (e) {
    var b = e.target.closest("[data-copiar-resumo]"); if (!b) return;
    var q = painel.querySelector(".bl"); if (!q) return;
    var t0 = "📋 Copiar imagem";
    if (!window.htmlToImage || !navigator.clipboard || !window.ClipboardItem) { b.textContent = "Este navegador não copia imagens"; setTimeout(function () { b.textContent = t0; }, 3000); return; }
    b.disabled = true; b.textContent = "Copiando…";
    try {
      fixarSvg(q);
      var blob = window.htmlToImage.toBlob(q, { pixelRatio: 3, backgroundColor: getComputedStyle(q).backgroundColor || "#fff", // 3x: nítido mesmo com a compressão do WhatsApp
        filter: function (n) { return !(n.classList && (n.classList.contains("bl-copiar") || n.classList.contains("limpar"))); } });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      b.textContent = "✓ Copiada — cole com Ctrl+V";
    } catch (err) { console.error(err); b.textContent = "Não copiou — tente de novo"; }
    setTimeout(function () { b.disabled = false; b.textContent = t0; }, 3000);
  });
  var FOTOS_LIGADO = false; // desabilitado a pedido do usuário em 23/11/2026; para voltar, trocar para true
  if (btFotos) { btFotos.hidden = !FOTOS_LIGADO; if (FOTOS_LIGADO) btFotos.onclick = tirarFotos; }
  render();
};
