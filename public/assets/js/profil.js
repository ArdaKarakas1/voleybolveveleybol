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
      skorlariYukle();
    })
    .catch(function (e) {
      if (e.message === 'oturum yok') return;
      document.getElementById('profilYukleniyor').textContent = 'Profil yüklenemedi. Sayfayı yenilemeyi dene.';
    });

  function sure(sn) {
    if (sn == null) return '—';
    var d = Math.floor(sn / 60), s = sn % 60;
    return d + ':' + (s < 10 ? '0' : '') + s;
  }

  function skorlariYukle() {
    var kutu = document.getElementById('skorGecmisi');
    if (!kutu) return;
    fetch('/api/skorlarim', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (!d.gecmis.length) {
          kutu.innerHTML = '<p class="text-dim">Henüz tamamlanmış testin yok. <a href="/testler/">İlkini çöz</a> — skorun burada ve sıralamada görünsün.</p>';
          return;
        }
        var enIyi = d.en_iyi;
        kutu.innerHTML =
          '<p style="margin-bottom:10px">En iyi skorun: <b>' + enIyi.puan + '/' + enIyi.toplam + '</b>' +
          ' <span class="text-dim">(' + sure(enIyi.sure_sn) + ') · <a href="/siralama/">sıralamadaki yerine bak</a></span></p>' +
          '<ul class="skor-liste" style="list-style:none;padding:0;margin:0">' +
          d.gecmis.map(function (g) {
            var t = new Date(g.bitti).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
            return '<li><span>' + t + '</span><span><span class="puan">' + g.puan + '/' + g.toplam + '</span>' +
              ' <span class="text-dim">· ' + sure(g.sure_sn) + '</span></span></li>';
          }).join('') + '</ul>';
      })
      .catch(function () {
        kutu.innerHTML = '<p class="text-dim">Skor geçmişi yüklenemedi.</p>';
      });
  }

  document.getElementById('cikisBtn').addEventListener('click', function () {
    this.disabled = true;
    this.textContent = 'Çıkılıyor…';
    fetch('/api/cikis', { method: 'POST' }).finally(function () { location.assign('/'); });
  });
})();
