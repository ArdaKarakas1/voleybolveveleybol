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

  /* Google akışından hata koduyla dönülmüşse göster; donus'u Google bağlantısına taşı. */
  var params = new URLSearchParams(location.search);
  var OAUTH_HATALARI = {
    'google-kapali': 'Google ile giriş şu an etkin değil. E-posta ile devam edebilirsin.',
    'google-iptal': 'Google girişi iptal edildi.',
    'google-state': 'Google girişi doğrulanamadı (oturum süresi dolmuş olabilir). Tekrar dene.',
    'google-basarisiz': 'Google ile giriş tamamlanamadı. Tekrar dene ya da e-posta ile devam et.',
    'eposta-yok': 'Google hesabın bir e-posta adresi vermedi. E-posta ile kayıt olabilirsin.',
    'eposta-dogrulanmamis': 'Bu e-posta zaten kayıtlı ama Google hesabında doğrulanmamış görünüyor. E-posta ve parolanla giriş yap.'
  };
  if (params.get('hata') && OAUTH_HATALARI[params.get('hata')]) {
    hataKutu.textContent = OAUTH_HATALARI[params.get('hata')];
    hataKutu.classList.add('gorunur');
  }
  var googleLink = document.querySelector('[data-google-giris]');
  if (googleLink && params.get('donus')) {
    googleLink.href += '?donus=' + encodeURIComponent(params.get('donus'));
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
    if ('kvkk_onay' in veri) veri.kvkk_onay = true; // isaretliyse FormData'da "on" olarak gelir

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
