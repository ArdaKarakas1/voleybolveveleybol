/* Giriş ve kayıt formları — /api/giris ve /api/kayit ile konuşur. */
(function () {
  'use strict';

  var form = document.querySelector('[data-kimlik-form]');
  if (!form) return;

  var uc = form.getAttribute('data-kimlik-form'); // "giris" | "kayit"
  var hataKutu = document.getElementById('formHata');
  var dugme = form.querySelector('button[type="submit"]');

  // Giriş sonrası dönülecek adres: yalnızca site içi yollar kabul edilir
  // (açık yönlendirme açığı olmasın).
  function donusAdresi() {
    var p = new URLSearchParams(location.search).get('donus');
    return (p && p.charAt(0) === '/' && p.charAt(1) !== '/') ? p : '/profil/';
  }

  function hataGoster(mesaj, alan) {
    hataKutu.textContent = mesaj;
    hataKutu.classList.add('gorunur');
    form.querySelectorAll('.form-alan').forEach(function (a) { a.classList.remove('hatali'); });
    if (alan) {
      var giris = form.querySelector('[name="' + alan + '"]');
      if (giris) { giris.closest('.form-alan').classList.add('hatali'); giris.focus(); }
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hataKutu.classList.remove('gorunur');

    var veri = {};
    new FormData(form).forEach(function (v, k) { veri[k] = v; });
    if (veri.kullanici_adi) veri.kullanici_adi = veri.kullanici_adi.trim().toLowerCase();
    if (veri.eposta) veri.eposta = veri.eposta.trim().toLowerCase();

    dugme.disabled = true;
    var eskiMetin = dugme.textContent;
    dugme.textContent = uc === 'kayit' ? 'Hesap açılıyor…' : 'Giriş yapılıyor…';

    fetch('/api/' + uc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(veri)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (s) {
        if (s.ok) { location.assign(donusAdresi()); return; }
        hataGoster(s.j.hata || 'Bir şeyler ters gitti. Tekrar dene.', s.j.alan);
        dugme.disabled = false; dugme.textContent = eskiMetin;
      })
      .catch(function () {
        hataGoster('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
        dugme.disabled = false; dugme.textContent = eskiMetin;
      });
  });
})();
