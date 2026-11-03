(function () {
  var D = window.DADOS;
  if (!D) return;

  var ABAS = [
    { id: "comportamento", nome: "Comportamental" },
    { id: "motor-ocioso", nome: "Motor ocioso" },
    { id: "permanencia", nome: "Tempo de permanência" }
  ];
  var filtro = "Todos";
  var ordem = {};

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v, d) { return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function dur(min) { var h = Math.floor(min / 60), m = min % 60; return h ? h + " h " + (m < 10 ? "0" : "") + m + " min" : m + " min"; }
  function equips() { return D.equipamentos.filter(function (e) { return filtro === "Todos" || e.tipo === filtro; }); }
  function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
  function kpi(rot, val, sub, cls) {
    return '<div class="kpi ' + (cls || "") + '"><span class="kl">' + esc(rot) + '</span><strong class="kv">' + val + "</strong>" + (sub ? '<span class="ks">' + esc(sub) + "</span>" : "") + "</div>";
  }
  function sortable(rows, key) {
    var o = ordem[key];
    if (!o) return rows;
    return rows.slice().sort(function (a, b) {
      var x = a[o.col], y = b[o.col];
      var r = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR");
      return o.dir * r;
    });
  }
  function th(key, col, label, num_) {
    var o = ordem[key], ar = o && o.col === col ? (o.dir > 0 ? "ascending" : "descending") : "none";
    return '<th scope="col"' + (num_ ? ' class="r"' : "") + ' aria-sort="' + ar + '"><button type="button" data-sort="' + key + ":" + col + '">' + esc(label) + "</button></th>";
  }

  // ---------- Comportamental ----------
  function pontos(e) {
    var p = D.comportamento.pesos, c = D.comportamento.porEquip[e.id];
    return (c.vel * p.vel + c.freada * p.freada + c.acel * p.acel + c.curva * p.curva) / c.horas * 100;
  }
  function score(e) { return Math.max(0, Math.round(100 - pontos(e) / 2)); }
  function faixa(s) { return s >= 80 ? ["bom", "Bom"] : s >= 60 ? ["atencao", "Atenção"] : ["critico", "Crítico"]; }

  function abaComportamento() {
    var es = equips(), c = D.comportamento;
    var tot = { vel: 0, freada: 0, acel: 0, curva: 0 };
    es.forEach(function (e) { for (var k in tot) tot[k] += c.porEquip[e.id][k]; });
    var total = tot.vel + tot.freada + tot.acel + tot.curva;
    var rows = es.map(function (e) { var x = c.porEquip[e.id]; return { id: e.id, tipo: e.tipo, vel: x.vel, freada: x.freada, acel: x.acel, curva: x.curva, total: x.vel + x.freada + x.acel + x.curva, score: score(e) }; });
    var pior = rows.slice().sort(function (a, b) { return a.score - b.score; })[0];
    var media = rows.length ? Math.round(sum(rows, function (r) { return r.score; }) / rows.length) : 0;
    var maxT = Math.max.apply(null, [1].concat(Object.keys(tot).map(function (k) { return tot[k]; })));

    var barras = Object.keys(c.tipos).map(function (k) {
      return '<span class="lab">' + esc(c.tipos[k]) + '</span><div class="track"><div class="fill" style="width:' + (tot[k] / maxT * 100).toFixed(1) + '%"></div></div><span class="val">' + tot[k] + "</span>";
    }).join("");
    var dias = D.dias.map(function (d, i) { return { d: d, v: c.eventosPorDia[i] }; });
    var tabela = sortable(rows, "comp").map(function (r) {
      var f = faixa(r.score);
      return "<tr><th scope=\"row\">" + r.id + "</th><td>" + r.tipo + "</td><td class=\"r\">" + r.vel + "</td><td class=\"r\">" + r.freada + "</td><td class=\"r\">" + r.acel + "</td><td class=\"r\">" + r.curva + "</td><td class=\"r\">" + r.total + '</td><td class="r"><span class="pill ' + f[0] + '">' + r.score + " · " + f[1] + "</span></td></tr>";
    }).join("");

    return '<div class="kpis">' + kpi("Eventos no período", total, D.periodo) + kpi("Nota média da frota", media, "0 a 100, quanto maior melhor", faixa(media)[0]) +
      kpi("Pior nota", pior ? pior.id : "–", pior ? "nota " + pior.score : "", pior ? faixa(pior.score)[0] : "") + "</div>" +
      '<div class="pair"><section class="panel"><h3>Eventos por tipo</h3><div class="hb">' + barras + "</div></section>" +
      '<section class="panel"><h3>Eventos por dia</h3>' + colunas(dias, "v", "") + "</section></div>" +
      '<section class="panel"><h3>Por equipamento</h3><div class="scroll"><table class="tb"><thead><tr>' + th("comp", "id", "Equipamento") + th("comp", "tipo", "Tipo") +
      th("comp", "vel", "Velocidade", 1) + th("comp", "freada", "Frenagem", 1) + th("comp", "acel", "Aceleração", 1) + th("comp", "curva", "Curva", 1) + th("comp", "total", "Total", 1) + th("comp", "score", "Nota", 1) +
      "</tr></thead><tbody>" + tabela + "</tbody></table></div><p class=\"nota\">Nota = 100 menos metade dos pontos por 100 h operadas (velocidade ×3, frenagem ×2, aceleração ×2, curva ×1,5). Faixas: 80+ bom, 60–79 atenção, abaixo de 60 crítico.</p></section>";
  }

  function colunas(dias, key, un, meta) {
    var max = Math.max.apply(null, dias.map(function (x) { return x[key]; }).concat(meta || 0)) * 1.15;
    var W = 420, H = 190, pad = 24, bw = (W - pad * 2) / dias.length;
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="Gráfico de colunas por dia">';
    dias.forEach(function (x, i) {
      var h = x[key] / max * (H - 50), xx = pad + i * bw + bw * .18, w = bw * .64, y = H - 24 - h;
      var alto = meta && x[key] > meta;
      s += '<rect class="col' + (alto ? " hi" : "") + '" x="' + xx.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" style="animation-delay:' + i * 60 + 'ms"/>' +
        '<text class="tv" x="' + (xx + w / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle">' + num(x[key], un === "%" ? 1 : 0) + un + "</text>" +
        '<text class="tl" x="' + (xx + w / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + x.d + "</text>";
    });
    if (meta) { var ym = H - 24 - meta / max * (H - 50); s += '<line class="meta" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + ym.toFixed(1) + '" y2="' + ym.toFixed(1) + '"/><text class="tm" x="' + (W - pad) + '" y="' + (ym - 4).toFixed(1) + '" text-anchor="end">meta ' + meta + "%</text>"; }
    return s + "</svg>";
  }

  // ---------- Motor ocioso ----------
  function abaOcioso() {
    var es = equips(), m = D.motorOcioso;
    var rows = es.map(function (e) { var x = m.porEquip[e.id]; return { id: e.id, tipo: e.tipo, ligado: x.ligado, ocioso: x.ocioso, pct: x.ocioso / x.ligado * 100 }; });
    var lig = sum(rows, function (r) { return r.ligado; }), oc = sum(rows, function (r) { return r.ocioso; });
    var pct = lig ? oc / lig * 100 : 0;
    var acima = rows.filter(function (r) { return r.pct > m.metaPct; }).length;
    var maxP = Math.max.apply(null, [m.metaPct].concat(rows.map(function (r) { return r.pct; }))) * 1.1;
    var barras = rows.slice().sort(function (a, b) { return b.pct - a.pct; }).map(function (r) {
      return '<span class="lab">' + r.id + '</span><div class="track"><div class="fill' + (r.pct > m.metaPct ? " over" : "") + '" style="width:' + (r.pct / maxP * 100).toFixed(1) + '%"></div><i class="mk" style="left:' + (m.metaPct / maxP * 100).toFixed(1) + '%"></i></div><span class="val">' + num(r.pct, 1) + "%</span>";
    }).join("");
    var tabela = sortable(rows, "oc").map(function (r) {
      return "<tr><th scope=\"row\">" + r.id + "</th><td>" + r.tipo + '</td><td class="r">' + num(r.ligado, 1) + '</td><td class="r">' + num(r.ocioso, 1) + '</td><td class="r"><span class="pill ' + (r.pct > m.metaPct ? "critico" : "bom") + '">' + num(r.pct, 1) + "%</span></td></tr>";
    }).join("");
    var dias = D.dias.map(function (d, i) { return { d: d, v: m.pctPorDia[i] }; });
    return '<div class="kpis">' + kpi("Motor ocioso", num(pct, 1) + "%", "do tempo com motor ligado", pct > m.metaPct ? "critico" : "bom") +
      kpi("Horas ociosas por dia", num(oc, 1) + " h", "soma da frota, média diária") + kpi("Acima da meta", acima + " de " + rows.length, "meta de " + m.metaPct + "%", acima ? "atencao" : "bom") + "</div>" +
      '<div class="pair"><section class="panel"><h3>% ocioso por equipamento</h3><div class="hb">' + barras + '</div><p class="nota">A marca vertical é a meta de ' + m.metaPct + "%.</p></section>" +
      '<section class="panel"><h3>% ocioso por dia</h3>' + colunas(dias, "v", "%", m.metaPct) + "</section></div>" +
      '<section class="panel"><h3>Por equipamento</h3><div class="scroll"><table class="tb"><thead><tr>' + th("oc", "id", "Equipamento") + th("oc", "tipo", "Tipo") + th("oc", "ligado", "Motor ligado (h/dia)", 1) + th("oc", "ocioso", "Ocioso (h/dia)", 1) + th("oc", "pct", "% ocioso", 1) + "</tr></thead><tbody>" + tabela + "</tbody></table></div></section>";
  }

  // ---------- Permanência ----------
  function abaPermanencia() {
    var p = D.permanencia, ids = equips().map(function (e) { return e.id; });
    var est = p.estadias.filter(function (x) { return ids.indexOf(x.equip) >= 0; });
    var lim = {}; p.locais.forEach(function (l) { lim[l.nome] = l.limiteMin; });
    var acima = est.filter(function (x) { return x.min > lim[x.local]; });
    var visitas = sum(p.locais, function (l) { return l.visitas; });
    var media = sum(p.locais, function (l) { return l.visitas * l.mediaMin; }) / visitas;
    var maxM = Math.max.apply(null, p.locais.map(function (l) { return Math.max(l.mediaMin, l.limiteMin); })) * 1.08;
    var barras = p.locais.map(function (l) {
      return '<span class="lab">' + esc(l.nome) + '</span><div class="track"><div class="fill' + (l.mediaMin > l.limiteMin ? " over" : "") + '" style="width:' + (l.mediaMin / maxM * 100).toFixed(1) + '%"></div><i class="mk" style="left:' + (l.limiteMin / maxM * 100).toFixed(1) + '%"></i></div><span class="val">' + dur(l.mediaMin) + "</span>";
    }).join("");
    var rows = est.map(function (x) { return { equip: x.equip, local: x.local, entrada: x.entrada, min: x.min, lim: lim[x.local] }; });
    var tabela = sortable(rows, "pm").map(function (r) {
      return "<tr><th scope=\"row\">" + r.equip + "</th><td>" + esc(r.local) + "</td><td>" + r.entrada + '</td><td class="r">' + dur(r.min) + '</td><td class="r">' + dur(r.lim) + '</td><td class="r"><span class="pill ' + (r.min > r.lim ? "critico" : "bom") + '">' + (r.min > r.lim ? "Acima" : "Dentro") + "</span></td></tr>";
    }).join("");
    return '<div class="kpis">' + kpi("Visitas registradas", visitas, D.periodo) + kpi("Permanência média", dur(Math.round(media)), "todos os locais") +
      kpi("Estadias acima do limite", acima.length + " de " + est.length, "entre as últimas registradas", acima.length ? "atencao" : "bom") + "</div>" +
      '<section class="panel"><h3>Permanência média por local</h3><div class="hb wide">' + barras + '</div><p class="nota">A marca vertical é o limite esperado para cada local.</p></section>' +
      '<section class="panel"><h3>Últimas estadias</h3><div class="scroll"><table class="tb"><thead><tr>' + th("pm", "equip", "Equipamento") + th("pm", "local", "Local") + th("pm", "entrada", "Entrada") + th("pm", "min", "Tempo", 1) + th("pm", "lim", "Limite", 1) + '<th scope="col" class="r">Situação</th></tr></thead><tbody>' + tabela + "</tbody></table></div></section>";
  }

  var VIEWS = { "comportamento": abaComportamento, "motor-ocioso": abaOcioso, "permanencia": abaPermanencia };
  var tabs = document.getElementById("tabs"), painel = document.getElementById("painel"), fil = document.getElementById("filtro");

  function atual() {
    var h = (location.hash || "").replace("#", "");
    return VIEWS[h] ? h : ABAS[0].id;
  }
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
