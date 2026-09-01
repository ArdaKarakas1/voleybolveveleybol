/* Sıralama tablosu — /api/siralama'dan dolar; üyeyse kendi satırını vurgular. */
(function () {
  'use strict';

  var govde = document.getElementById('siralamaGovde');
  if (!govde) return;

  var durum = document.getElementById('siralamaDurum');
  var sar = document.getElementById('siralamaTabloSar');
  var not = document.getElementById('siralamaNot');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sure(sn) {
    if (sn == null) return '—';
    var d = Math.floor(sn / 60), s = sn % 60;
    return d + ':' + (s < 10 ? '0' : '') + s;
  }

  Promise.all([
    fetch('/api/siralama').then(function (r) { return r.ok ? r.json() : Promise.reject(); }),
    fetch('/api/ben', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (sonuc) {
    var tablo = sonuc[0].tablo;
    var benimAdim = sonuc[1] && sonuc[1].uye.kullanici_adi;

    if (!tablo.length) {
      durum.innerHTML = '<p>Tablo henüz boş — <strong>ilk sırayı kapma şansı duruyor.</strong></p>';
      return;
    }

    govde.innerHTML = tablo.map(function (s, i) {
      var benim = s.kullanici_adi === benimAdim;
      var tarih = new Date(s.bitti).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      return '<tr' + (benim ? ' class="benim"' : '') + '>' +
        '<td class="sira-no">' + (i + 1) + '</td>' +
        '<td>' + esc(s.kullanici_adi) + (benim ? ' <span class="sen-etiketi">sen</span>' : '') + '</td>' +
        '<td class="sag"><b>' + s.puan + '</b>/' + s.toplam + '</td>' +
        '<td class="sag">' + sure(s.sure_sn) + '</td>' +
        '<td class="sag">' + tarih + '</td></tr>';
    }).join('');

    durum.hidden = true;
    sar.hidden = false;
    not.hidden = false;
    not.textContent = 'Son güncelleme: ' + new Date(sonuc[0].guncellendi).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) + ' · İlk 50 gösteriliyor';
  }).catch(function () {
    durum.innerHTML = '<p>Sıralama yüklenemedi. Sayfayı yenilemeyi dene.</p>';
  });
})();
