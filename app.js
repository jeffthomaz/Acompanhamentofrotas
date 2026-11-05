window.iniciarPainel = function (D) {
  // Abas sem dados para o grupo do usuário não aparecem.
  var ABAS = [
    { id: "comportamento", nome: "Comportamento", tem: "comportamento" },
    { id: "motor-ocioso", nome: "Motor ocioso", tem: "motorOcioso" },
    { id: "permanencia", nome: "Permanência", tem: "permanencia" },
    { id: "conectividade", nome: "Conectividade", tem: "conectividade" },
    { id: "cameras", nome: "Câmeras", tem: "cameras" }
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
    { id: "fadiga", nome: "Fadiga e bocejo", icone: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" },
    { id: "camera", nome: "Câmera obstruída", icone: "M3 7h4l2-3h6l2 3h4v13H3zM12 10.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM3 3l18 18" }
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

  function abaComportamento() {
    var C = D.comportamento, T = C.tipos, F = C.frotas, NT = T.length;
    var fc = fil_.comp || (fil_.comp = { frota: "", gerencia: "", janela: 28 });
    // Filtros: tipo de frota, processo e gerência.
    var ids = Object.keys(F).filter(function (f) { return !fc.frota || F[f].frota === fc.frota; });
    var processos = unicos(ids.map(function (f) { return F[f].processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    ids = ids.filter(function (f) { return !fil_.processo || F[f].processo === fil_.processo; });
    var gerencias = unicos(ids.map(function (f) { return F[f].gerencia; }));
    if (fc.gerencia && gerencias.indexOf(fc.gerencia) < 0) fc.gerencia = "";
    ids = ids.filter(function (f) { return !fc.gerencia || F[f].gerencia === fc.gerencia; });
    var sel = {}; ids.forEach(function (f) { sel[f] = 1; });
    var ev = C.ev.filter(function (e) { return sel[e[2]]; });

    // Janela atual e anterior (mesmo tamanho), terminando no último dia com dados.
    var N = C.ndias, J = fc.janela && fc.janela < N ? fc.janela : N, a0 = N - J, b0 = a0 - J;
    var dia0 = new Date(C.inicio + "T12:00:00");
    function rot(i) { var d = new Date(dia0); d.setDate(d.getDate() + i); return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2); }
    var cur = [], ant = [], k;
    for (k = 0; k < NT; k++) { cur.push(0); ant.push(0); }
    var porDia = [];
    for (k = 0; k < N; k++) porDia.push(new Array(NT).fill(0));
    var porFrota = {};
    ev.forEach(function (e) {
      porDia[e[0]][e[1]] += e[3];
      if (e[0] >= a0) { cur[e[1]] += e[3]; porFrota[e[2]] = (porFrota[e[2]] || 0) + e[3]; }
      else if (b0 >= 0 && e[0] >= b0) ant[e[1]] += e[3];
    });
    var temBase = b0 >= 0;
    CATS.forEach(function (c) {
      var ix = T.map(function (t, i) { return (t.grupo || t.id) === c.id ? i : -1; }).filter(function (i) { return i >= 0; });
      c.ix = ix; c.n = sum(ix, function (i) { return cur[i]; }); c.ant = temBase ? sum(ix, function (i) { return ant[i]; }) : 0;
    });
    var total = sum(CATS, function (c) { return c.n; }), totalAnt = sum(CATS, function (c) { return c.ant; });
    var nVeic = Object.keys(porFrota).length;
    function dl(cur, ant) { return temBase ? delta(cur, ant) : '<span class="dl neutro">período todo</span>'; }

    var janelas = [[7, "Últimos 7 dias"], [28, "Últimas 4 semanas"], [91, "Últimos 3 meses"], [0, "Todo o período"]];
    var filtros = '<div class="filtros">' +
      '<div class="campo"><span class="rot">Frota</span><div class="pills" role="group" aria-label="Tipo de frota">' + [["", "Todas"], ["Leve", "Leve"], ["Pesada", "Pesada"]].map(function (o) {
        return '<button type="button" data-cfrota="' + o[0] + '" aria-pressed="' + (fc.frota === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div></div>" +
      '<label>Processo<select data-fil="processo" id="c-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      '<label>Gerência<select data-comp="gerencia" id="c-gerencia">' + opcoes(gerencias, fc.gerencia, "Todas as gerências") + "</select></label>" +
      '<label>Período<select data-comp="janela" id="c-janela">' + janelas.map(function (o) { return '<option value="' + o[0] + '"' + (fc.janela === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
      (fc.frota || fil_.processo || fc.gerencia ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + num(nVeic, 0) + " " + plural(nVeic, "veículo", "veículos") + " com ocorrência, " + rot(a0) + " a " + rot(N - 1) + (temBase ? " (comparado com " + rot(b0) + " a " + rot(a0 - 1) + ")" : "") + "</p></div>";

    var kpis = '<div class="kpis"><article class="kpi c-total"><div class="kh">' + ico(TOTAL_ICONE) + '<span class="kl">Total de ocorrências</span></div><strong class="kv">' + num(total, 0) + "</strong>" + dl(total, totalAnt) + '<span class="ks">' + (temBase ? "vs. período anterior" : "&nbsp;") + "</span></article>" +
      CATS.map(function (c) {
        // Cards com mais de um tipo (ex.: fadiga e bocejo) mostram a quantidade de cada um.
        var partes = c.ix.length > 1 && c.id !== "vel" ? '<span class="kp">' + c.ix.map(function (i) { return esc(T[i].nome) + " <b>" + num(cur[i], 0) + "</b>"; }).map(function (x) { return "<span>" + x + "</span>"; }).join("") + "</span>" : "";
        return '<article class="kpi c-' + c.id + '"><div class="kh">' + ico(c.icone) + '<span class="kl">' + esc(c.nome) + '</span></div><strong class="kv">' + num(c.n, 0) + "</strong>" + partes + dl(c.n, c.ant) + '<span class="ks">' + (temBase ? "vs. período anterior" : "&nbsp;") + "</span></article>";
      }).join("") + "</div>";

    // Evolução: por dia até 14 dias, senão por semana.
    var dados = [];
    if (J <= 14) {
      for (k = a0; k < N; k++) dados.push({ d: rot(k), partes: CATS.map(function (c) { return sum(c.ix, function (i) { return porDia[k][i]; }); }) });
    } else {
      for (var s = a0; s < N; s += 7) {
        var e2 = Math.min(s + 7, N), partes = CATS.map(function (c) { var t = 0; for (var q = s; q < e2; q++) t += sum(c.ix, function (i) { return porDia[q][i]; }); return t; });
        dados.push({ d: rot(s), partes: partes });
      }
      if (dados.length > 14) { // muitas semanas: agrupa de duas em duas
        var d2 = []; for (k = 0; k < dados.length; k += 2) { var b = dados[k + 1]; d2.push({ d: dados[k].d, partes: dados[k].partes.map(function (v, i) { return v + (b ? b.partes[i] : 0); }) }); } dados = d2;
      }
    }
    dados.forEach(function (x) { x.total = sum(x.partes, function (v) { return v; }); });
    var leg = CATS.map(function (c) { return '<li><i class="c-' + c.id + '"></i>' + esc(c.nome) + "</li>"; }).join("");
    var evolucao = '<section class="card"><h3>Evolução das ocorrências</h3><p class="cs">' + (J <= 14 ? "Por dia." : "Por semana, a partir da data indicada.") + '</p><ul class="legend">' + leg + "</ul>" + empilhado(dados) + "</section>";

    var ord = CATS.slice().sort(function (a, b) { return b.n - a.n; });
    var part = '<section class="card"><h3>Participação por tipo</h3><div class="rosca-w">' + rosca(ord, total) + '<ul class="rleg">' + ord.map(function (c) {
      return '<li><i class="c-' + c.id + '"></i><span>' + esc(c.nome) + "</span><b>" + (total ? num(c.n / total * 100, 1) : "0,0") + "%</b></li>";
    }).join("") + "</ul></div></section>";

    // Tendência: totais das últimas 8 semanas completas até o último dia.
    var sem = [];
    for (k = N; k - 7 >= 0 && sem.length < 8; k -= 7) { var t2 = 0; for (var q = k - 7; q < k; q++) t2 += sum(porDia[q], function (v) { return v; }); sem.unshift({ d: rot(k - 7), partes: [], total: t2 }); }
    var tend = '<section class="card"><h3>Tendência semanal</h3><p class="cs">Total por semana nas últimas ' + sem.length + " semanas. A última termina em " + rot(N - 1) + ".</p>" + empilhado(sem, true, 360) + "</section>";

    var velC = CATS[0], velIx = velC.ix, mxV = Math.max.apply(null, [1].concat(velIx.map(function (i) { return cur[i]; })));
    var velCard = '<section class="card"><h3>Excesso de velocidade por faixa</h3><p class="cs">Faixas da nova política de frotas, pelo quanto passou do limite da via. ' + num(velC.n, 0) + " " + plural(velC.n, "ocorrência", "ocorrências") + " no período.</p>" + velIx.map(function (i, kk) {
      return '<div class="li"><span class="t">' + esc(T[i].nome) + '</span><span class="n">' + num(cur[i], 0) + "<small>" + (velC.n ? num(cur[i] / velC.n * 100, 0) + "%" : "") + '</small></span><div class="bb"><div class="ff v' + (kk + 1) + '" style="width:' + (cur[i] / mxV * 100).toFixed(1) + "%;--i:" + kk + '"></div></div></div>';
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

    var com = temBase ? CATS.filter(function (c) { return variacao(c.n, c.ant) !== null && (c.n + c.ant) >= 10; }) : [];
    var sobe = com.slice().sort(function (a, b) { return variacao(b.n, b.ant) - variacao(a.n, a.ant); })[0];
    var desce = com.slice().sort(function (a, b) { return variacao(a.n, a.ant) - variacao(b.n, b.ant); })[0];
    var alertas = [];
    if (total) alertas.push(["ruim", "!", "<b>" + esc(ord[0].nome) + "</b> é o tipo mais frequente, com " + num(ord[0].n / total * 100, 0) + "% das ocorrências."]);
    if (lista.length > 1 && total) alertas.push(["atencao", "▲", "<b>" + esc(lista[0].nome) + "</b> concentra " + num(lista[0].n / total * 100, 0) + "% das ocorrências."]);
    if (velC.n && cur[velIx[2]]) alertas.push(["ruim", "!", "<b>" + num(cur[velIx[2]], 0) + "</b> " + plural(cur[velIx[2]], "excesso", "excessos") + " de velocidade acima de 50% do limite."]);
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

    // Nas observações, só estabelecimentos (posto, padaria, restaurante...), nunca cercas com nome de colaborador.
    var topoX = locais.filter(function (x) { return P.locais[x.i].tipo === "estabelecimento"; })[0];
    var topo = topoX ? P.locais[topoX.i] : null;
    var lead = ev.length ? "<b>" + num(ev.length, 0) + "</b> " + plural(ev.length, "permanência", "permanências") + " de " + nFrotas + " " + plural(nFrotas, "frota", "frotas") + ", somando <b>" + hmin(totMin) + "</b> parados em " + locais.length + " " + plural(locais.length, "local", "locais") + "." +
      (topo ? " O estabelecimento com " + (pm.medida === "tempo" ? "mais tempo parado" : "mais permanências") + " é <b>" + esc(topo.nome) + "</b>, com " + (pm.medida === "tempo" ? hmin(topoX.min) : topoX.n + " " + plural(topoX.n, "vez", "vezes")) + "." : "")
      : "Nenhuma permanência para esse filtro.";

    // Lista: quantidade de paradas e tempo médio por parada (sem total de horas).
    var porParadas = locais.slice().sort(function (a, b) { return b.n - a.n || b.min / b.n - a.min / a.n; });
    var mx = Math.max.apply(null, [1].concat(porParadas.map(function (x) { return x.n; })));
    var ranking = '<section class="card"><h3>Locais de permanência</h3><p class="cs">Quantidade de paradas e tempo médio de cada parada. Clique para ver no mapa.</p><div class="rolagem alta">' + porParadas.map(function (x, k) {
      var L0 = P.locais[x.i], nf = Object.keys(x.fr).length;
      return '<button type="button" class="li lib" data-local="' + x.i + '"><span class="t">' + esc(L0.nome) + "<small>" + esc([L0.cidade, nf + " " + plural(nf, "frota", "frotas")].filter(Boolean).join(" · ")) + '</small></span><span class="n">' +
        num(x.n, 0) + " " + plural(x.n, "parada", "paradas") + "<small>média de " + hmin(x.min / x.n) + "</small>" +
        '</span><div class="bb"><div class="ff" style="width:' + (x.n / mx * 100).toFixed(1) + "%;--i:" + k + '"></div></div></button>';
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

  // ---------- Conectividade (Power BI "Conectividade" + planilha manual de parados e manutenção) ----------
  var ST = [
    { id: "con", l: "C", nome: "Conectados", um: "Conectado", icone: "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a14.5 14.5 0 0 1 20 0" },
    { id: "off", l: "O", nome: "Offline", um: "Offline", icone: "M2 9a14.5 14.5 0 0 1 6-3.4M22 9a14.5 14.5 0 0 0-9.5-4.5M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M3 3l18 18" },
    { id: "man", l: "M", nome: "Manutenção", um: "Manutenção", icone: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" },
    { id: "par", l: "P", nome: "Parados", um: "Parado", icone: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM10 9v6M14 9v6" }
  ];
  var fco = { grupo: "", dia: -1, mes: "", todos: false };
  // Planilha de parados e manutenção no OneDrive (link só para pessoas da Bioenergética Aroeira).
  var LINK_STATUS = "https://bioaroeira0500-my.sharepoint.com/:x:/g/personal/jeffersonmelo_bioaroeira_com_br/IQCBOXgux4WkRLqhbxJaqrmVAbGk8PWZR-k1z45-LiRN5w4?e=cqk76A";
  function letraSt(c) { return c === "m" ? "M" : c === "p" ? "P" : c; }
  function abaConectividade() {
    var K = D.conectividade, F = K.frotas, nd = K.dias.length;
    var ids = Object.keys(F);
    var processos = unicos(ids.map(function (f) { return F[f].processo; }));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    ids = ids.filter(function (f) { return !fil_.processo || F[f].processo === fil_.processo; });
    var grupos = unicos(ids.map(function (f) { return F[f].grupo; }).filter(Boolean));
    if (fco.grupo && grupos.indexOf(fco.grupo) < 0) fco.grupo = "";
    ids = ids.filter(function (f) { return !fco.grupo || F[f].grupo === fco.grupo; });
    var di = fco.dia >= 0 && fco.dia < nd ? fco.dia : nd - 1, ehHoje = di === nd - 1;
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
    var pend = (K.pendencias || []).filter(function (p) { return ids.indexOf(p.f) >= 0 || (!fil_.processo && !fco.grupo); });

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="k-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      '<label>Grupo<select data-kon="grupo" id="k-grupo">' + opcoes(grupos, fco.grupo, "Todos os grupos") + "</select></label>" +
      '<label>Dia<select data-kon="dia" id="k-dia">' + K.dias.map(function (d, i) { return { d: d, i: i }; }).reverse().map(function (x) {
        return '<option value="' + x.i + '"' + (x.i === di ? " selected" : "") + ">" + dbr(x.d) + (x.i === nd - 1 ? " (último)" : "") + "</option>";
      }).join("") + "</select></label>" +
      (fil_.processo || fco.grupo || !ehHoje ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + total + " " + plural(total, "veículo", "veículos") + " em " + dbr(K.dias[di]) + (manuais ? ". " + manuais + " " + plural(manuais, "informado", "informados") + " na planilha de parados e manutenção" : "") + "</p></div>";

    var kpis = '<div class="kpis kpis5">' + ST.map(function (s) {
      var n = cont[s.l];
      return '<article class="kpi c-' + s.id + '"><div class="kh">' + ico(s.icone) + '<span class="kl">' + s.nome + '</span></div><strong class="kv">' + num(n, 0) + '</strong><span class="ks">' + (total ? num(n / total * 100, 1) + "% da frota" : "&nbsp;") + "</span></article>";
    }).join("") + '<article class="kpi c-pen"><div class="kh">' + ico("M12 3l9 16H3zM12 10v4M12 17h.01") + '<span class="kl">Pendências</span></div><strong class="kv">' + num(pend.length, 0) + '</strong><span class="ks">em campo</span></article></div>';

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
    var evol = '<section class="card"><h3>Conexão por dia</h3><p class="cs">Veículos conectados e offline em cada dia. Clique num ponto para ver o dia.</p>' + linhaDias(serie, K.dias, di) + "</section>";

    // Equipamentos offline no dia, do que tem menos dias para o que tem mais.
    var sem = linhasDia.filter(function (x) { return x.s === "O"; }).map(function (x) {
      var a = ehHoje ? K.atual[x.f] : null, h = K.hist[x.f], diasOff = 0;
      for (var k = di; k >= 0 && h[k] === "O"; k--) diasOff++;
      return { f: x.f, dias: a ? a.dias : diasOff, ult: a ? a.ult : "" };
    }).sort(function (a, b) { return a.dias - b.dias || a.f.localeCompare(b.f); });
    var tab = '<section class="card tab-card"><h3>Equipamentos offline <span class="cnt off">' + sem.length + '</span></h3><p class="cs">Em ' + dbr(K.dias[di]) + ", do que está há menos dias sem comunicar para o que está há mais.</p>" +
      (sem.length ? '<div class="scroll rolagem alta"><table class="tb tb-k"><thead><tr><th scope="col">Frota</th><th scope="col">Processo</th><th scope="col" class="r">Dias offline</th>' + (ehHoje ? '<th scope="col">Última conexão</th>' : "") + "</tr></thead><tbody>" + sem.map(function (x) {
        var v = F[x.f];
        return '<tr><th scope="row">' + esc(x.f) + "<small>" + esc([v.placa, v.grupo].filter(Boolean).join(" · ")) + "</small></th><td>" + esc(v.processo) + '</td><td class="r"><span class="b critico">' + num(x.dias, 0) + "</span></td>" +
          (ehHoje ? "<td>" + (x.ult ? esc(x.ult.slice(8, 10) + "/" + x.ult.slice(5, 7) + " " + x.ult.slice(11)) : "") + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>" : '<p class="cs">Nenhum equipamento offline nesse dia.</p>') + "</section>";

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
    return filtros + kpis + informar + avisos + '<div class="g2 g2k">' + tab + porProc + '</div><div class="g3 g-a">' + evol + sit + sis + "</div>" + historico;
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

  function linhaDias(serie, dias, sel) {
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
      sv += '<circle class="pt' + (i === sel ? " on" : "") + '" cx="' + x(i).toFixed(1) + '" cy="' + y(o.C).toFixed(1) + '" r="' + (i === sel ? 5 : 3) + '" data-kdia="' + i + '"><title>' + dias[i].slice(8, 10) + "/" + dias[i].slice(5, 7) + ": " + o.C + " conectados, " + o.O + " offline</title></circle>";
    });
    var s = serie[sel];
    sv += '<text class="tv" x="' + x(sel).toFixed(1) + '" y="' + (y(s.C) - 9).toFixed(1) + '" text-anchor="middle">' + s.C + "</text>";
    return sv + '</svg><ul class="legend"><li><i class="c-con"></i>Conectados</li><li><i class="c-off"></i>Offline</li></ul>';
  }

  // Câmeras: visualizador do relatório do dia (sem histórico). Observação por linha,
  // salva só neste navegador e só para o relatório deste dia.
  var fcm = { tipo: "" };
  var OBS = [["", "Pendente"], ["ok", "Câmera ok"], ["int", "Intermitência temporária"], ["rel", "Erro no relatório"], ["def", "Defeito confirmado"]];
  var OBS_RESOLVE = { ok: 1, int: 1, rel: 1 };
  var CHAVE_OBS = "painel-frotas-cameras-obs";
  var ICO_CAM = { motorista: "M12 12a4 4 0 100-8 4 4 0 000 8M4 21a8 8 0 0116 0", pista: "M5 21L10 3M19 21L14 3M12 6v2M12 11v2M12 16v3", auditoria: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6" };
  function obsLer() {
    try { var o = JSON.parse(localStorage.getItem(CHAVE_OBS) || "{}"); return o && o.dia === D.cameras.dia ? o.obs || {} : {}; } catch (e) { return {}; }
  }
  function obsGravar(k, v) {
    var o = obsLer(); if (v) o[k] = v; else delete o[k];
    try { localStorage.setItem(CHAVE_OBS, JSON.stringify({ dia: D.cameras.dia, obs: o })); return true; } catch (e) { return false; }
  }
  var obsMem = null; // usado se o navegador não deixar salvar
  function obsTodas() { var o = obsLer(); if (obsMem) for (var k in obsMem) o[k] = obsMem[k]; return o; }
  function camLinhas() {
    var M = D.cameras, nomes = {};
    M.tipos.forEach(function (t) { nomes[t.id] = t.nome; });
    var linhas = [];
    M.lista.forEach(function (v) {
      M.tipos.forEach(function (t) {
        var ds = v.d.filter(function (d) { return d[0] === t.id; }); if (!ds.length) return;
        linhas.push({ k: v.f + "|" + t.id, v: v, tipo: t.id, nomeTipo: nomes[t.id], ds: ds });
      });
    });
    return linhas;
  }
  function hbr(s) { return s ? s.slice(8, 10) + "/" + s.slice(5, 7) + " " + s.slice(11) : "—"; }
  function abaCameras() {
    var M = D.cameras, obs = obsTodas();
    var processos = unicos(Object.keys(M.total));
    if (fil_.processo && processos.indexOf(fil_.processo) < 0) fil_.processo = "";
    var todas = camLinhas().filter(function (l) { return !fil_.processo || l.v.processo === fil_.processo; });
    var monit = fil_.processo ? (M.total[fil_.processo] || 0) : sum(processos, function (p) { return M.total[p]; });
    function pendente(l) { return !OBS_RESOLVE[obs[l.k]]; }

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="cm-processo">' + opcoes(processos, fil_.processo, D.escopo && D.escopo !== "todos" ? "Todos os meus processos" : "Todos os processos") + "</select></label>" +
      '<label>Câmera<select data-cam="tipo" id="cm-tipo"><option value="">Todas as câmeras</option>' + M.tipos.map(function (t) { return '<option value="' + t.id + '"' + (fcm.tipo === t.id ? " selected" : "") + ">" + esc(t.nome) + "</option>"; }).join("") + "</select></label>" +
      (fil_.processo || fcm.tipo ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") +
      '<p class="ctx">' + num(monit, 0) + " " + plural(monit, "veículo monitorado", "veículos monitorados") + " no relatório de " + M.dia.slice(8, 10) + "/" + M.dia.slice(5, 7) + " às " + esc(M.hora) + "</p></div>";

    // Um quadro por tipo de câmera: pendentes, com o detalhe de cada defeito.
    var cards = M.tipos.map(function (t) {
      var ls = todas.filter(function (l) { return l.tipo === t.id; }), pend = ls.filter(pendente);
      var det = t.defeitos.map(function (nome) {
        var n = pend.filter(function (l) { return l.ds.some(function (d) { return d[1] === nome; }); }).length;
        return "<span>" + esc(nome) + " <b>" + num(n, 0) + "</b></span>";
      }).join("");
      var rev = ls.length - pend.length;
      return '<button type="button" class="kpi kpi-btn c-cm-' + t.id + '" data-cmtipo="' + t.id + '" aria-pressed="' + (fcm.tipo === t.id) + '"><div class="kh">' + ico(ICO_CAM[t.id] || ICO_CAM.auditoria) + '<span class="kl">' + esc(t.nome) + '</span></div><strong class="kv">' + num(pend.length, 0) + '</strong><span class="kp">' + det + '</span><span class="ks">' + plural(pend.length, "veículo pendente", "veículos pendentes") + (rev ? " · " + rev + " " + plural(rev, "revisado", "revisados") : "") + "</span></button>";
    }).join("");
    var veicPend = unicos(todas.filter(pendente).map(function (l) { return l.v.f; })).length;
    var veicTot = unicos(todas.map(function (l) { return l.v.f; })).length;
    cards += '<article class="kpi c-cm-total"><div class="kh">' + ico("M12 3l9 16H3zM12 10v4M12 17h.01") + '<span class="kl">Veículos com pendência</span></div><strong class="kv">' + num(veicPend, 0) + '</strong><span class="ks">' + num(veicTot, 0) + " com alerta no relatório" + (monit ? " · " + num(veicTot / monit * 100, 1) + "% da frota" : "") + "</span></article>";
    var kpis = '<div class="kpis kpis4">' + cards + "</div>";

    // Lista de pendências, com a observação ao lado (como uma coluna de planilha).
    var ls = todas.filter(function (l) { return !fcm.tipo || l.tipo === fcm.tipo; });
    var nPend = ls.filter(pendente).length;
    var tab = '<section class="card tab-card"><div class="cm-cab"><h3>Pendências de câmera <span class="cnt off">' + nPend + "</span></h3>" +
      (ls.length ? '<button type="button" class="limpar" data-cbaixar="1">Baixar lista (Excel)</button>' : "") + "</div>" +
      '<p class="cs">Veículos com câmera acusando defeito. Se a câmera estiver ok e for só erro do sistema, escolha a observação na última coluna: a linha sai das pendências. As observações ficam salvas neste navegador e valem para o relatório deste dia.</p>' +
      (ls.length ? '<div class="scroll rolagem alta"><table class="tb tb-k tb-cm"><thead><tr><th scope="col">Frota</th><th scope="col">Processo</th><th scope="col">Câmera</th><th scope="col">Ticket</th><th scope="col">Última foto · vídeo</th><th scope="col">Observação</th></tr></thead><tbody>' + ls.map(function (l, i) {
        var v = l.v, o = obs[l.k] || "", res = !!OBS_RESOLVE[o];
        var defs = l.ds.map(function (d) { return esc(d[1]) + (l.tipo === "auditoria" ? " (" + d[2] + ")" : ""); }).join(", ");
        var tk = v.ticket ? '<a href="' + esc(v.ticket) + '" target="_blank" rel="noopener">' + esc(v.ticket.split("/").pop()) + "</a><small>" + esc(v.tst || "") + "</small>" : '<span class="mut">Sem ticket</span>';
        return '<tr class="' + (res ? "cm-ok" : "") + '"><th scope="row">' + esc(v.f) + "<small>" + esc([v.placa, v.sit && v.sit !== "Em operação" ? v.sit : ""].filter(Boolean).join(" · ")) + "</small></th><td>" + esc(v.processo) + "</td>" +
          "<td>" + esc(l.nomeTipo) + '<small><span class="b ' + (res ? "bom" : "critico") + '">' + defs + "</span></small></td><td>" + tk + "</td>" +
          "<td>" + hbr(v.foto) + "<small>" + hbr(v.video) + "</small></td>" +
          '<td><select class="obs obs-' + (o || "pen") + '" data-obs="' + esc(l.k) + '" id="cm-obs-' + i + '" aria-label="Observação de ' + esc(v.f) + ", " + esc(l.nomeTipo) + '">' + OBS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === o ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="cs">Nenhuma câmera com defeito' + (fcm.tipo || fil_.processo ? " nesse filtro" : " no relatório") + ".</p>") + "</section>";

    return filtros + kpis + tab;
  }
  function camBaixar() {
    var M = D.cameras, obs = obsTodas(), nomes = {};
    OBS.forEach(function (x) { nomes[x[0]] = x[1]; });
    var ls = camLinhas().filter(function (l) { return (!fil_.processo || l.v.processo === fil_.processo) && (!fcm.tipo || l.tipo === fcm.tipo); });
    function c(x) { x = String(x == null ? "" : x); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
    var linhas = [["Frota", "Placa", "Processo", "Situação", "Câmera", "Defeito", "Ticket", "Status do ticket", "Última foto", "Último vídeo", "Observação"]].concat(ls.map(function (l) {
      var v = l.v;
      return [v.f, v.placa, v.processo, v.sit, l.nomeTipo, l.ds.map(function (d) { return d[1] + (l.tipo === "auditoria" ? " (" + d[2] + ")" : ""); }).join(", "), v.ticket, v.tst, hbr(v.foto), hbr(v.video), nomes[obs[l.k] || ""]];
    }));
    var blob = new Blob(["﻿" + linhas.map(function (r) { return r.map(c).join(";"); }).join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "pendencias-cameras-" + M.dia + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  var VIEWS = { "comportamento": abaComportamento, "motor-ocioso": abaOcioso, "permanencia": abaPermanencia, "conectividade": abaConectividade, "cameras": abaCameras };
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
    var blocos = { "comportamento": D.comportamento, "motor-ocioso": D.motorOcioso, "permanencia": D.permanencia, "conectividade": D.conectividade, "cameras": D.cameras }, b = blocos[id], real = b && b.real;
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
    var sel = e.target.closest("select[data-fil], select[data-pm], select[data-comp], select[data-kon]"); if (!sel) return;
    if (sel.dataset.kon) { fco[sel.dataset.kon] = sel.dataset.kon === "dia" ? +sel.value : sel.value; render(); var n4 = document.getElementById(sel.id); if (n4) n4.focus(); return; }
    if (sel.dataset.comp) { fil_.comp[sel.dataset.comp] = sel.dataset.comp === "janela" ? +sel.value : sel.value; render(); var n3 = document.getElementById(sel.id); if (n3) n3.focus(); return; }
    if (sel.dataset.pm) pm[sel.dataset.pm] = +sel.value;
    else { fil_[sel.dataset.fil] = sel.value; if (sel.dataset.fil === "processo") { fil_.responsavel = ""; pm.frotas = []; } }
    pm.refit = true;
    render();
    var n = document.getElementById(sel.id); if (n) n.focus();
  });
  painel.addEventListener("click", function (e) {
    var l = e.target.closest("[data-limpar]");
    if (l) { fil_.processo = ""; fil_.responsavel = ""; if (fil_.comp) { fil_.comp.frota = ""; fil_.comp.gerencia = ""; } fco.grupo = ""; fco.dia = -1; fcm.tipo = ""; pm.frotas = []; pm.dias = 0; pm.refit = true; render(); return; }
    var kt = e.target.closest("[data-ktodos]");
    if (kt) { fco.todos = !fco.todos; render(); return; }
    var kd = e.target.closest("[data-kdia]");
    if (kd) { fco.dia = +kd.getAttribute("data-kdia"); render(); return; }
    var cf = e.target.closest("[data-cfrota]");
    if (cf) { fil_.comp.frota = cf.dataset.cfrota; render(); return; }
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
  painel.addEventListener("keydown", function (e) {
    var g = e.target.closest && e.target.closest("g[data-set]");
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); g.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  painel.addEventListener("toggle", function (e) { if (e.target.id === "p-frotas") pm.abertoFrotas = e.target.open; }, true);
  painel.addEventListener("change", function (e) {
    var o = e.target.closest("select[data-obs]");
    if (o) {
      if (!obsGravar(o.dataset.obs, o.value)) { obsMem = obsMem || {}; obsMem[o.dataset.obs] = o.value; }
      var id = o.id; render(); var n = document.getElementById(id); if (n) n.focus(); return;
    }
    var t = e.target.closest("select[data-cam]");
    if (t) { fcm.tipo = t.value; render(); var n2 = document.getElementById(t.id); if (n2) n2.focus(); }
  });
  painel.addEventListener("click", function (e) {
    var t = e.target.closest("[data-cmtipo]");
    if (t) { fcm.tipo = fcm.tipo === t.dataset.cmtipo ? "" : t.dataset.cmtipo; render(); var n = document.querySelector('[data-cmtipo="' + t.dataset.cmtipo + '"]'); if (n) n.focus(); return; }
    if (e.target.closest("[data-cbaixar]")) camBaixar();
  });
  window.addEventListener("hashchange", render);
  render();
};
