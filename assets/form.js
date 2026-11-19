// Formulário de captura: valida no navegador, envia para a função raiox-leads e mostra a confirmação.
(function () {
  "use strict";
  var ENDPOINT = "https://fkijpdswtvsguwoygqap.supabase.co/functions/v1/raiox-leads";
  var form = document.getElementById("lead");
  if (!form) return;
  var btn = document.getElementById("enviar"), falha = document.getElementById("falha");

  // origem da visita (campanha, página que indicou) para saber de onde vêm os contatos
  var origem = { pagina: location.pathname };
  try {
    var q = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) { var v = q.get(k); if (v) origem[k] = v.slice(0, 200); });
    if (document.referrer && document.referrer.indexOf(location.host) < 0) origem.ref = document.referrer.slice(0, 200);
  } catch (e) { /* navegador antigo: segue sem origem */ }

  // máscara simples de telefone: (88) 99999-0000
  var tel = form.whatsapp;
  tel.addEventListener("input", function () {
    var d = tel.value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
    var f = d.length > 6 ? "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4) : d.length > 2 ? "(" + d.slice(0, 2) + ") " + d.slice(2) : d;
    tel.value = f;
  });

  function marca(nome, ok) {
    var el = form.querySelector('[data-campo="' + nome + '"]');
    if (!el) return;
    el.classList.toggle("invalido", !ok);
    var input = el.querySelector("input");
    input.setAttribute("aria-invalid", ok ? "false" : "true");
    if (!ok) input.setAttribute("aria-describedby", nome + "-erro"); else input.removeAttribute("aria-describedby");
  }
  function valida() {
    var digitos = tel.value.replace(/\D/g, "");
    var r = {
      nome: form.nome.value.trim().length >= 2,
      whatsapp: digitos.length >= 10 && digitos.length <= 13,
      email: !form.email.value.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim()),
    };
    Object.keys(r).forEach(function (k) { marca(k, r[k]); });
    var consent = form.consentimento.checked;
    document.getElementById("consent-box").classList.toggle("invalido", !consent);
    var primeiro = !r.nome ? form.nome : !r.whatsapp ? tel : !r.email ? form.email : !consent ? form.consentimento : null;
    return primeiro;
  }
  ["nome", "whatsapp", "email"].forEach(function (k) { form[k].addEventListener("blur", function () { if (form[k].closest(".invalido")) valida(); }); });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    falha.classList.remove("on"); falha.textContent = "";
    var primeiro = valida();
    if (primeiro) {
      if (primeiro === form.consentimento) { falha.textContent = "Marque a autorização de contato para enviar."; falha.classList.add("on"); }
      primeiro.focus(); return;
    }
    var dados = {
      nome: form.nome.value.trim(), whatsapp: tel.value, email: form.email.value.trim(), empresa: form.empresa.value.trim(),
      cidade: form.cidade.value.trim(), uf: form.uf.value, segmento: form.segmento.value, lojas: form.lojas.value, erp: form.erp.value,
      mensagem: form.mensagem.value.trim(), consentimento: true, origem: origem, site: form.site.value,
    };
    btn.disabled = true; btn.textContent = "Enviando…";
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, status: res.status, j: j }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status === 429 ? "Muitos envios seguidos. Aguarde alguns minutos e tente de novo." : (r.j && r.j.erro) || "Não foi possível enviar agora. Tente de novo em instantes.");
        form.hidden = true;
        var ok = document.getElementById("enviado"); ok.hidden = false; ok.focus();
        try { window.scrollTo({ top: document.getElementById("formulario").offsetTop - 16, behavior: "smooth" }); } catch (e) { /* ok */ }
      })
      .catch(function (e) {
        falha.textContent = e && e.message && e.message !== "Failed to fetch" ? e.message : "Sem conexão com o servidor. Confira a internet e tente de novo.";
        falha.classList.add("on");
      })
      .finally(function () { btn.disabled = false; btn.textContent = "Agendar demonstração"; });
  });
})();
