/* Kural testi — soru akışı, açıklamalar, paylaşılabilir sonuç */
(function () {
  'use strict';

  var host = document.getElementById('quizHost');
  if (!host) return;

  var DATA = null, order = [], idx = 0, score = 0, answered = false;
  var KEYS = ['A', 'B', 'C', 'D', 'E'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function start() {
    // Havuzun tamamı karıştırılır, her denemede rastgele bir alt küme gösterilir.
    var n = Math.min(DATA.goster || DATA.sorular.length, DATA.sorular.length);
    order = shuffle(DATA.sorular.map(function (_, i) { return i; })).slice(0, n);
    idx = 0; score = 0; answered = false;
    renderQuestion();
  }

  function renderQuestion() {
    var q = DATA.sorular[order[idx]];
    answered = false;
    host.innerHTML =
      '<div class="quiz-progress"><i style="width:' + ((idx / order.length) * 100) + '%"></i></div>' +
      '<div class="quiz-meta"><span>Soru ' + (idx + 1) + ' / ' + order.length + '</span><span>' + score + ' doğru</span></div>' +
      '<h2 class="quiz-q">' + esc(q.s) + '</h2>' +
      '<div class="quiz-opts" id="opts">' +
      q.o.map(function (opt, i) {
        return '<button class="quiz-opt" type="button" data-i="' + i + '">' +
          '<span class="key">' + KEYS[i] + '</span><span>' + esc(opt) + '</span></button>';
      }).join('') +
      '</div><div id="after"></div>';

    document.getElementById('opts').addEventListener('click', function (e) {
      var b = e.target.closest('.quiz-opt');
      if (!b || answered) return;
      answer(Number(b.getAttribute('data-i')), q);
    });
  }

  function answer(choice, q) {
    answered = true;
    var opts = host.querySelectorAll('.quiz-opt');
    opts.forEach(function (b, i) {
      b.disabled = true;
      if (i === q.d) b.classList.add('correct');
      else if (i === choice) b.classList.add('wrong');
    });
    if (choice === q.d) score++;

    var meta = host.querySelector('.quiz-meta span:last-child');
    if (meta) meta.textContent = score + ' doğru';
    var bar = host.querySelector('.quiz-progress > i');
    if (bar) bar.style.width = (((idx + 1) / order.length) * 100) + '%';

    var last = idx === order.length - 1;
    document.getElementById('after').innerHTML =
      '<div class="quiz-explain"><b>' + (choice === q.d ? 'Doğru. ' : 'Doğru cevap: ' + esc(q.o[q.d]) + '. ') + '</b>' + q.e + '</div>' +
      '<div class="quiz-actions"><button class="btn btn-primary" type="button" id="next">' +
      (last ? 'Sonucu gör' : 'Sonraki soru') + '</button></div>';

    document.getElementById('next').addEventListener('click', function () {
      if (last) { renderResult(); } else { idx++; renderQuestion(); }
    });
  }

  function renderResult() {
    var total = order.length;
    var pct = Math.round((score / total) * 100);
    var band = DATA.sonuclar.filter(function (r) { return score >= r.min; }).pop() || DATA.sonuclar[0];
    var R = 74, C = 2 * Math.PI * R;

    host.innerHTML =
      '<div class="center">' +
      '<div class="score-ring">' +
      '<svg width="168" height="168" viewBox="0 0 168 168" aria-hidden="true">' +
      '<circle cx="84" cy="84" r="' + R + '" fill="none" stroke="var(--surface-2)" stroke-width="13"/>' +
      '<circle cx="84" cy="84" r="' + R + '" fill="none" stroke="var(--accent)" stroke-width="13" stroke-linecap="round" ' +
      'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C - C * score / total) + '" style="transition:stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)"/>' +
      '</svg>' +
      '<div class="val"><b>' + score + '/' + total + '</b><span>%' + pct + '</span></div>' +
      '</div>' +
      '<h2 style="font-size:var(--step-3)">' + esc(band.baslik) + '</h2>' +
      '<p class="text-dim" style="margin-top:12px;max-width:46ch;margin-inline:auto">' + esc(band.metin) + '</p>' +
      '<div class="quiz-actions" style="justify-content:center;margin-top:26px">' +
      '<button class="btn btn-ghost" type="button" id="again">Tekrar dene</button>' +
      '<button class="btn btn-accent" type="button" id="share">Sonucu paylaş</button>' +
      '<a class="btn btn-primary" href="/kurallar/">Kuralları oku</a>' +
      '</div>' +
      '<p class="text-dim" style="margin-top:22px;font-size:14px">Kuralları videoda da anlatıyorum — ' +
      '<a class="link-more" href="https://www.youtube.com/@voleybolveveleybol?sub_confirmation=1" target="_blank" rel="noopener">kanala abone ol →</a></p>' +
      '</div>';

    document.getElementById('again').addEventListener('click', start);
    document.getElementById('share').addEventListener('click', function () {
      var text = 'Voleybol kural testinde ' + score + '/' + total + ' yaptım (%' + pct + '). Sen kaç yaparsın?';
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

  fetch('/data/quiz.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { DATA = d; start(); })
    .catch(function () {
      host.innerHTML = '<div class="empty"><p>Test yüklenemedi. Sayfayı yenilemeyi dene.</p></div>';
    });
})();
