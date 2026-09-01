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
      var dg = document.getElementById('pDogrulama');
      if (u.dogrulandi) {
        dg.textContent = 'Doğrulandı ✓';
      } else {
        dg.innerHTML = 'Doğrulanmadı — sıralamada görünmek için ' +
          '<button class="link-dugme" type="button" id="dogrulamaBtn">doğrulama e-postası gönder</button>';
        var btn = document.getElementById('dogrulamaBtn');
        btn.addEventListener('click', function () {
          btn.disabled = true; btn.textContent = 'gönderiliyor…';
          fetch('/api/dogrulama-gonder', { method: 'POST' })
            .then(function (r) { return r.json().then(function (j) { return { durum: r.status, j: j }; }); })
            .then(function (s) {
              if (s.durum === 200) { dg.textContent = 'Doğrulama e-postası gönderildi — gelen kutunu (ve spam klasörünü) kontrol et.'; return; }
              btn.disabled = false; btn.textContent = 'doğrulama e-postası gönder';
              dg.insertAdjacentText('beforeend', ' · ' + (s.durum === 503
                ? 'E-posta gönderimi henüz etkin değil.'
                : (s.j.hata || 'Gönderilemedi, tekrar dene.')));
            })
            .catch(function () { btn.disabled = false; btn.textContent = 'doğrulama e-postası gönder'; });
        });
      }

      // /api/eposta-dogrula yönlendirmesinden gelen sonuç mesajı
      var dq = new URLSearchParams(location.search).get('dogrulama');
      if (dq === 'tamam') dg.textContent = 'Doğrulandı ✓ — sıralamadasın!';
      else if (dq === 'gecersiz') dg.insertAdjacentText('beforeend', ' · Bağlantı geçersiz veya süresi dolmuş; yenisini iste.');
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

  /* ---------- hesap silme ---------- */
  var silBaslat = document.getElementById('silBaslat');
  var silForm = document.getElementById('silForm');
  if (silBaslat && silForm) {
    silBaslat.addEventListener('click', function () {
      silBaslat.hidden = true;
      silForm.hidden = false;
      document.getElementById('silOnay').focus();
    });
    silForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var hata = document.getElementById('silHata');
      hata.classList.remove('gorunur');
      var dugme = silForm.querySelector('button[type="submit"]');
      dugme.disabled = true; dugme.textContent = 'Siliniyor…';
      fetch('/api/hesap-sil', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ onay: document.getElementById('silOnay').value })
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (s) {
          if (s.ok) { location.assign('/'); return; }
          hata.textContent = s.j.hata || 'Silinemedi, tekrar dene.';
          hata.classList.add('gorunur');
          dugme.disabled = false; dugme.textContent = 'Hesabı kalıcı olarak sil';
        })
        .catch(function () {
          hata.textContent = 'Sunucuya ulaşılamadı.';
          hata.classList.add('gorunur');
          dugme.disabled = false; dugme.textContent = 'Hesabı kalıcı olarak sil';
        });
    });
  }

  document.getElementById('cikisBtn').addEventListener('click', function () {
    this.disabled = true;
    this.textContent = 'Çıkılıyor…';
    fetch('/api/cikis', { method: 'POST' }).finally(function () { location.assign('/'); });
  });
})();
