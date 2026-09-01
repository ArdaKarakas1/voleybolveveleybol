/* Sıralama tablosu — genel (set toplamları) ve set bazlı görünüm. */
(function () {
  'use strict';

  var govde = document.getElementById('siralamaGovde');
  if (!govde) return;

  var durum = document.getElementById('siralamaDurum');
  var sar = document.getElementById('siralamaTabloSar');
  var not = document.getElementById('siralamaNot');
  var filtre = document.getElementById('siralamaFiltre');
  var benimAdim = null;

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

  function yukle(set) {
    durum.hidden = false;
    durum.innerHTML = 'Sıralama yükleniyor…';
    sar.hidden = true; not.hidden = true;

    filtre.querySelectorAll('button').forEach(function (b) {
      var aktif = b.getAttribute('data-set') === set;
      b.className = 'btn btn-sm ' + (aktif ? 'btn-primary' : 'btn-ghost');
    });
    var url = new URL(location.href);
    if (set) url.searchParams.set('set', set); else url.searchParams.delete('set');
    url.searchParams.delete('taze'); // yenilemede tekrar önbellek atlanmasın
    history.replaceState(null, '', url);

    var sorgu = [];
    if (set) sorgu.push('set=' + encodeURIComponent(set));
    if (taze) { sorgu.push('taze=1'); taze = false; }
    fetch('/api/siralama' + (sorgu.length ? '?' + sorgu.join('&') : ''))
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) {
        if (!d.tablo.length) {
          durum.innerHTML = '<p>Bu tablo henüz boş — <strong>ilk sırayı kapma şansı duruyor.</strong></p>';
          return;
        }
        govde.innerHTML = d.tablo.map(function (s, i) {
          var benim = s.kullanici_adi === benimAdim;
          var tarih = new Date(s.bitti).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
          return '<tr' + (benim ? ' class="benim"' : '') + '>' +
            '<td class="sira-no">' + (i + 1) + '</td>' +
            '<td>' + esc(s.kullanici_adi) + (benim ? ' <span class="sen-etiketi">sen</span>' : '') + '</td>' +
            '<td class="sag"><b>' + s.puan + '</b>/' + s.toplam +
            (s.set_sayisi ? ' <span class="text-dim">(' + s.set_sayisi + ' set)</span>' : '') + '</td>' +
            '<td class="sag">' + sure(s.sure_sn) + '</td>' +
            '<td class="sag">' + tarih + '</td></tr>';
        }).join('');
        durum.hidden = true;
        sar.hidden = false;
        not.hidden = false;
        not.textContent = 'Son güncelleme: ' + new Date(d.guncellendi).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) + ' · İlk 50 gösteriliyor';
      })
      .catch(function () {
        durum.innerHTML = '<p>Sıralama yüklenemedi. Sayfayı yenilemeyi dene.</p>';
      });
  }

  filtre.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-set]');
    if (b) yukle(b.getAttribute('data-set'));
  });

  var ilkParams = new URLSearchParams(location.search);
  var ilkSet = ilkParams.get('set') || '';
  var taze = ilkParams.get('taze') === '1'; // sonuç ekranından gelindi: önbelleksiz yükle (tek sefer)

  // Set düğmeleri + kendi adım paralel yüklenir; sonra tablo çekilir.
  Promise.all([
    fetch('/api/setler').then(function (r) { return r.ok ? r.json() : { setler: [] }; }).catch(function () { return { setler: [] }; }),
    fetch('/api/ben', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (sonuc) {
    sonuc[0].setler.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sm btn-ghost';
      b.setAttribute('data-set', s.slug);
      b.textContent = s.baslik;
      filtre.appendChild(b);
    });
    benimAdim = sonuc[1] && sonuc[1].uye.kullanici_adi;
    if (ilkSet && !sonuc[0].setler.some(function (s) { return s.slug === ilkSet; })) ilkSet = '';
    yukle(ilkSet);
  });
})();
