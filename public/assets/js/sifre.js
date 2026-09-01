/* Parola sıfırlama akışı: istek formu + yenileme formu. */
(function () {
  'use strict';

  var form = document.querySelector('[data-sifre-form]');
  if (!form) return;

  var tur = form.getAttribute('data-sifre-form'); // "unuttum" | "yenile"
  var hataKutu = document.getElementById('formHata');
  var dugme = form.querySelector('button[type="submit"]');

  function goster(mesaj, basari) {
    hataKutu.textContent = mesaj;
    hataKutu.classList.add('gorunur');
    hataKutu.style.borderColor = basari ? 'var(--good, #2E7D6B)' : '';
    hataKutu.style.background = basari ? 'color-mix(in srgb, #2E7D6B 10%, transparent)' : '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hataKutu.classList.remove('gorunur');

    var veri = {};
    new FormData(form).forEach(function (v, k) { veri[k] = v; });
    if (veri.eposta) veri.eposta = veri.eposta.trim().toLowerCase();
    if (tur === 'yenile') veri.token = new URLSearchParams(location.search).get('token') || '';

    dugme.disabled = true;
    var eski = dugme.textContent;
    dugme.textContent = 'Gönderiliyor…';

    fetch('/api/' + (tur === 'unuttum' ? 'sifre-unuttum' : 'sifre-yenile'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(veri)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, durum: r.status, j: j }; }); })
      .then(function (s) {
        if (s.ok && tur === 'yenile') { location.assign('/profil/'); return; }
        if (s.ok) {
          goster(s.j.mesaj || 'Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.', true);
          dugme.textContent = 'Gönderildi ✓';
          return;
        }
        goster(s.durum === 503
          ? 'E-posta gönderimi şu an etkin değil. İletişim için: voleybolveveleybol@gmail.com'
          : (s.j.hata || 'Bir şeyler ters gitti. Tekrar dene.'));
        dugme.disabled = false; dugme.textContent = eski;
      })
      .catch(function () {
        goster('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
        dugme.disabled = false; dugme.textContent = eski;
      });
  });
})();
