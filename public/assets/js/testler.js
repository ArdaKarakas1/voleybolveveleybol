/* Testler sayfası — üyeyse kartlara kendi en iyi skorlarını işler. */
(function () {
  'use strict';

  var kartlar = document.querySelectorAll('[data-set-slug]');
  if (!kartlar.length) return;

  fetch('/api/setler', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (d) {
      d.setler.forEach(function (s) {
        if (s.en_iyi_puan == null) return;
        var kart = document.querySelector('[data-set-slug="' + s.slug + '"]');
        var rozet = kart && kart.querySelector('[data-set-skor]');
        if (!rozet) return;
        rozet.textContent = 'En iyin: ' + s.en_iyi_puan + '/' + s.en_iyi_toplam;
        rozet.hidden = false;
      });
    })
    .catch(function () { /* misafir veya hata — kartlar skorsuz kalır */ });
})();
