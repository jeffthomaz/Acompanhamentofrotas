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

  // ---------- Motor ocioso (dados reais do Power BI "Ociosidade Frota Leve") ----------
  function horas(h) { return h >= 100 ? num(h, 0) + " h" : num(h, 1).replace(",0", "") + " h"; }
  function abaOcioso() {
    var m = D.motorOcioso, meta = m.metaPct, V = m.veiculos;
    var processos = unicos(V.map(function (v) { return v.processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    var doProc = V.filter(function (v) { return !fil_.processo || v.processo === fil_.processo; });
    var resps = unicos(doProc.map(function (v) { return v.responsavel; }).filter(Boolean));
    if (fil_.responsavel && resps.indexOf(fil_.responsavel) < 0) fil_.responsavel = "";
    var vs = doProc.filter(function (v) { return !fil_.responsavel || v.responsavel === fil_.responsavel; });
    var tot = function (a) { return sum(a, function (x) { return x; }); };
    var rows = vs.map(function (v) {
      var li = tot(v.ligado), oc = tot(v.ocioso);
      return { v: v, li: li, oc: oc, pct: li ? oc / li * 100 : 0 };
    });
    var li = sum(rows, function (r) { return r.li; }), oc = sum(rows, function (r) { return r.oc; }), pct = li ? oc / li * 100 : 0;
    var porSem = m.semanas.map(function (_, k) {
      var a = sum(vs, function (v) { return v.ligado[k]; }), b = sum(vs, function (v) { return v.ocioso[k]; });
      return a ? b / a * 100 : 0;
    });
    var acima = rows.filter(function (r) { return r.pct > meta; }).sort(function (a, b) { return b.pct - a.pct; });

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="o-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      '<label>Responsável<select data-fil="responsavel" id="o-responsavel">' + opcoes(resps, fil_.responsavel, "Todos os responsáveis") + "</select></label>" +
      (fil_.processo || fil_.responsavel ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + rows.length + " " + plural(rows.length, "veículo leve", "veículos leves") + ", " + esc(m.periodo) + "</p></div>";

    var lead = "Os veículos ficaram <b>" + num(pct, 1) + "%</b> do tempo de motor ligado parados, <b>" + horas(oc) + "</b> de " + horas(li) + ". " +
      (acima.length ? "<b>" + acima.length + "</b> " + plural(acima.length, "veículo passou", "veículos passaram") + " da meta de " + meta + "%, e o <b>" + esc(acima[0].v.id) + "</b> lidera com " + num(acima[0].pct, 1) + "%."
                    : "Todos os veículos estão dentro da meta de " + meta + "%.");

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
    if (!fil_.processo && processos.length > 1) {
      var mp = {};
      rows.forEach(function (r) { var x = mp[r.v.processo] || (mp[r.v.processo] = { li: 0, oc: 0, n: 0 }); x.li += r.li; x.oc += r.oc; x.n++; });
      var lp = Object.keys(mp).map(function (k) { var x = mp[k]; return { nome: k, li: x.li, oc: x.oc, pct: x.li ? x.oc / x.li * 100 : 0, quem: "<b>" + esc(k) + "</b><span>" + x.n + " " + plural(x.n, "veículo", "veículos") + "</span>" }; })
        .sort(function (a, b) { return b.pct - a.pct; });
      secoes += '<section class="sec"><h2>Processos do mais ocioso ao menos</h2><p class="sub">A barra é a parte do tempo de motor ligado em que o veículo ficou parado. A linha vertical marca a meta. Clique em um processo para ver os veículos dele.</p>' + quadro(lp, "processo", true) + "</section>";
    }
    var lv = rows.map(function (r) { r.quem = "<b>" + esc(r.v.id) + "</b><span>" + esc([r.v.placa, fil_.processo ? r.v.responsavel : r.v.processo].filter(Boolean).join(" · ")) + "</span>"; return r; })
      .sort(function (a, b) { return b.pct - a.pct; });
    var limite = fil_.processo || fil_.responsavel ? lv.length : 15;
    secoes += '<section class="sec"><h2>' + (limite < lv.length ? "Os " + limite + " veículos mais ociosos" : "Veículos do mais ocioso ao menos") + "</h2>" +
      '<p class="sub">Horas de motor ligado parado no período.' + (limite < lv.length ? " Escolha um processo para ver todos os veículos dele." : "") + "</p>" + quadro(lv.slice(0, limite)) + "</section>";

    return filtros + '<div class="head"><p class="lead">' + lead + "</p>" + dias(porSem, "%", meta, "Motor ocioso por semana (linha tracejada: meta de " + meta + "%)", m.semanas) + "</div>" + secoes;
  }

  // ---------- Permanência: mapa de calor (dados reais da tabela Ocorrências do Power BI) ----------
  var pm = { frotas: [], medida: "tempo", dias: 0, abertoFrotas: false, refit: true, mapa: null, vista: null, marcas: {} };
  function permFiltrados() {
    var P = D.permanencia, V = P.veiculos;
    var processos = unicos(Object.keys(V).map(function (f) { return V[f].processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    var frotasProc = Object.keys(V).filter(function (f) { return !fil_.processo || V[f].processo === fil_.processo; }).sort();
    pm.frotas = pm.frotas.filter(function (f) { return frotasProc.indexOf(f) >= 0; });
    var sel = pm.frotas.length ? pm.frotas : frotasProc, set = {};
    sel.forEach(function (f) { set[f] = 1; });
    var ultimo = P.eventos.length ? P.eventos[P.eventos.length - 1][5] : "";
    var corte = "";
    if (pm.dias && ultimo) { var d = new Date(ultimo + "T12:00:00"); d.setDate(d.getDate() - pm.dias + 1); corte = d.toISOString().slice(0, 10); }
    var ev = P.eventos.filter(function (e) { return set[e[0]] && (!corte || e[5] >= corte); });
    return { P: P, V: V, processos: processos, frotasProc: frotasProc, ev: ev };
  }
  function dataBR(s) { return s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4); }
  function hmin(m) { return m >= 6000 ? num(m / 60, 0) + " h" : m >= 60 ? dur(Math.round(m)) : num(m, 0) + " min"; }

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

    var listaFrotas = F.frotasProc.map(function (f) {
      var v = V[f], on = !pm.frotas.length || pm.frotas.indexOf(f) >= 0;
      return '<label class="chk"><input type="checkbox" data-frota="' + esc(f) + '"' + (pm.frotas.length && on ? " checked" : "") + "><span><b>" + esc(f) + "</b> " + esc([v.placa, fil_.processo ? v.responsavel : v.processo].filter(Boolean).join(" · ")) + "</span></label>";
    }).join("");
    var rotFrotas = pm.frotas.length ? pm.frotas.length + " de " + F.frotasProc.length + " selecionadas" : "Todas (" + F.frotasProc.length + ")";
    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="p-processo">' + opcoes(F.processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      '<div class="campo"><span class="rot">Frotas</span><details class="frotas" id="p-frotas"' + (pm.abertoFrotas ? " open" : "") + '><summary>' + rotFrotas + '</summary><div class="fl-acoes"><button type="button" data-frotas="todas">Marcar todas</button><button type="button" data-frotas="limpar">Ver todas sem filtro</button></div><div class="fl-lista">' + listaFrotas + "</div></details></div>" +
      '<label>Período<select data-pm="dias" id="p-dias">' + [[0, "Todo o período"], [30, "Últimos 30 dias"], [7, "Últimos 7 dias"]].map(function (o) { return '<option value="' + o[0] + '"' + (pm.dias === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
      '<div class="campo"><span class="rot">Calor por</span><div class="pills" role="group" aria-label="Medida do mapa de calor"><button type="button" data-medida="tempo" aria-pressed="' + (pm.medida === "tempo") + '">Tempo parado</button><button type="button" data-medida="vezes" aria-pressed="' + (pm.medida === "vezes") + '">Nº de permanências</button></div></div>' +
      (fil_.processo || pm.frotas.length || pm.dias ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") + "</div>";

    var topo = locais[0] ? P.locais[locais[0].i] : null;
    var lead = ev.length ? "<b>" + num(ev.length, 0) + "</b> " + plural(ev.length, "permanência", "permanências") + " de " + nFrotas + " " + plural(nFrotas, "frota", "frotas") + ", somando <b>" + hmin(totMin) + "</b> parados em " + locais.length + " " + plural(locais.length, "local", "locais") + "." +
      (topo ? " O local com " + (pm.medida === "tempo" ? "mais tempo" : "mais permanências") + " é <b>" + esc(topo.nome) + "</b>." : "")
      : "Nenhuma permanência para esse filtro.";

    var mx = Math.max.apply(null, [1].concat(locais.map(function (x) { return pm.medida === "tempo" ? x.min : x.n; })));
    var ranking = '<section class="card"><h3>Locais de permanência</h3><p class="cs">Clique para ver no mapa.</p><div class="rolagem alta">' + locais.map(function (x, k) {
      var L0 = P.locais[x.i], val = pm.medida === "tempo" ? x.min : x.n;
      return '<button type="button" class="li lib" data-local="' + x.i + '"><span class="t">' + esc(L0.nome) + "<small>" + esc([L0.cidade, Object.keys(x.fr).length + " " + plural(Object.keys(x.fr).length, "frota", "frotas")].filter(Boolean).join(" · ")) + '</small></span><span class="n">' +
        (pm.medida === "tempo" ? hmin(x.min) + "<small>" + x.n + " " + plural(x.n, "vez", "vezes") + "</small>" : x.n + "<small>" + hmin(x.min) + "</small>") +
        '</span><div class="bb"><div class="ff" style="width:' + (val / mx * 100).toFixed(1) + "%;--i:" + k + '"></div></div></button>';
    }).join("") + "</div></section>";

    var longas = ev.slice().sort(function (a, b) { return b[3] - a[3]; }).slice(0, 8);
    var tabela = longas.length ? '<section class="card"><h3>Permanências mais longas</h3><ul class="longas">' + longas.map(function (e) {
      return "<li><span><b>" + esc(e[0]) + "</b> em " + esc(P.locais[e[4]].nome) + "<small>" + dataBR(e[5]) + " às " + e[6] + " · " + esc(V[e[0]].processo) + "</small></span><strong>" + hmin(e[3]) + "</strong></li>";
    }).join("") + "</ul></section>" : "";

    pm.ultimo = { ev: ev, locais: locais };
    return filtros + '<div class="head"><p class="lead">' + lead + "</p></div>" +
      '<div class="mapa-g"><section class="card mapa-card"><div id="mapa" class="mapa" role="region" aria-label="Mapa de calor das permanências"><p class="mapa-msg">Carregando mapa…</p></div>' +
      '<div class="escala"><span>Menos</span><i></i><span>Mais ' + (pm.medida === "tempo" ? "tempo parado" : "permanências") + "</span></div></section>" +
      '<div class="mapa-lado">' + ranking + tabela + "</div></div>";
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
      if (/^Sem ponto/.test(L0.nome)) return;
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

  var VIEWS = { "comportamento": abaComportamento, "motor-ocioso": abaOcioso, "permanencia": abaPermanencia };
  var tabs = document.getElementById("tabs"), painel = document.getElementById("painel"), fil = document.getElementById("filtro");

  function atual() { var h = (location.hash || "").replace("#", ""); return ABAS.some(function (a) { return a.id === h; }) ? h : ABAS[0].id; }
  function render() {
    var id = atual();
    tabs.innerHTML = ABAS.map(function (a) {
      return '<button role="tab" id="tab-' + a.id + '" aria-selected="' + (a.id === id) + '" aria-controls="painel" tabindex="' + (a.id === id ? 0 : -1) + '" data-tab="' + a.id + '">' + a.nome + "</button>";
    }).join("");
    painel.setAttribute("aria-labelledby", "tab-" + id);
    if (pm.mapa && id !== "permanencia") { pm.mapa.remove(); pm.mapa = null; }
    painel.innerHTML = VIEWS[id]();
    if (id === "permanencia") montarMapa();
    fil.hidden = true;
    var blocos = { "motor-ocioso": D.motorOcioso, "permanencia": D.permanencia }, b = blocos[id], real = b && b.real;
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
    var sel = e.target.closest("select[data-fil], select[data-pm]"); if (!sel) return;
    if (sel.dataset.pm) pm[sel.dataset.pm] = +sel.value;
    else { fil_[sel.dataset.fil] = sel.value; if (sel.dataset.fil === "processo") { fil_.responsavel = ""; pm.frotas = []; } }
    pm.refit = true;
    render();
    var n = document.getElementById(sel.id); if (n) n.focus();
  });
  painel.addEventListener("click", function (e) {
    var l = e.target.closest("[data-limpar]");
    if (l) { fil_.processo = ""; fil_.responsavel = ""; pm.frotas = []; pm.dias = 0; pm.refit = true; render(); return; }
    var md = e.target.closest("[data-medida]");
    if (md) { pm.medida = md.dataset.medida; render(); return; }
    var fa = e.target.closest("[data-frotas]");
    if (fa) { pm.frotas = fa.dataset.frotas === "todas" ? permFiltrados().frotasProc.slice() : []; if (pm.frotas.length === permFiltrados().frotasProc.length && fa.dataset.frotas !== "todas") pm.frotas = []; pm.refit = true; pm.abertoFrotas = true; render(); return; }
    var lc = e.target.closest("[data-local]");
    if (lc && pm.mapa && pm.marcas[lc.dataset.local]) { var mk = pm.marcas[lc.dataset.local]; pm.mapa.flyTo(mk.getLatLng(), 15); mk.openPopup(); document.getElementById("mapa").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    var b = e.target.closest("[data-set]"); if (!b) return;
    var p = b.dataset.set, k = p.indexOf(":");
    fil_[p.slice(0, k)] = p.slice(k + 1); pm.frotas = []; pm.refit = true; render();
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
  painel.addEventListener("toggle", function (e) { if (e.target.id === "p-frotas") pm.abertoFrotas = e.target.open; }, true);
  window.addEventListener("hashchange", render);
  render();
};
