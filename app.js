(function () {
  var D = window.DADOS;
  if (!D) return;

  var ABAS = [
    { id: "comportamento", nome: "Comportamento" },
    { id: "motor-ocioso", nome: "Motor ocioso" },
    { id: "permanencia", nome: "Permanência" }
  ];
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
  function dias(valores, un, meta, titulo) {
    var W = 420, H = 140, pad = 6, base = H - 20;
    var max = Math.max.apply(null, valores.concat(meta || 0)) * 1.2, bw = (W - pad * 2) / valores.length;
    var s = '<div class="dia"><h3>' + esc(titulo) + '</h3><svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(titulo) + '">';
    valores.forEach(function (v, i) {
      var h = v / max * (base - 14), x = pad + i * bw + bw * .2, w = bw * .6, y = base - h;
      s += '<rect class="col' + (meta && v > meta ? " hi" : "") + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" style="animation-delay:' + i * 50 + 'ms"/>' +
        '<text class="tv" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle">' + num(v, un === "%" ? 1 : 0) + "</text>" +
        '<text class="tl" x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + D.dias[i] + "</text>";
    });
    if (meta) { var ym = base - meta / max * (base - 14); s += '<line class="meta" x1="0" x2="' + W + '" y1="' + ym.toFixed(1) + '" y2="' + ym.toFixed(1) + '"/>'; }
    return s + "</svg></div>";
  }

  function linha(i, quem, plot, res) {
    return '<div class="row" style="--i:' + i + '"><div class="who">' + quem + '</div><div class="plot">' + plot + '</div><div class="res">' + res + "</div></div>";
  }

  // ---------- Comportamento ----------
  function pontos(id) {
    var p = D.comportamento.pesos, c = D.comportamento.porEquip[id];
    return (c.vel * p.vel + c.freada * p.freada + c.acel * p.acel + c.curva * p.curva) / c.horas * 100;
  }
  function faixa(s) { return s >= 80 ? ["bom", "Bom"] : s >= 60 ? ["atencao", "Atenção"] : ["critico", "Crítico"]; }

  function abaComportamento() {
    var c = D.comportamento, tipos = Object.keys(c.tipos);
    var rows = equips().map(function (e) {
      var x = c.porEquip[e.id];
      return { id: e.id, tipo: e.tipo, x: x, total: x.vel + x.freada + x.acel + x.curva, score: Math.max(0, Math.round(100 - pontos(e.id) / 2)) };
    }).sort(function (a, b) { return a.score - b.score; });
    if (!rows.length) return "";
    var crit = rows.filter(function (r) { return r.score < 60; }).length;
    var total = sum(rows, function (r) { return r.total; });
    var media = Math.round(sum(rows, function (r) { return r.score; }) / rows.length);
    var maxT = Math.max.apply(null, rows.map(function (r) { return r.total; }));
    var lead = crit
      ? "<b>" + crit + " de " + rows.length + "</b> equipamentos estão em faixa crítica. O pior é <b>" + rows[0].id + "</b>, com nota " + rows[0].score + "."
      : "Nenhum equipamento em faixa crítica. A nota média da frota é <b>" + media + "</b>.";
    var legenda = tipos.map(function (k, i) { return '<li><i class="s' + (i + 1) + '"></i>' + esc(c.tipos[k]) + "</li>"; }).join("");
    var corpo = rows.map(function (r, i) {
      var f = faixa(r.score);
      var segs = tipos.map(function (k, j) {
        var v = r.x[k]; if (!v) return "";
        return '<span class="s' + (j + 1) + '" style="flex:' + v + '" title="' + esc(c.tipos[k] + ": " + v) + '">' + (v / maxT >= .08 ? v : "") + "</span>";
      }).join("");
      var bar = '<div class="bar" style="width:' + (r.total / maxT * 100).toFixed(1) + '%;--i:' + i + '" role="img" aria-label="' + esc(r.id + ": " + r.total + " eventos") + '">' + segs + "</div>";
      return linha(i, "<b>" + r.id + "</b><span>" + r.tipo + "</span>", bar,
        '<strong class="n-' + f[0] + '">' + r.score + '</strong><span class="b ' + f[0] + '">' + f[1] + "</span>");
    }).join("");
    return '<div class="head"><p class="lead">' + lead + "</p>" + dias(c.eventosPorDia, "", null, "Eventos por dia na frota (" + total + " no período)") + "</div>" +
      '<section class="sec"><h2>Equipamentos do pior para o melhor</h2><p class="sub">Cada barra mostra quantos eventos o equipamento teve no período. À direita, a nota de 0 a 100: quanto maior, melhor.</p>' +
      '<ul class="legend">' + legenda + '</ul><div class="board">' + corpo + "</div>" +
      '<p class="rodape" style="margin-top:.8rem">A nota desconta pontos por 100 horas operadas: velocidade 3, frenagem 2, aceleração 2 e curva 1,5. Bom a partir de 80, atenção de 60 a 79, crítico abaixo de 60.</p></section>';
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

  function atual() { var h = (location.hash || "").replace("#", ""); return VIEWS[h] ? h : ABAS[0].id; }
  function render() {
    var id = atual();
    tabs.innerHTML = ABAS.map(function (a) {
      return '<button role="tab" id="tab-' + a.id + '" aria-selected="' + (a.id === id) + '" aria-controls="painel" tabindex="' + (a.id === id ? 0 : -1) + '" data-tab="' + a.id + '">' + a.nome + "</button>";
    }).join("");
    painel.setAttribute("aria-labelledby", "tab-" + id);
    painel.innerHTML = VIEWS[id]();
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
})();
