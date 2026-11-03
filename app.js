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

  // ---------- Comportamento (ocorrências por tipo, filtradas por processo e responsável) ----------
  var fil_ = { processo: "", responsavel: "" };

  function opcoes(lista, atual, rotulo) {
    return '<option value="">' + rotulo + "</option>" + lista.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === atual ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }
  function unicos(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }).sort(function (x, y) { return x.localeCompare(y, "pt-BR"); }); }

  function abaComportamento() {
    var O = D.ocorrencias, T = O.tipos;
    var processos = unicos(O.linhas.map(function (l) { return l.processo; }));
    var doProc = O.linhas.filter(function (l) { return !fil_.processo || l.processo === fil_.processo; });
    var resps = unicos(doProc.map(function (l) { return l.responsavel; }));
    if (fil_.responsavel && resps.indexOf(fil_.responsavel) < 0) fil_.responsavel = "";
    var linhas = doProc.filter(function (l) { return !fil_.responsavel || l.responsavel === fil_.responsavel; });

    var cont = {}; T.forEach(function (t) { cont[t.id] = sum(linhas, function (l) { return l[t.id] || 0; }); });
    var total = sum(T, function (t) { return cont[t.id]; });
    var frotas = sum(linhas, function (l) { return l.frotas; });
    var vel = T.filter(function (t) { return t.grupo === "vel"; });
    var velTot = sum(vel, function (t) { return cont[t.id]; });
    var outros = T.filter(function (t) { return !t.grupo; });

    var cats = outros.map(function (t) { return { nome: t.nome, n: cont[t.id] }; });
    cats.push({ nome: "Excesso de velocidade", n: velTot, vel: true });
    cats.sort(function (a, b) { return b.n - a.n; });
    var maxN = Math.max.apply(null, [1].concat(cats.map(function (c) { return c.n; })));
    var pct = function (n) { return total ? num(n / total * 100, 0) + "% do total" : ""; };

    var onde = fil_.processo ? (fil_.responsavel ? "" : "responsável") : "processo";
    var contexto = fil_.responsavel ? " de " + esc(fil_.responsavel) : "";
    contexto += fil_.processo ? " em " + esc(fil_.processo) : "";
    var lead;
    if (!total) lead = "Nenhuma ocorrência para esse filtro.";
    else {
      var top = cats[0];
      lead = "<b>" + num(total, 0) + "</b> " + plural(total, "ocorrência", "ocorrências") + contexto + " em <b>" + frotas + "</b> " + plural(frotas, "veículo", "veículos") +
        ". " + (top.vel ? "O excesso de velocidade" : "<b>" + esc(top.nome) + "</b>") + " responde por " + num(top.n / total * 100, 0) + "%.";
    }

    var filtros = '<div class="filtros"><label>Processo<select data-fil="processo" id="f-processo">' + opcoes(processos, fil_.processo, "Todos os processos") + "</select></label>" +
      '<label>Responsável<select data-fil="responsavel" id="f-responsavel">' + opcoes(resps, fil_.responsavel, "Todos os responsáveis") + "</select></label>" +
      (fil_.processo || fil_.responsavel ? '<button type="button" class="limpar" data-limpar="1">Limpar filtros</button>' : "") + "</div>";

    var i = 0;
    var corpo = cats.map(function (c) {
      var r = linha(i++, "<b>" + esc(c.nome) + "</b>",
        c.vel ? '<div class="bar" style="width:' + (c.n / maxN * 100).toFixed(1) + '%;--i:' + (i - 1) + '" role="img" aria-label="Excesso de velocidade: ' + c.n + '">' +
            vel.map(function (t, k) { return cont[t.id] ? '<span class="v' + (k + 1) + '" style="flex:' + cont[t.id] + '"></span>' : ""; }).join("") + "</div>"
          : '<div class="bar solo" style="width:' + (c.n / maxN * 100).toFixed(1) + '%;--i:' + (i - 1) + '"></div>',
        "<strong>" + num(c.n, 0) + "</strong><small>" + pct(c.n) + "</small>");
      if (!c.vel) return r;
      var sub = vel.map(function (t, k) {
        return '<div class="row subrow" style="--i:' + (i + k) + '"><div class="who"><b>' + esc(t.nome) + '</b></div><div class="plot"><div class="bar v' + (k + 1) + '" style="width:' +
          (cont[t.id] / maxN * 100).toFixed(1) + '%;--i:' + (i + k) + '"></div></div><div class="res"><strong>' + num(cont[t.id], 0) + "</strong><small>" + pct(cont[t.id]) + "</small></div></div>";
      }).join("");
      return r + sub;
    }).join("");

    // Onde se concentram: por processo, ou por responsável quando há processo escolhido
    var conc = "";
    if (onde) {
      var chave = onde === "processo" ? "processo" : "responsavel", mapa = {};
      linhas.forEach(function (l) {
        var m = mapa[l[chave]] || (mapa[l[chave]] = { n: 0, frotas: 0 });
        m.n += sum(T, function (t) { return l[t.id] || 0; }); m.frotas += l.frotas;
      });
      var lista = Object.keys(mapa).map(function (k) { return { nome: k, n: mapa[k].n, frotas: mapa[k].frotas }; }).sort(function (a, b) { return b.n - a.n; });
      var mx = Math.max.apply(null, [1].concat(lista.map(function (x) { return x.n; })));
      conc = '<section class="sec"><h2>Onde as ocorrências se concentram</h2><p class="sub">Por ' + (chave === "processo" ? "processo" : "responsável") +
        ". Clique em uma linha para filtrar.</p><div class=\"board\">" + lista.map(function (x, k) {
          return '<button type="button" class="row rowbtn" style="--i:' + k + '" data-set="' + chave + ":" + esc(x.nome) + '" aria-label="Filtrar por ' + esc(x.nome) + '"><div class="who"><b>' + esc(x.nome) +
            "</b><span>" + x.frotas + " " + plural(x.frotas, "veículo", "veículos") + '</span></div><div class="plot"><div class="bar solo" style="width:' + (x.n / mx * 100).toFixed(1) + '%;--i:' + k +
            '"></div></div><div class="res"><strong>' + num(x.n, 0) + "</strong><small>" + num(x.n / x.frotas, 1) + " por veículo</small></div></button>";
        }).join("") + "</div></section>";
    }

    return filtros + '<div class="head"><p class="lead">' + lead + "</p></div>" +
      '<section class="sec"><h2>Quantidade por tipo de ocorrência</h2><p class="sub">' + esc(D.periodo) + ". O excesso de velocidade é dividido pela faixa acima do limite.</p><div class=\"board\">" + corpo + "</div></section>" + conc;
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
})();
