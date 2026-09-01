/* Profil sayfası — /api/ben ile dolar; oturum yoksa girişe yönlendirir. */
(function () {
  'use strict';

  var kart = document.getElementById('profilKart');
  if (!kart) return;

  fetch('/api/ben', { cache: 'no-store' })
    .then(function (r) {
      if (r.status === 401) { location.replace('/giris/?donus=/profil/'); throw new Error('oturum yok'); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      var u = d.uye;
      var tarih = new Date(u.olusturuldu).toLocaleDateString('tr-TR', { dateStyle: 'long' });
      document.getElementById('pKullanici').textContent = u.kullanici_adi;
      document.getElementById('pEposta').textContent = u.eposta;
      document.getElementById('pTarih').textContent = tarih;
      document.getElementById('pDogrulama').textContent = u.dogrulandi
        ? 'Doğrulandı' : 'Doğrulanmadı — doğrulama e-postası yakında geliyor; şimdilik testleri etkilemez';
      kart.hidden = false;
      document.getElementById('profilYukleniyor').hidden = true;
    })
    .catch(function (e) {
      if (e.message === 'oturum yok') return;
      document.getElementById('profilYukleniyor').textContent = 'Profil yüklenemedi. Sayfayı yenilemeyi dene.';
    });

  document.getElementById('cikisBtn').addEventListener('click', function () {
    this.disabled = true;
    this.textContent = 'Çıkılıyor…';
    fetch('/api/cikis', { method: 'POST' }).finally(function () { location.assign('/'); });
  });
})();
