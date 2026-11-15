// Botão "Atualizar dados" (só para usuários com ATUALIZA = SIM no cadastro).
//
// 1. O usuário escolhe uma vez, no computador dele, a pasta do Comportamental
//    ("SAFRA 2026 MONIT COMPORTAMENTAL") e a dos alertas ("COA - BASE DE DADOS MONITORAMENTO
//    COMPORTAMENTAL"); o navegador guarda as escolhas. Funciona no Chrome e no Edge do computador.
// 2. Ao clicar, o navegador lê dessas pastas só o que mudou: a planilha Nova do Comportamental,
//    os alertas de permanência novos, os Boletins do Veículo novos, a Localização da Frota e o
//    Saúde do Veículo mais recentes e a status_frotas.xlsx (Conectividade e Câmeras).
// 3. Antes de enviar, tira tudo que é pessoal: motorista, CPF, documento, comentários (vira só
//    "prestadores"/"ultrapassagem") e nomes de pessoas nas cercas (viram iniciais, como no painel).
// 4. Envia o resultado para o repositório PRIVADO painel-frotas-dados e dispara o workflow de lá,
//    que roda os mesmos scripts de ferramentas/ e publica o site.
(function () {
  "use strict";
  var REPO = "jeffthomaz/painel-frotas-dados", WF = "atualizar.yml";
  // Duas pastas, escolhidas uma vez cada (podem estar em lugares diferentes do OneDrive):
  //   comp:    "SAFRA 2026 MONIT COMPORTAMENTAL" (planilha Nova e a subpasta EXPORTAR PASTAS)
  //   alertas: "COA - BASE DE DADOS MONITORAMENTO COMPORTAMENTAL" (CSVs Historico_Alertas)
  var NOVA = "Ocorrências monitoramento comportamental Nova..xlsx", EXPORT = "EXPORTAR PASTAS";
  var PASTAS = {
    comp: { rotulo: "Comportamental", nome: "SAFRA 2026 MONIT COMPORTAMENTAL",
      usa: "Comportamental, Conectividade, Câmeras e Motor ocioso",
      itens: async function (h) {
        var exp = await filho(h, EXPORT, true), n = { loc: 0, sau: 0, bol: 0 };
        if (exp) for await (var e of exp.values()) {
          if (/^Localizacao_da_Frota_/i.test(e.name)) n.loc++;
          else if (/^Sa(ú|u)de(_| )do(_| )Ve(í|i)culo/i.test(nfc(e.name))) n.sau++;
          else if (/^Boletim_do_Veiculo_/i.test(e.name)) n.bol++;
        }
        return [["Planilha Nova", !!(await filho(h, NOVA, false))], ["status_frotas.xlsx", !!(await filho(h, "status_frotas.xlsx", false))],
          ["EXPORTAR PASTAS", !!exp, exp ? n.loc + " Localização · " + n.sau + " Saúde · " + n.bol + " Boletim" : ""]];
      },
      confere: function (h) { return filho(h, NOVA, false); },
      erro: 'Essa pasta não tem a planilha "' + NOVA + '". Escolha a pasta "SAFRA 2026 MONIT COMPORTAMENTAL".' },
    alertas: { rotulo: "Alertas", nome: "COA - BASE DE DADOS MONITORAMENTO COMPORTAMENTAL",
      usa: "Permanência",
      itens: async function (h) {
        var n = 0, ult = "";
        for await (var e of h.values()) { var m = /^Historico_Alertas_(\d{4}-\d{2}-\d{2})/i.exec(e.name); if (m) { n++; if (m[1] > ult) ult = m[1]; } }
        return [["Alertas (Historico_Alertas)", n > 0, n ? n + " arquivos, o mais recente de " + ult.split("-").reverse().join("/") : ""]];
      },
      confere: async function (h) { for await (var e of h.values()) if (/^Historico_Alertas_.*\.csv$/i.test(e.name)) return true; return false; },
      erro: 'Essa pasta não tem os arquivos Historico_Alertas. Escolha a pasta "COA - BASE DE DADOS MONITORAMENTO COMPORTAMENTAL".' }
  };
  var COLS_COMP = ["PLACA", "PREFIXO", "GRUPO", "TIPO", "LIMIAR", "EXCESSO", "DATA", "HORA", "RÓTULO", "ALERTA DESCONSIDERADO",
    "LATITUDE", "LONGITUDE", "CERCA ELETRÔNICA", "LOGRADOURO", "CIDADE", "PROCESSO", "GERENCIA", "GERÊNCIA", "ULTIMO_COMENTARIO"];
  var COLS_PERM = ["PLACA", "PREFIXO", "TIPO", "ALERTA DESCONSIDERADO", "DATA", "HORA", "PONTO_REFERENCIA", "CERCA ELETRÔNICA",
    "CATEGORIA", "CIDADE", "RÓTULO", "LATITUDE", "LONGITUDE", "DURACAO"];
  var COLS_LOC = ["VEÍCULO", "GRUPO DE VEÍCULO", "APELIDO", "ÚLTIMA CONEXÃO", "STATUS CONEXÃO", "STATUS"];
  var COLS_BOL = ["PLACA", "PREFIXO", "DIA", "TEMPO IGNIÇÃO LIGADA", "PARADO LIGADO"];
  var TIPOS_PERM = { PERMANENCIA_CERCA: 1, PERMANENCIA_PONTO: 1 };

  var bt, st, pastaEl, token, regras, quem = "";

  function msg(t, cls) { st.hidden = !t; st.textContent = t || ""; st.className = "atu-st" + (cls ? " " + cls : ""); }
  function nfc(s) { return String(s == null ? "" : s).normalize("NFC"); }
  function chave(s) { return nfc(s).trim().toUpperCase(); }

  // ---------- pasta escolhida (guardada no navegador) ----------
  function db() {
    return new Promise(function (ok, erro) {
      var r = indexedDB.open("painel-frotas", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("cfg"); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); };
    });
  }
  function cfg(k, v) {
    if (window.__painelMem) { if (v !== undefined) window.__painelMem[k] = v; return Promise.resolve(window.__painelMem[k]); }  // só nos testes
    return db().then(function (d) {
      return new Promise(function (ok, erro) {
        var tx = d.transaction("cfg", v === undefined ? "readonly" : "readwrite"), s = tx.objectStore("cfg");
        var r = v === undefined ? s.get(k) : s.put(v, k);
        r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); };
      });
    });
  }
  function filho(dir, nome, pasta) {
    var alvo = chave(nome);
    return (async function () {
      for await (var e of dir.values()) if (chave(e.name) === alvo && (e.kind === "directory") === !!pasta) return e;
      return null;
    })();
  }
  // escolher = true só no clique de "escolher"/"trocar" (cada janela de pasta precisa do próprio clique).
  async function pasta(tipo, escolher) {
    var P = PASTAS[tipo], h = escolher ? null : await cfg("pasta-" + tipo).catch(function () { return null; });
    if (h) {
      if ((await h.queryPermission({ mode: "read" })) === "granted") return h;
      try { if ((await h.requestPermission({ mode: "read" })) === "granted") return h; } catch (e) { /* precisa de outro clique */ }
      abrirPopup();
      throw new Error('O navegador precisa de permissão de novo para ler a pasta do ' + P.rotulo + '. Clique em "Permitir acesso" na janela "Pastas do painel".');
    }
    if (!escolher) { abrirPopup(); throw new Error('Antes de atualizar, vincule a pasta do ' + P.rotulo + ' ("' + P.nome + '") na janela "Pastas do painel".'); }
    h = await window.showDirectoryPicker({ id: "painel-" + tipo, mode: "read" });
    if (!(await P.confere(h))) throw new Error(P.erro);
    await cfg("pasta-" + tipo, h);
    mostrarPastas();
    return h;
  }
  // Estado de cada pasta: "ok" (vinculada), "permissao" (escolhida, falta permitir) ou "nao" (não escolhida).
  async function estado(t) {
    var h = await cfg("pasta-" + t).catch(function () { return null; });
    if (!h) return { st: "nao" };
    var p = await h.queryPermission({ mode: "read" }).catch(function () { return "prompt"; });
    return { st: p === "granted" ? "ok" : "permissao", h: h };
  }
  function mostrarPastas() {
    Promise.all(Object.keys(PASTAS).map(estado)).then(function (es) {
      var ok = es.filter(function (e) { return e.st === "ok"; }).length;
      pastaEl.hidden = false; pastaEl.innerHTML = "";
      var b = document.createElement("button"); b.type = "button";
      b.textContent = "Pastas: " + ok + " de " + es.length + " vinculadas";
      b.className = ok === es.length ? "ok" : "pend";
      b.onclick = abrirPopup;
      pastaEl.appendChild(b);
      var d = document.getElementById("pastas-pop");
      if (d && d.open) desenharPopup();
    });
  }
  function abrirPopup() {
    var d = document.getElementById("pastas-pop");
    if (!d) {
      d = document.createElement("dialog"); d.id = "pastas-pop"; d.className = "pastas-pop";
      d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
      document.body.appendChild(d);
    }
    desenharPopup();
    if (!d.open) d.showModal();
  }
  function desenharPopup() {
    var d = document.getElementById("pastas-pop");
    d.innerHTML = '<div class="pp-cab"><h2>Pastas do painel</h2><button type="button" class="pp-x" aria-label="Fechar">×</button></div>' +
      '<p class="pp-txt">Aponte uma vez para cada pasta no OneDrive deste computador. O navegador guarda a escolha. Funciona no Chrome e no Edge.</p>';
    d.querySelector(".pp-x").onclick = function () { d.close(); };
    if (!window.showDirectoryPicker) {
      d.insertAdjacentHTML("beforeend", '<p class="pp-aviso">Este navegador não permite escolher pastas. Abra o painel no Chrome ou no Edge do computador.</p>');
    }
    Object.keys(PASTAS).forEach(function (t) {
      var P = PASTAS[t], card = document.createElement("div");
      card.className = "pp-card"; d.appendChild(card);
      estado(t).then(async function (e) {
        var chip = { ok: ["Vinculado", "ok"], permissao: ["Permissão pendente", "pend"], nao: ["Não vinculado", "nao"] }[e.st];
        card.innerHTML = '<div class="pp-lin"><div><b class="pp-rot"></b><small class="pp-usa"></small></div><span class="pp-chip ' + chip[1] + '">' + chip[0] + "</span></div>" +
          '<div class="pp-cam"><span>Pasta:</span> <code></code></div><ul class="pp-itens"></ul><div class="pp-acoes"></div>';
        card.querySelector(".pp-rot").textContent = P.rotulo;
        card.querySelector(".pp-usa").textContent = "Usada em: " + P.usa;
        if (e.h) card.querySelector("code").textContent = e.h.name;
        else card.querySelector(".pp-cam").innerHTML = '<span>Selecione a pasta:</span> <b class="pp-dica"></b>', card.querySelector(".pp-dica").textContent = P.nome;
        if (e.st === "ok") {
          var ul = card.querySelector(".pp-itens");
          (await P.itens(e.h)).forEach(function (it) {
            var li = document.createElement("li"); li.className = it[1] ? "sim" : "nao";
            li.textContent = (it[1] ? "✓ " : "✗ ") + it[0] + (it[2] ? " — " + it[2] : it[1] ? "" : " (não encontrado)");
            ul.appendChild(li);
          });
        }
        var ac = card.querySelector(".pp-acoes");
        if (e.st === "permissao") {
          var bp = document.createElement("button"); bp.type = "button"; bp.className = "pp-pri"; bp.textContent = "Permitir acesso";
          bp.onclick = function () { e.h.requestPermission({ mode: "read" }).then(mostrarPastas, mostrarPastas); };
          ac.appendChild(bp);
        }
        var bs = document.createElement("button"); bs.type = "button"; bs.className = e.st === "nao" ? "pp-pri" : "";
        bs.textContent = e.st === "nao" ? "Selecionar pasta" : "Trocar pasta"; bs.disabled = !window.showDirectoryPicker;
        bs.onclick = function () {
          pasta(t, true).then(function () { msg(""); mostrarPastas(); })
            .catch(function (er) { if (er.name !== "AbortError") { var x = document.createElement("p"); x.className = "pp-aviso"; x.textContent = er.message; ac.appendChild(x); } });
        };
        ac.appendChild(bs);
      });
    });
  }

  // ---------- regras de local (as mesmas do Python: ferramentas/regras_locais.json) ----------
  function carregarRegras() {
    if (regras) return Promise.resolve(regras);
    return fetch("ferramentas/regras_locais.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      // \b do Python vale para letras acentuadas; no JavaScript é preciso dizer isso com \p{L}.
      function re(p) { return new RegExp(p.split("\\b(").join("(?<![\\p{L}\\p{N}_])(").split(")\\b").join(")(?![\\p{L}\\p{N}_])"), "u"); }
      regras = { est: re(j.estabelecimento), area: re(j.area),
        con: j.conectores, excl: j.cercas_excluidas };
      return regras;
    });
  }
  function limpo(s) {
    var t = document.createElement("textarea"); t.innerHTML = s || "";
    s = t.value.trim().replace(/\.+$/, "").trim();
    return s === "-" ? "" : s;
  }
  function classifica(nome) {
    if (/^Colaborador(\s\S+\.)*$/.test(nome)) return [nome, "colaborador"];
    if (regras.est.test(nome.toUpperCase())) return [nome, "estabelecimento"];
    if (regras.area.test(nome.toUpperCase()) || regras.area.test(nome)) return [nome.replace(/\s*\([^)]*\)\s*$/, ""), "area"];
    var ini = nome.split(/\s+/).filter(function (p) { return p && regras.con.indexOf(p.toUpperCase()) < 0; }).map(function (p) { return p[0] + "."; });
    return ["Colaborador " + ini.join(" "), "colaborador"];
  }
  var hashCache = {};
  async function excluida(cerca) {
    if (!cerca) return false;
    if (!(cerca in hashCache)) {
      var h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cerca.toUpperCase()));
      hashCache[cerca] = Array.prototype.map.call(new Uint8Array(h), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("").slice(0, 16);
    }
    return regras.excl.indexOf(hashCache[cerca]) >= 0;
  }

  // ---------- leitura de xlsx (JSZip) ----------
  function xmlTxt(s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); }).replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); })
      .replace(/&amp;/g, "&");
  }
  function colNum(l) { var n = 0; for (var i = 0; i < l.length; i++) n = n * 26 + l.charCodeAt(i) - 64; return n - 1; }
  async function lerXlsx(arquivo, abas) {
    var z = await JSZip.loadAsync(await arquivo.arrayBuffer());
    var wb = await z.file("xl/workbook.xml").async("string"), rels = await z.file("xl/_rels/workbook.xml.rels").async("string");
    var alvo = {};
    rels.replace(/<Relationship [^>]*>/g, function (r) {
      var id = /Id="([^"]+)"/.exec(r), t = /Target="([^"]+)"/.exec(r);
      if (id && t) alvo[id[1]] = t[1].replace(/^\/?xl\//, "").replace(/^\//, "");
    });
    var folhas = {};
    wb.replace(/<sheet [^>]*>/g, function (s) {
      var n = /name="([^"]*)"/.exec(s), id = /r:id="([^"]+)"/.exec(s);
      if (n && id) folhas[chave(xmlTxt(n[1]))] = "xl/" + alvo[id[1]];
    });
    var ss = [], sf = z.file("xl/sharedStrings.xml");
    if (sf) (await sf.async("string")).replace(/<si>([\s\S]*?)<\/si>/g, function (_, si) {
      var t = ""; si.replace(/<t[^>]*>([\s\S]*?)<\/t>/g, function (_, x) { t += x; }); ss.push(xmlTxt(t)); return "";
    });
    var out = {};
    for (var a of abas) {
      var nome = Object.keys(folhas).find(function (k) { return k === chave(a) || k.indexOf(chave(a)) === 0; });
      if (!nome) throw new Error("A planilha não tem a aba " + a);
      var xml = await z.file(folhas[nome]).async("string"), linhas = [];
      var reRow = /<row [^>]*?r="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g, m;
      while ((m = reRow.exec(xml))) {
        var cel = [], reC = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, c;
        while ((c = reC.exec(m[2] || ""))) {
          var t = /t="([^"]+)"/.exec(c[2]), v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(c[3] || ""), val = null;
          t = t ? t[1] : "n";
          if (t === "s") val = v ? ss[+v[1]] : null;
          else if (t === "inlineStr") { var it = ""; (c[3] || "").replace(/<t[^>]*>([\s\S]*?)<\/t>/g, function (_, x) { it += x; }); val = xmlTxt(it); }
          else if (t === "str" || t === "e") val = v ? xmlTxt(v[1]) : null;
          else if (t === "b") val = v ? v[1] === "1" : null;
          else val = v ? Number(v[1]) : null;
          cel[colNum(c[1])] = val;
        }
        linhas[+m[1] - 1] = cel;
      }
      out[a] = linhas;
    }
    return out;
  }
  function dataIso(v) {
    if (typeof v === "number") { var d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000)); return d.toISOString().slice(0, 10); }
    var s = String(v || "").trim(), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
    if (m) return m[3] + "-" + m[2] + "-" + m[1];
    m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    return m ? m[1] : "";
  }
  function horaTxt(v) {
    if (typeof v === "number") {
      var s = Math.round((v % 1) * 86400) % 86400;
      return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function (x) { return (x < 10 ? "0" : "") + x; }).join(":");
    }
    return v == null ? "" : String(v).trim();
  }

  // ---------- Comportamental ----------
  async function comportamental(arq) {
    var L = await lerXlsx(arq, ["Frota Leve", "Frota Pesada", "BASE DE INFORMAÇÃO"]);
    var abas = {};
    for (var nome of ["Frota Leve", "Frota Pesada"]) {
      var linhas = L[nome], cab = (linhas[1] || []).map(chave), ix = {};
      cab.forEach(function (h, i) { if (COLS_COMP.indexOf(h) >= 0 && !(h in ix)) ix[h] = i; });
      if (!("PREFIXO" in ix) || !("DATA" in ix)) throw new Error("A aba " + nome + " não tem as colunas esperadas (PREFIXO, DATA).");
      var h = Object.keys(ix), r = [];
      for (var k = 2; k < linhas.length; k++) {
        var x = linhas[k]; if (!x) continue;
        var f = x[ix.PREFIXO]; if (f == null || String(f).trim() === "") continue;
        var row = [];
        for (var c of h) {
          var v = x[ix[c]];
          if (c === "DATA") v = dataIso(v);
          else if (c === "HORA") v = horaTxt(v);
          else if (c === "ULTIMO_COMENTARIO") {
            var u = chave(v);
            v = u.indexOf("PRESTADORES DE SERVI") >= 0 ? "ALARME VERDADEIRO.( PRESTADORES DE SERVIÇO )"
              : u.indexOf("ULTRAPASSAGEM EM FAIXA CONT") >= 0 ? "ALARME VERDADEIRO - ULTRAPASSAGEM EM FAIXA CONTÍNUA" : "";
          } else if (c === "CERCA ELETRÔNICA") {
            var ce = String(v == null ? "" : v).trim().replace(/^[\s-]+|[\s-]+$/g, "");
            if (!ce || (await excluida(ce))) v = "";
            else { var cl = classifica(ce); v = cl[1] === "colaborador" ? "" : cl[0]; }
          } else if (v != null && typeof v !== "number") v = String(v);
          row.push(v == null ? "" : v);
        }
        if (!row[h.indexOf("DATA")]) continue;
        r.push(row);
      }
      abas[nome] = { h: h, r: r };
    }
    var base = [];
    (L["BASE DE INFORMAÇÃO"] || []).slice(1).forEach(function (x) { if (x && x[0] != null && x[3] != null) base.push([String(x[0]).trim(), String(x[3]).trim()]); });
    return { abas: abas, base: base };
  }

  // ---------- CSV ----------
  async function lerCsv(arq) {
    var buf = new Uint8Array(await arq.arrayBuffer()), t;
    try { t = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { t = new TextDecoder("windows-1252").decode(buf); }
    t = t.replace(/^﻿/, "");
    var l1 = t.slice(0, t.indexOf("\n")), dl = (l1.split(";").length >= l1.split(",").length) ? ";" : ",";
    var linhas = [], campo = "", linha = [], aspas = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (aspas) {
        if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === dl) { linha.push(campo); campo = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && t[i + 1] === "\n") i++;
        linha.push(campo); campo = "";
        if (linha.some(function (x) { return x !== ""; })) linhas.push(linha);
        linha = [];
      } else campo += ch;
    }
    if (campo !== "" || linha.length) { linha.push(campo); if (linha.some(function (x) { return x !== ""; })) linhas.push(linha); }
    return linhas;
  }
  function selecionar(linhas, cols) {
    var cab = linhas[0].map(chave), ix = cols.map(function (c) { return cab.indexOf(c); });
    return { h: cols.filter(function (c, k) { return ix[k] >= 0; }), ix: ix.filter(function (i) { return i >= 0; }), cab: cab };
  }
  async function alertas(arq) {
    var L = await lerCsv(arq), s = selecionar(L, COLS_PERM), r = [];
    var iT = s.cab.indexOf("TIPO"), iC = s.cab.indexOf("CERCA ELETRÔNICA"), iP = s.cab.indexOf("PONTO_REFERENCIA");
    for (var k = 1; k < L.length; k++) {
      var x = L[k];
      if (!TIPOS_PERM[chave(x[iT])]) continue;
      x = x.slice();
      var ponto = limpo(x[iP]), cerca = limpo(x[iC]);
      if (chave(ponto).indexOf("LIBERAÇÃO") === 0 || chave(ponto).indexOf("LIBERACAO") === 0) continue;
      if (await excluida(cerca)) continue;
      if (cerca) { x[iC] = classifica(cerca)[0]; x[iP] = ""; }
      else if (ponto) { x[iC] = ""; x[iP] = classifica(ponto)[0]; }
      r.push(s.ix.map(function (i) { return x[i] == null ? "" : x[i]; }));
    }
    return { h: s.h, r: r, tam: arq.size };
  }
  async function boletim(arq) {
    var L = await lerCsv(arq), s = selecionar(L, COLS_BOL);
    if (s.h.indexOf("PREFIXO") < 0) throw new Error(arq.name + " não parece um Boletim do Veículo.");
    return { h: s.h, r: L.slice(1).map(function (x) { return s.ix.map(function (i) { return x[i] == null ? "" : x[i]; }); }) };
  }

  // ---------- GitHub ----------
  function gh(metodo, cam, corpo, accept) {
    return fetch("https://api.github.com/repos/" + REPO + cam, {
      method: metodo, body: corpo ? JSON.stringify(corpo) : undefined, cache: "no-store",
      headers: Object.assign({ Authorization: "Bearer " + token, Accept: accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        corpo ? { "Content-Type": "application/json" } : {})
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) throw new Error("O token do botão venceu ou não tem permissão no repositório de dados. Avise o responsável pelo painel.");
      return r;
    });
  }
  function ghJson(metodo, cam, corpo) {
    return gh(metodo, cam, corpo).then(function (r) {
      if (!r.ok) throw new Error("O GitHub recusou (" + r.status + " em " + cam.split("?")[0] + ").");
      return r.status === 204 ? null : r.json();
    });
  }
  function indice() {
    return gh("GET", "/contents/base/indice.json?ref=main", null, "application/vnd.github.raw+json")
      .then(function (r) { return r.ok ? r.json() : {}; }).catch(function (e) { if (/token/.test(e.message)) throw e; return {}; });
  }
  async function b64(blob) {
    var u = new Uint8Array(await blob.arrayBuffer()), s = "";
    for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function enviar(pedido) {
    var gz = await new Response(new Blob([JSON.stringify(pedido)]).stream().pipeThrough(new CompressionStream("gzip"))).blob();
    var blob = await ghJson("POST", "/git/blobs", { content: await b64(gz), encoding: "base64" });
    var ref = await ghJson("GET", "/git/ref/heads/main");
    var com = await ghJson("GET", "/git/commits/" + ref.object.sha);
    var tree = await ghJson("POST", "/git/trees", { base_tree: com.tree.sha, tree: [{ path: "entrada/pedido.json.gz", mode: "100644", type: "blob", sha: blob.sha }] });
    var novo = await ghJson("POST", "/git/commits", { message: "Pedido de atualização pelo painel", tree: tree.sha, parents: [ref.object.sha] });
    await ghJson("PATCH", "/git/refs/heads/main", { sha: novo.sha });
    return gz.size;
  }
  function acompanhar(desde, voltas) {
    return ghJson("GET", "/actions/workflows/" + WF + "/runs?event=workflow_dispatch&per_page=1").then(function (j) {
      var run = j && j.workflow_runs && j.workflow_runs[0];
      if (!run || new Date(run.created_at).getTime() < desde - 60000) {
        if (voltas > 30) throw new Error("Não consegui acompanhar a atualização. Veja de novo em alguns minutos.");
        return new Promise(function (ok) { setTimeout(ok, 5000); }).then(function () { return acompanhar(desde, voltas + 1); });
      }
      if (run.status !== "completed") {
        msg("Processando no servidor… (" + (run.status === "queued" ? "na fila" : "em andamento") + ")");
        return new Promise(function (ok) { setTimeout(ok, 10000); }).then(function () { return acompanhar(desde, voltas + 1); });
      }
      if (run.conclusion !== "success")
        throw new Error("A atualização não terminou (" + ({ failure: "falhou", cancelled: "cancelada", timed_out: "demorou demais" }[run.conclusion] || run.conclusion) + "). Avise o responsável pelo painel.");
    });
  }

  // ---------- fluxo do botão ----------
  async function atualizar() {
    if (!window.showDirectoryPicker) throw new Error("Para atualizar, use o Chrome ou o Edge no computador.");
    var comp = await pasta("comp", false);
    var alert = await pasta("alertas", false);
    await carregarRegras();
    msg("Conferindo o que mudou…");
    var ind = await indice(), pedido = { v: 1, quando: new Date().toISOString(), quem: quem }, feito = [];

    var nova = await filho(comp, NOVA, false);
    if (!nova) throw new Error('Não achei a planilha "' + NOVA + '" na pasta do Comportamental.');
    var fn = await nova.getFile(), ic = ind.comportamento || {};
    if (fn.size !== ic.tam || fn.lastModified !== ic.mod) {
      msg("Lendo a planilha do Comportamental (pode levar 1 minuto)…");
      var C = await comportamental(fn);
      C.arquivo = { nome: fn.name, tam: fn.size, mod: fn.lastModified };
      pedido.comportamento = C; feito.push("Comportamental");
    }

    var dirA = alert;
    if (dirA) {
      var ip = ind.permanencia || {}, perm = {};
      for await (var e of dirA.values()) {
        if (e.kind !== "file" || !/^Historico_Alertas_.*\.csv$/i.test(e.name)) continue;
        var f = await e.getFile();
        if (String(ip[e.name]) === String(f.size)) continue;
        msg("Lendo alertas de permanência: " + e.name.slice(18, 28) + "…");
        perm[e.name] = await alertas(f);
      }
      if (Object.keys(perm).length) { pedido.permanencia = { arquivos: perm }; feito.push("Permanência (" + Object.keys(perm).length + " arquivo(s))"); }
    }

    var dirE = await filho(comp, EXPORT, true);
    if (dirE) {
      var dias = ind.boletins || [], ult = dias[dias.length - 1] || "", bols = {};
      for await (var b of dirE.values()) {
        var m = /^Boletim_do_Veiculo_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})( \(\d+\))?\.csv$/i.exec(b.name);
        // só boletim de um dia (início = fim); o de período não serve para a base diária
        if (b.kind !== "file" || !m || m[1] !== m[2] || (dias.indexOf(m[1]) >= 0 && m[1] < ult)) continue;
        bols[b.name] = await boletim(await b.getFile());
      }
      if (Object.keys(bols).length) { pedido.boletins = bols; feito.push("Motor ocioso"); }
    }

    // Conectividade (Localização da Frota + status_frotas) e Câmeras (Saúde do Veículo): o arquivo mais recente de cada.
    var proc = ind.processados || [], loc = null, sau = null;
    if (dirE) for await (var x of dirE.values()) {
      if (x.kind !== "file" || !/\.csv$/i.test(x.name)) continue;
      if (/^Localizacao_da_Frota_/i.test(x.name) && (!loc || x.name > loc.name)) loc = x;
      if (/^Sa(ú|u)de(_| )do(_| )Ve(í|i)culo/i.test(nfc(x.name)) && (!sau || x.name > sau.name)) sau = x;
    }
    function novo(f) { return proc.indexOf(f.name) < 0 && proc.indexOf(f.name + "|" + f.lastModified) < 0; }
    if (loc && novo(loc = await loc.getFile())) {
      var Ll = await lerCsv(loc), sl = selecionar(Ll, COLS_LOC);
      pedido.conectividade = { nome: loc.name, mod: loc.lastModified, h: sl.h, r: Ll.slice(1).map(function (y) { return sl.ix.map(function (i) { return y[i] == null ? "" : y[i]; }); }) };
    } else loc = null;
    var stf = await filho(comp, "status_frotas.xlsx", false);
    if (stf) {
      stf = await stf.getFile();
      if (pedido.conectividade || stf.lastModified !== ind.status_frotas) {
        msg("Lendo a status_frotas…");
        pedido.status_frotas = { mod: stf.lastModified, b64: await b64(stf) };
        feito.push("Conectividade");
      }
    } else if (pedido.conectividade) throw new Error("Não achei a status_frotas.xlsx na pasta do Comportamental.");
    if (sau && novo(sau = await sau.getFile())) {
      var Ls = await lerCsv(sau);
      pedido.cameras = { nome: sau.name, mod: sau.lastModified, h: Ls[0], r: Ls.slice(1) };
      feito.push("Câmeras");
    }

    if (!feito.length) { msg("Nada novo nas pastas desde a última atualização (" + (ind.atualizado || "—") + ").", "ok"); return; }
    msg("Enviando (" + feito.join(", ") + ")…");
    var desde = Date.now();
    await enviar(pedido);
    await ghJson("POST", "/actions/workflows/" + WF + "/dispatches", { ref: "main" });
    await acompanhar(desde, 0);
    msg("Atualizado: " + feito.join(", ") + ". O site publica em 1 a 2 minutos; depois recarregue a página.", "ok");
  }

  // Usado só nos testes automáticos (ferramentas não chamam a rede).
  window.__painelTeste = { comportamental: comportamental, alertas: alertas, boletim: boletim, carregarRegras: carregarRegras,
    enviar: enviar, indice: indice,
    csv: async function (f) { var L = await lerCsv(f), x = /^Localizacao/i.test(f.name) ? selecionar(L, COLS_LOC) : null;
      return x ? { h: x.h, r: L.slice(1).map(function (y) { return x.ix.map(function (i) { return y[i] == null ? "" : y[i]; }); }) } : { h: L[0], r: L.slice(1) }; }, acompanhar: acompanhar, token: function (t) { token = t; st = document.createElement("p"); } };

  window.painelAtualizar = function (tok, nome) {
    quem = nome || "";
    bt = document.getElementById("atualizar"); st = document.getElementById("atualizar-st"); pastaEl = document.getElementById("atualizar-pasta");
    if (!bt || !tok) return;
    token = tok; bt.hidden = false;
    mostrarPastas();
    bt.addEventListener("click", function () {
      // Aviso antes de atualizar (o clique em "Sim" também libera a leitura das pastas no navegador).
      st.hidden = false; st.className = "atu-st atu-conf"; st.innerHTML =
        "<b>Antes de atualizar, confirme que os arquivos novos já foram exportados para as pastas:</b>" +
        "<ul><li>Planilha <i>Ocorrências monitoramento comportamental Nova</i> preenchida e salva;</li>" +
        "<li>Na <i>EXPORTAR PASTAS</i>: Localização da Frota, Saúde do Veículo e Boletim do Veículo do dia;</li>" +
        "<li>Na <i>COA - BASE DE DADOS MONITORAMENTO COMPORTAMENTAL</i>: os alertas (Historico_Alertas) do dia;</li>" +
        "<li><i>status_frotas</i> revisada e fechada no Excel.</li></ul>" +
        '<span class="atu-bts"><button type="button" data-r="sim">Sim, está tudo exportado. Atualizar</button><button type="button" data-r="nao">Cancelar</button></span>';
      st.querySelector('[data-r="nao"]').onclick = function () { msg(""); };
      st.querySelector('[data-r="sim"]').onclick = iniciar;
    });
    function iniciar() {
      bt.disabled = true;
      atualizar().catch(function (e) {
        msg(e.name === "AbortError" ? "" : (e.name === "TypeError" && /fetch/i.test(e.message) ? "Sem conexão com o GitHub agora. Tente de novo." : e.message), "erro");
      }).then(function () { bt.disabled = false; });
    }
  };
})();
