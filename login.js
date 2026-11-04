// Login: destranca no navegador só os dados do grupo do usuário (ver ferramentas/gerar_acesso.py).
(function () {
  var A = window.ACESSO, enc = new TextEncoder(), dec = new TextDecoder();
  var form = document.getElementById("login"), erro = document.getElementById("login-erro"), botao = form.querySelector("button");
  var CHAVE_SESSAO = "painel-frotas-sessao";

  function bin(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join(""); }
  function normaliza(s) { return s.normalize("NFC").trim().toLowerCase(); }
  function abrir(chave, blob, aad) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: bin(blob.iv), additionalData: enc.encode(aad) }, chave, bin(blob.ct));
  }
  function aes(raw) { return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]); }

  function entrarComChave(gid, raw, nome) {
    return aes(raw).then(function (k) { return abrir(k, A.grupos[gid], "dados:" + gid); }).then(function (buf) {
      var D = JSON.parse(dec.decode(buf));
      document.getElementById("acesso").hidden = true;
      document.getElementById("app").hidden = false;
      document.getElementById("quem").hidden = false;
      document.getElementById("quem-nome").textContent = nome;
      document.getElementById("quem-escopo").textContent = D.escopo === "todos" ? "Todos os processos" : D.escopo.length === 1 ? "Processo: " + nomeProc(D, D.escopo[0]) : D.escopo.length + " processos";
      window.iniciarPainel(D);
    });
  }
  function nomeProc(D, k) {
    var l = D.ocorrencias.linhas.filter(function (x) { return x.processo.toLowerCase() === k; })[0];
    return l ? l.processo : k;
  }

  function sessao(v) {
    try { if (v === undefined) return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO)); if (v) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(v)); else sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { return null; }
  }

  if (!A || !window.crypto || !crypto.subtle) {
    erro.textContent = !A ? "Os dados de acesso não carregaram. Atualize a página." : "Este navegador não suporta o login seguro. Use Chrome, Edge ou Firefox atualizados.";
    botao.disabled = true;
    return;
  }

  // Continua logado ao atualizar a página (só nesta aba; some ao fechar o navegador).
  var s = sessao();
  if (s && A.grupos[s.g]) entrarComChave(s.g, bin(s.k), s.n).catch(function () { sessao(null); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var usuario = form.usuario.value, senha = form.senha.value;
    if (!usuario.trim() || !senha) { erro.textContent = "Preencha usuário e senha."; return; }
    erro.textContent = ""; botao.disabled = true; botao.textContent = "Verificando…";
    var uid, u, raw;
    crypto.subtle.digest("SHA-256", enc.encode("painel-frotas:" + normaliza(usuario))).then(function (h) {
      uid = hex(h); u = A.usuarios[uid];
      if (!u) throw new Error("x");
      return crypto.subtle.importKey("raw", enc.encode(senha.normalize("NFC").trim()), "PBKDF2", false, ["deriveKey"]);
    }).then(function (base) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: bin(u.sal), iterations: A.iter }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (kek) { return abrir(kek, u, "chave:" + uid); }).then(function (r) {
      raw = new Uint8Array(r);
      return entrarComChave(u.g, raw, usuario.trim());
    }).then(function () {
      sessao({ g: u.g, k: b64(raw), n: usuario.trim() });
      form.reset();
    }).catch(function () {
      erro.textContent = "Usuário ou senha incorretos.";
      form.senha.value = ""; form.senha.focus();
    }).then(function () { botao.disabled = false; botao.textContent = "Entrar"; });
  });

  document.getElementById("sair").addEventListener("click", function () {
    sessao(null);
    location.href = location.pathname;
  });
})();
