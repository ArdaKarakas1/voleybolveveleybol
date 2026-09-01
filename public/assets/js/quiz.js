/* Kural testi — sunucu puanlamalı akış.
   Sorular /api/deneme-basla'dan CEVAPSIZ gelir; doğruluk kararı ve açıklama
   her cevaptan sonra /api/deneme-cevap'tan döner. Skor sunucuda kesinleşir. */
(function () {
  'use strict';

  var host = document.getElementById('quizHost');
  if (!host) return;

  var SET_SLUG = 'genel-kural-testi';
  var KEYS = ['A', 'B', 'C', 'D', 'E'];
  var BANTLAR = [
    { min: 0, oran: 0, baslik: 'Isınma turu', metin: 'Temelleri tekrar etmenin tam zamanı. Kurallar sözlüğünü bir tur oku, sonra teste yeniden gir — fark net olacak.' },
    { oran: 0.5, baslik: 'Saha bilgisi iyi', metin: 'Oyunu takip ediyorsun ve çoğu kuralı biliyorsun. Detaylarda birkaç açık var; sözlükteki "Vuruşlar ve hatalar" ile "File, çizgiler, top" bölümlerine göz at.' },
    { oran: 0.85, baslik: 'Hakem gibisin', metin: 'Kuralları gerçekten biliyorsun — 2025-28 değişikliklerini bile. Bu skoru arkadaşlarına at, kaçı senin kadar yapabiliyor görelim.' }
  ];

  var denemeId = null, sorular = [], idx = 0, score = 0, answered = false, gonderiliyor = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function api(uc, govde) {
    return fetch('/api/' + uc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(govde || {})
    }).then(function (r) {
      return r.json().then(function (j) { return { durum: r.status, j: j }; });
    });
  }

  function sureBicimle(sn) {
    var d = Math.floor(sn / 60), s = sn % 60;
    return d + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------- ekranlar ---------- */

  function girisDaveti() {
    host.innerHTML =
      '<div class="center" style="padding:24px 0">' +
      '<h2 style="font-size:var(--step-2)">Skorun kaydedilsin</h2>' +
      '<p class="text-dim" style="margin-top:12px;max-width:44ch;margin-inline:auto">' +
      'Testi çözmek için ücretsiz bir hesap yeter. Skorların kaydedilir, sıralamada yerini görürsün.</p>' +
      '<div class="quiz-actions" style="justify-content:center;margin-top:24px">' +
      '<a class="btn btn-primary" href="/giris/?donus=/quiz/">Giriş yap</a>' +
      '<a class="btn btn-ghost" href="/kayit/?donus=/quiz/">Kayıt ol</a>' +
      '</div>' +
      '<p class="text-dim" style="margin-top:18px;font-size:14px">Google hesabınla tek tıkla girebilirsin.</p>' +
      '</div>';
  }

  function hataEkrani(mesaj, tekrarDene) {
    host.innerHTML =
      '<div class="empty"><p>' + esc(mesaj) + '</p>' +
      (tekrarDene ? '<div class="quiz-actions" style="justify-content:center;margin-top:18px">' +
        '<button class="btn btn-primary" type="button" id="tekrar">Yeni test başlat</button></div>' : '') +
      '</div>';
    if (tekrarDene) document.getElementById('tekrar').addEventListener('click', basla);
  }

  function basla() {
    host.innerHTML = '<div class="empty">Test hazırlanıyor…</div>';
    api('deneme-basla', { set_slug: SET_SLUG }).then(function (s) {
      if (s.durum === 401) { girisDaveti(); return; }
      if (s.durum !== 200) { hataEkrani(s.j.hata || 'Test başlatılamadı.', true); return; }
      denemeId = s.j.deneme_id;
      sorular = s.j.sorular;
      idx = 0; score = 0; answered = false;
      renderQuestion();
    }).catch(function () { hataEkrani('Sunucuya ulaşılamadı. Bağlantını kontrol et.', true); });
  }

  function renderQuestion() {
    var q = sorular[idx];
    answered = false;
    host.innerHTML =
      '<div class="quiz-progress"><i style="width:' + ((idx / sorular.length) * 100) + '%"></i></div>' +
      '<div class="quiz-meta"><span>Soru ' + (idx + 1) + ' / ' + sorular.length + '</span><span>' + score + ' doğru</span></div>' +
      '<h2 class="quiz-q">' + esc(q.metin) + '</h2>' +
      '<div class="quiz-opts" id="opts">' +
      q.secenekler.map(function (opt, i) {
        return '<button class="quiz-opt" type="button" data-i="' + i + '">' +
          '<span class="key">' + KEYS[i] + '</span><span>' + esc(opt) + '</span></button>';
      }).join('') +
      '</div><div id="after"></div>';

    document.getElementById('opts').addEventListener('click', function (e) {
      var b = e.target.closest('.quiz-opt');
      if (!b || answered || gonderiliyor) return;
      cevapla(Number(b.getAttribute('data-i')), q);
    });
  }

  function cevapla(secilen, q) {
    gonderiliyor = true;
    var opts = host.querySelectorAll('.quiz-opt');
    opts.forEach(function (b) { b.disabled = true; });

    api('deneme-cevap', { deneme_id: denemeId, sira: q.sira, secilen: secilen }).then(function (s) {
      gonderiliyor = false;
      if (s.durum === 410) { hataEkrani('Süre doldu — soru başına ortalama 1 dakika var. Yeni bir test başlatabilirsin.', true); return; }
      if (s.durum !== 200) {
        opts.forEach(function (b) { b.disabled = false; });
        hataUyarisi(s.j.hata || 'Cevap kaydedilemedi, tekrar dene.');
        return;
      }
      answered = true;
      opts.forEach(function (b, i) {
        if (i === s.j.dogru_index) b.classList.add('correct');
        else if (i === secilen) b.classList.add('wrong');
      });
      if (s.j.dogru_mu) score++;

      var meta = host.querySelector('.quiz-meta span:last-child');
      if (meta) meta.textContent = score + ' doğru';
      var bar = host.querySelector('.quiz-progress > i');
      if (bar) bar.style.width = (((idx + 1) / sorular.length) * 100) + '%';

      var last = idx === sorular.length - 1;
      document.getElementById('after').innerHTML =
        '<div class="quiz-explain"><b>' + (s.j.dogru_mu ? 'Doğru. ' : 'Doğru cevap: ' + esc(q.secenekler[s.j.dogru_index]) + '. ') + '</b>' + s.j.aciklama + '</div>' +
        '<div class="quiz-actions"><button class="btn btn-primary" type="button" id="next">' +
        (last ? 'Sonucu gör' : 'Sonraki soru') + '</button></div>';

      document.getElementById('next').addEventListener('click', function () {
        if (last) { bitir(); } else { idx++; renderQuestion(); }
      });
    }).catch(function () {
      gonderiliyor = false;
      opts.forEach(function (b) { b.disabled = false; });
      hataUyarisi('Sunucuya ulaşılamadı, tekrar dene.');
    });
  }

  function hataUyarisi(mesaj) {
    var after = document.getElementById('after');
    if (after) after.innerHTML = '<div class="quiz-explain">' + esc(mesaj) + '</div>';
  }

  function bitir() {
    host.innerHTML = '<div class="empty">Sonuç kaydediliyor…</div>';
    api('deneme-bitir', { deneme_id: denemeId }).then(function (s) {
      if (s.durum === 410) { hataEkrani('Süre doldu — bu deneme sıralamaya girmez. Yeni bir test başlatabilirsin.', true); return; }
      if (s.durum !== 200) { hataEkrani(s.j.hata || 'Sonuç kaydedilemedi.', true); return; }
      renderResult(s.j.puan, s.j.toplam, s.j.sure_sn);
    }).catch(function () { hataEkrani('Sunucuya ulaşılamadı.', true); });
  }

  function renderResult(puan, toplam, sureSn) {
    var pct = Math.round((puan / toplam) * 100);
    var band = BANTLAR[0];
    for (var i = 0; i < BANTLAR.length; i++) if (puan / toplam >= BANTLAR[i].oran) band = BANTLAR[i];
    var R = 74, C = 2 * Math.PI * R;

    host.innerHTML =
      '<div class="center">' +
      '<div class="score-ring">' +
      '<svg width="168" height="168" viewBox="0 0 168 168" aria-hidden="true">' +
      '<circle cx="84" cy="84" r="' + R + '" fill="none" stroke="var(--surface-2)" stroke-width="13"/>' +
      '<circle cx="84" cy="84" r="' + R + '" fill="none" stroke="var(--accent)" stroke-width="13" stroke-linecap="round" ' +
      'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C - C * puan / toplam) + '" style="transition:stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)"/>' +
      '</svg>' +
      '<div class="val"><b>' + puan + '/' + toplam + '</b><span>%' + pct + '</span></div>' +
      '</div>' +
      '<h2 style="font-size:var(--step-3)">' + esc(band.baslik) + '</h2>' +
      '<p class="text-dim" style="margin-top:12px;max-width:46ch;margin-inline:auto">' + esc(band.metin) + '</p>' +
      '<p class="text-dim" style="margin-top:10px;font-size:14px">Süre: ' + sureBicimle(sureSn) + ' · Skorun kaydedildi</p>' +
      '<div class="quiz-actions" style="justify-content:center;margin-top:26px">' +
      '<a class="btn btn-accent" href="/siralama/">Sıralamaya bak</a>' +
      '<button class="btn btn-ghost" type="button" id="again">Tekrar dene</button>' +
      '<button class="btn btn-primary" type="button" id="share">Sonucu paylaş</button>' +
      '</div>' +
      '<p class="text-dim" style="margin-top:22px;font-size:14px">Kuralları videoda da anlatıyorum — ' +
      '<a class="link-more" href="https://www.youtube.com/@voleybolveveleybol?sub_confirmation=1" target="_blank" rel="noopener">kanala abone ol →</a></p>' +
      '</div>';

    document.getElementById('again').addEventListener('click', basla);
    document.getElementById('share').addEventListener('click', function () {
      var text = 'Voleybol kural testinde ' + puan + '/' + toplam + ' yaptım (%' + pct + '). Sen kaç yaparsın?';
      var url = 'https://voleybolveveleybol.com/quiz/';
      if (navigator.share) {
        navigator.share({ title: 'Voleybol Kural Testi', text: text, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text + ' ' + url).then(function () {
          var b = document.getElementById('share');
          var old = b.textContent;
          b.textContent = 'Kopyalandı ✓';
          setTimeout(function () { b.textContent = old; }, 2000);
        });
      }
    });
  }

  /* ---------- açılış: üye mi kontrol et ---------- */
  fetch('/api/ben', { cache: 'no-store' })
    .then(function (r) { if (r.ok) { basla(); } else { girisDaveti(); } })
    .catch(function () { hataEkrani('Sunucuya ulaşılamadı. Sayfayı yenilemeyi dene.', false); });
})();
