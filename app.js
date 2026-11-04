window.iniciarPainel = function (D) {
  // Abas sem dados para o grupo do usuário não aparecem.
  var ABAS = [
    { id: "comportamento", nome: "Comportamento", tem: "ocorrencias" },
    { id: "motor-ocioso", nome: "Motor ocioso", tem: "motorOcioso" },
    { id: "permanencia", nome: "Permanência", tem: "permanencia" }
  ].filter(function (a) { return D[a.tem]; });
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
  var fil_ = { processo: "", responsavel: "" };
  var CATS = [
    { id: "vel", nome: "Excesso de velocidade", icone: "M4 17a8 8 0 1 1 16 0M12 17l4-5" },
    { id: "celular", nome: "Uso de celular", icone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2" },
    { id: "cinto", nome: "Sem cinto de segurança", icone: "M12 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 21l3-9h6l3 9M8 12l9 7" },
    { id: "distracao", nome: "Distração", icone: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" },
    { id: "cigarro", nome: "Uso de cigarro", icone: "M3 16h13v3H3zM19 16v3M12 12c0-2 2-2 2-4M16 12c0-2 2-2 2-4" },
    { id: "faixa", nome: "Ultrapassagem em faixa contínua", icone: "M8 3L4 21M16 3l4 18M12 4v3M12 10.5v3M12 17v3" }
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

  function empilhado(dados, simples, largura) {
    // dados: [{d:'28/10', partes:[n por categoria], total}]
    var W = largura || 520, H = 290, pl = 32, pr = 6, pt = 26, pb = 28, ih = H - pt - pb;
    var max = Math.max.apply(null, [1].concat(dados.map(function (x) { return x.total; })));
    var passo = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].filter(function (p) { return max / p <= 6; })[0] || 5000;
    var topo = Math.ceil(max / passo) * passo, bw = (W - pl - pr) / dados.length;
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
        sv += '<rect class="seg c-' + (simples ? "total" : CATS[k].id) + '" x="' + xx.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h, 0).toFixed(1) + '" style="animation-delay:' + i * 45 + 'ms"><title>' + esc((simples ? "Total" : CATS[k].nome) + ": " + n) + "</title></rect>";
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

  function abaComportamento() {
    var O = D.ocorrencias, T = O.tipos, NDIA = D.dias.length;
    var processos = unicos(O.linhas.map(function (l) { return l.processo; }));
    var doProc = O.linhas.filter(function (l) { return !fil_.processo || l.processo === fil_.processo; });
    var resps = unicos(doProc.map(function (l) { return l.responsavel; }));
    if (fil_.responsavel && resps.indexOf(fil_.responsavel) < 0) fil_.responsavel = "";
    var linhas = doProc.filter(function (l) { return !fil_.responsavel || l.responsavel === fil_.responsavel; });

    var cont = {}, ant = {}, diaT = {};
    T.forEach(function (t) {
      diaT[t.id] = D.dias.map(function (_, i) { return sum(linhas, function (l) { return l.d[t.id][i]; }); });
      cont[t.id] = sum(diaT[t.id], function (x) { return x; });
      ant[t.id] = sum(linhas, function (l) { return l.ant[t.id]; });
    });
    CATS.forEach(function (c) {
      var ids = T.filter(function (t) { return (t.grupo || t.id) === c.id; }).map(function (t) { return t.id; });
      c.ids = ids;
      c.n = sum(ids, function (id) { return cont[id]; });
      c.ant = sum(ids, function (id) { return ant[id]; });
      c.dia = D.dias.map(function (_, i) { return sum(ids, function (id) { return diaT[id][i]; }); });
    });
    var total = sum(CATS, function (c) { return c.n; }), totalAnt = sum(CATS, function (c) { return c.ant; });
    var frotas = sum(linhas, function (l) { return l.frotas; });
    var sem = [0, 1, 2].map(function (k) { return sum(linhas, function (l) { return l.sem[k]; }); }).concat([total]);

    // Filtros
    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="f-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      '<label>Responsável<select data-fil="responsavel" id="f-responsavel">' + opcoes(resps, fil_.responsavel, "Todos os responsáveis") + "</select></label>" +
      (fil_.processo || fil_.responsavel ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + num(frotas, 0) + " " + plural(frotas, "veículo", "veículos") + " no filtro, " + esc(D.periodo) + "</p></div>";

    // Cartões
    var kpis = '<div class="kpis"><article class="kpi c-total"><div class="kh">' + ico(TOTAL_ICONE) + '<span class="kl">Total de ocorrências</span></div><strong class="kv">' + num(total, 0) + "</strong>" + delta(total, totalAnt) + '<span class="ks">vs. período anterior</span></article>' +
      CATS.map(function (c) {
        return '<article class="kpi c-' + c.id + '"><div class="kh">' + ico(c.icone) + '<span class="kl">' + esc(c.nome).replace("Ultrapassagem", "Ultra&shy;passagem") + '</span></div><strong class="kv">' + num(c.n, 0) + "</strong>" + delta(c.n, c.ant) + '<span class="ks">vs. período anterior</span></article>';
      }).join("") + "</div>";

    // Evolução (colunas empilhadas)
    var dados = D.dias.map(function (d, i) { return { d: d, partes: CATS.map(function (c) { return c.dia[i]; }), total: sum(CATS, function (c) { return c.dia[i]; }) }; });
    var leg = CATS.map(function (c) { return '<li><i class="c-' + c.id + '"></i>' + esc(c.nome) + "</li>"; }).join("");
    var evolucao = '<section class="card"><h3>Evolução das ocorrências</h3><ul class="legend">' + leg + "</ul>" + empilhado(dados) + "</section>";

    // Participação por tipo
    var ord = CATS.slice().sort(function (a, b) { return b.n - a.n; });
    var part = '<section class="card"><h3>Participação por tipo</h3><div class="rosca-w">' + rosca(ord, total) + '<ul class="rleg">' + ord.map(function (c) {
      return '<li><i class="c-' + c.id + '"></i><span>' + esc(c.nome) + "</span><b>" + (total ? num(c.n / total * 100, 1) : "0,0") + "%</b></li>";
    }).join("") + "</ul></div></section>";

    // Tendência semanal (colunas)
    var tend = '<section class="card"><h3>Tendência das ocorrências</h3><p class="cs">Total por semana. A semana 4 é o período atual.</p>' + empilhado(["Semana 1", "Semana 2", "Semana 3", "Semana 4"].map(function (d, i) { return { d: d, partes: [], total: sem[i] }; }), true, 300) + "</section>";

    // Excesso de velocidade por faixa
    var velC = CATS[0], velTipos = T.filter(function (t) { return t.grupo === "vel"; }), mxV = Math.max.apply(null, [1].concat(velTipos.map(function (t) { return cont[t.id]; })));
    var velCard = '<section class="card"><h3>Excesso de velocidade por faixa</h3><p class="cs">' + num(velC.n, 0) + " " + plural(velC.n, "ocorrência", "ocorrências") + " no período</p>" + velTipos.map(function (t, k) {
      return '<div class="li"><span class="t">' + esc(t.nome) + '</span><span class="n">' + num(cont[t.id], 0) + '<small>' + (velC.n ? num(cont[t.id] / velC.n * 100, 0) + "%" : "") + '</small></span><div class="bb"><div class="ff v' + (k + 1) + '" style="width:' + (cont[t.id] / mxV * 100).toFixed(1) + '%;--i:' + k + '"></div></div></div>';
    }).join("") + "</section>";

    // Concentração por processo ou responsável (clicável)
    var onde = fil_.processo ? (fil_.responsavel ? "" : "responsavel") : "processo", conc = "", topoConc = null;
    if (onde) {
      var mapa = {};
      linhas.forEach(function (l) {
        var m = mapa[l[onde]] || (mapa[l[onde]] = { n: 0, frotas: 0 });
        m.n += sum(T, function (t) { return sum(l.d[t.id], function (x) { return x; }); }); m.frotas += l.frotas;
      });
      var lista = Object.keys(mapa).map(function (k) { return { nome: k, n: mapa[k].n, frotas: mapa[k].frotas }; }).sort(function (a, b) { return b.n - a.n; });
      topoConc = lista[0];
      var mx = Math.max.apply(null, [1].concat(lista.map(function (x) { return x.n; })));
      conc = '<section class="card"><h3>Onde se concentram</h3><p class="cs">Por ' + (onde === "processo" ? "processo" : "responsável") + ". Clique para filtrar.</p><div class=\"rolagem\">" + lista.map(function (x, k) {
        return '<button type="button" class="li lib" data-set="' + onde + ":" + esc(x.nome) + '"><span class="t">' + esc(x.nome) + '<small>' + x.frotas + " " + plural(x.frotas, "veículo", "veículos") + '</small></span><span class="n">' + num(x.n, 0) +
          '<small>' + num(x.n / x.frotas, 1) + ' por veículo</small></span><div class="bb"><div class="ff" style="width:' + (x.n / mx * 100).toFixed(1) + '%;--i:' + k + '"></div></div></button>';
      }).join("") + "</div></section>";
    } else {
      conc = '<section class="card"><h3>Onde se concentram</h3><p class="cs">Há um processo e um responsável escolhidos. Use "Limpar filtros" para ver a distribuição.</p></section>';
    }

    // Principais alertas
    var com = CATS.filter(function (c) { return variacao(c.n, c.ant) !== null; });
    var sobe = com.slice().sort(function (a, b) { return variacao(b.n, b.ant) - variacao(a.n, a.ant); })[0];
    var desce = com.slice().sort(function (a, b) { return variacao(a.n, a.ant) - variacao(b.n, b.ant); })[0];
    var alertas = [];
    if (total) alertas.push(["ruim", "!", "<b>" + esc(ord[0].nome) + "</b> é o tipo mais frequente, com " + num(ord[0].n / total * 100, 0) + "% das ocorrências."]);
    if (topoConc && total && lista.length > 1) alertas.push(["atencao", "▲", "<b>" + esc(topoConc.nome) + "</b> concentra " + num(topoConc.n / total * 100, 0) + "% das ocorrências."]);
    if (sobe && variacao(sobe.n, sobe.ant) > 0) alertas.push(["atencao", "↑", "Aumento de <b>" + esc(sobe.nome.toLowerCase()) + "</b> (+" + num(variacao(sobe.n, sobe.ant), 0) + "%) vs. período anterior."]);
    if (desce && variacao(desce.n, desce.ant) < 0) alertas.push(["bom", "↓", "Redução de <b>" + num(-variacao(desce.n, desce.ant), 0) + "%</b> em " + esc(desce.nome.toLowerCase()) + " vs. período anterior."]);
    if (!alertas.length) alertas.push(["bom", "✓", "Nenhuma ocorrência para esse filtro."]);
    var alerta = '<section class="card"><h3>Principais alertas</h3><ul class="alertas">' + alertas.slice(0, 4).map(function (a) {
      return '<li><span class="ai ' + a[0] + '" aria-hidden="true">' + a[1] + "</span><span>" + a[2] + "</span></li>";
    }).join("") + "</ul></section>";

    return filtros + kpis + '<div class="g3 g-a">' + evolucao + part + tend + '</div><div class="g3 g-b">' + velCard + conc + alerta + "</div>";
  }

  // ---------- Motor ocioso ----------
  function abaOcioso() {
    var m = D.motorOcioso;
    var rows = equips().map(function (e) {
      var x = m.porEquip[e.id];
      return { id: e.id, tipo: e.tipo, ligado: x.ligado, ocioso: x.ocioso, pct: x.ocioso / x.ligado * 100 };
    }).sort(function (a, b) { return b.pct - a.pct; });
    if (!rows.length) return "";
    var lig = sum(rows, function (r) { return r.ligado; }), oc = sum(rows, function (r) { return r.ocioso; });
    var pct = oc / lig * 100, acima = rows.filter(function (r) { return r.pct > m.metaPct; }).length;
    var maxP = Math.max.apply(null, [m.metaPct].concat(rows.map(function (r) { return r.pct; }))) * 1.12;
    var mkPos = (m.metaPct / maxP * 100).toFixed(1);
    var lead = "A frota ficou <b>" + num(pct, 1) + "%</b> do tempo com o motor ligado e parado. " +
      (acima ? "<b>" + acima + "</b> " + plural(acima, "equipamento passou", "equipamentos passaram") + " da meta de " + m.metaPct + "%, e <b>" + rows[0].id + "</b> lidera com " + num(rows[0].pct, 1) + "%."
             : "Todos os equipamentos estão dentro da meta de " + m.metaPct + "%.");
    var cab = '<div class="row hd"><div></div><div class="plot"><span class="mkl" style="left:' + mkPos + '%">meta ' + m.metaPct + '%</span></div><div></div></div>';
    var corpo = rows.map(function (r, i) {
      var over = r.pct > m.metaPct;
      return linha(i, "<b>" + r.id + "</b><span>" + r.tipo + "</span>",
        '<div class="bar solo' + (over ? " over" : "") + '" style="width:' + (r.pct / maxP * 100).toFixed(1) + '%;--i:' + i + '"></div><i class="mk" style="left:' + mkPos + '%"></i>',
        '<strong class="' + (over ? "n-critico" : "n-bom") + '">' + num(r.pct, 1) + "%</strong><small>" + num(r.ocioso, 1) + " de " + num(r.ligado, 1) + " h por dia</small>");
    }).join("");
    return '<div class="head"><p class="lead">' + lead + "</p>" + dias(m.pctPorDia, "%", m.metaPct, "Motor ocioso por dia na frota (linha tracejada: meta de " + m.metaPct + "%)") + "</div>" +
      '<section class="sec"><h2>Equipamentos do mais ocioso ao menos</h2><p class="sub">A barra é a parte do tempo ligado em que o motor ficou parado. A linha vertical marca a meta.</p><div class="board">' + cab + corpo + "</div></section>";
  }

  // ---------- Permanência ----------
  function abaPermanencia() {
    var p = D.permanencia, ids = equips().map(function (e) { return e.id; });
    var lim = {}; p.locais.forEach(function (l) { lim[l.nome] = l.limiteMin; });
    var est = p.estadias.filter(function (x) { return ids.indexOf(x.equip) >= 0; });
    var acima = est.filter(function (x) { return x.min > lim[x.local]; }).length;
    var visitas = sum(p.locais, function (l) { return l.visitas; });
    var media = Math.round(sum(p.locais, function (l) { return l.visitas * l.mediaMin; }) / visitas);
    var locais = p.locais.slice().sort(function (a, b) { return b.mediaMin / b.limiteMin - a.mediaMin / a.limiteMin; });
    var maxM = Math.max.apply(null, p.locais.map(function (l) { return Math.max(l.mediaMin, l.limiteMin); })) * 1.1;
    var lead = est.length
      ? "<b>" + acima + " de " + est.length + "</b> estadias recentes passaram do limite do local. A permanência média na frota é de <b>" + dur(media) + "</b>."
      : "Nenhuma estadia registrada para esse filtro.";
    var corpo = locais.map(function (l, i) {
      var over = l.mediaMin > l.limiteMin;
      return linha(i, "<b>" + esc(l.nome) + "</b><span>" + l.visitas + " visitas</span>",
        '<div class="bar solo' + (over ? " over" : "") + '" style="width:' + (l.mediaMin / maxM * 100).toFixed(1) + '%;--i:' + i + '"></div><i class="mk" style="left:' + (l.limiteMin / maxM * 100).toFixed(1) + '%"></i>',
        '<strong class="' + (over ? "n-critico" : "n-bom") + '">' + dur(l.mediaMin) + "</strong><small>limite " + dur(l.limiteMin) + "</small>");
    }).join("");
    var rows = est.map(function (x) { return { equip: x.equip, local: x.local, entrada: x.entrada, min: x.min, lim: lim[x.local] }; });
    var tabela = sortable(rows, "pm").map(function (r) {
      var ac = r.min > r.lim;
      return '<tr><th scope="row">' + r.equip + "</th><td>" + esc(r.local) + "</td><td>" + r.entrada + '</td><td class="r">' + dur(r.min) + '</td><td class="r">' + dur(r.lim) +
        '</td><td class="r"><span class="b ' + (ac ? "critico" : "bom") + '" style="padding:.05rem .5rem;border-radius:999px;font-size:.78rem;font-weight:600">' + (ac ? "Acima do limite" : "Dentro do limite") + "</span></td></tr>";
    }).join("");
    return '<div class="head"><p class="lead">' + lead + "</p></div>" +
      '<section class="sec"><h2>Permanência média por local</h2><p class="sub">A barra é o tempo médio de cada visita. A linha vertical marca o limite esperado para o local.</p><div class="board">' + corpo + "</div></section>" +
      (est.length ? '<section class="sec"><h2>Últimas estadias</h2><p class="sub">Clique no título de uma coluna para ordenar.</p><div class="scroll"><table class="tb"><thead><tr>' +
        th("pm", "equip", "Equipamento") + th("pm", "local", "Local") + th("pm", "entrada", "Entrada") + th("pm", "min", "Tempo", 1) + th("pm", "lim", "Limite", 1) + '<th scope="col" class="r">Situação</th></tr></thead><tbody>' + tabela + "</tbody></table></div></section>" : "");
  }

  var VIEWS = { "comportamento": abaComportamento, "motor-ocioso": abaOcioso, "permanencia": abaPermanencia };
  var tabs = document.getElementById("tabs"), painel = document.getElementById("painel"), fil = document.getElementById("filtro");

  function atual() { var h = (location.hash || "").replace("#", ""); return ABAS.some(function (a) { return a.id === h; }) ? h : ABAS[0].id; }
  function render() {
    var id = atual();
    tabs.innerHTML = ABAS.map(function (a) {
      return '<button role="tab" id="tab-' + a.id + '" aria-selected="' + (a.id === id) + '" aria-controls="painel" tabindex="' + (a.id === id ? 0 : -1) + '" data-tab="' + a.id + '">' + a.nome + "</button>";
    }).join("");
    painel.setAttribute("aria-labelledby", "tab-" + id);
    painel.innerHTML = VIEWS[id]();
    fil.hidden = id === "comportamento";
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
    var sel = e.target.closest("select[data-fil]"); if (!sel) return;
    fil_[sel.dataset.fil] = sel.value;
    if (sel.dataset.fil === "processo") fil_.responsavel = "";
    render();
    var n = document.getElementById(sel.id); if (n) n.focus();
  });
  painel.addEventListener("click", function (e) {
    var l = e.target.closest("[data-limpar]");
    if (l) { fil_.processo = ""; fil_.responsavel = ""; render(); return; }
    var b = e.target.closest("[data-set]"); if (!b) return;
    var p = b.dataset.set, k = p.indexOf(":");
    fil_[p.slice(0, k)] = p.slice(k + 1); render();
  });
  fil.addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]"); if (!b) return;
    filtro = b.dataset.f;
    Array.prototype.forEach.call(fil.children, function (c) { c.setAttribute("aria-pressed", c === b); });
    render();
  });
  window.addEventListener("hashchange", render);
  document.getElementById("periodo").textContent = D.periodo;
  document.getElementById("aviso").hidden = !D.exemplo;
  render();
};
