/* Kurallar sözlüğü — arama, kategori filtresi, vurgulama */
(function () {
  'use strict';

  var listEl = document.getElementById('ruleList');
  var catsEl = document.getElementById('ruleCats');
  var searchEl = document.getElementById('ruleSearch');
  var countEl = document.getElementById('ruleCount');
  if (!listEl) return;

  var DATA = { kategoriler: [], maddeler: [] };
  var activeCat = 'hepsi';
  var query = '';

  /* Türkçe duyarlı normalleştirme: İ/ı/ş/ğ/ü/ö/ç farkını yok sayar */
  function norm(s) {
    return String(s || '')
      .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
      .toLowerCase()
      .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Sadece başlıkta vurgula (gövde HTML içerdiği için güvenlik amacıyla dokunmuyoruz) */
  function highlight(text, q) {
    if (!q) return esc(text);
    var nText = norm(text), nQ = norm(q);
    var i = nText.indexOf(nQ);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function matches(item) {
    if (activeCat !== 'hepsi' && item.cat !== activeCat) return false;
    if (!query) return true;
    var q = norm(query);
    var hay = norm(item.q + ' ' + (item.tags || []).join(' ') + ' ' + item.a.replace(/<[^>]+>/g, ' '));
    return q.split(' ').every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function catLabel(id) {
    var c = DATA.kategoriler.find(function (k) { return k.id === id; });
    return c ? c.label : '';
  }

  function renderCats() {
    var counts = { hepsi: DATA.maddeler.length };
    DATA.kategoriler.forEach(function (k) {
      counts[k.id] = DATA.maddeler.filter(function (m) { return m.cat === k.id; }).length;
    });
    var all = [{ id: 'hepsi', label: 'Tümü' }].concat(DATA.kategoriler);
    catsEl.innerHTML = all.map(function (k) {
      return '<button type="button" role="tab" data-cat="' + esc(k.id) + '" aria-selected="' + (k.id === activeCat) + '">' +
        '<span>' + esc(k.label) + '</span><span class="count">' + (counts[k.id] || 0) + '</span></button>';
    }).join('');
  }

  function renderList() {
    var items = DATA.maddeler.filter(matches);
    countEl.textContent = items.length
      ? items.length + ' kural bulundu'
      : '';
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>' +
        '<p><strong>“' + esc(query) + '”</strong> için sonuç yok.</p>' +
        '<p style="margin-top:8px;font-size:14px">Farklı bir kelime dene ya da soruyu bana sor — videoda cevaplayayım.</p>' +
        '<a class="btn btn-ghost btn-sm" style="margin-top:16px" href="https://www.youtube.com/@voleybolveveleybol" target="_blank" rel="noopener">Kanala soru sor</a>' +
        '</div>';
      return;
    }
    var openAll = query.length >= 2;
    listEl.innerHTML = items.map(function (m) {
      return '<details class="rule-item" id="' + esc(m.id) + '"' + (openAll ? ' open' : '') + '>' +
        '<summary><span class="rule-tag">' + esc(catLabel(m.cat)) + '</span>' +
        '<span>' + highlight(m.q, query) + '</span></summary>' +
        '<div class="rule-body">' + m.a +
        ((m.tags && m.tags.length) ? '<div class="kw">' + m.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
        '</div></details>';
    }).join('');
  }

  function render() { renderCats(); renderList(); }

  /* Adres çubuğundaki #kural-adi hedefini aç ve ona kaydır.
     Aktif kategori filtresi veya arama yüzünden hedef listede yoksa, önce filtreyi sıfırlar. */
  function openFromHash() {
    var id = location.hash.replace('#', '');
    if (!id) return;
    var hit = DATA.maddeler.find(function (m) { return m.id === id; });
    if (!hit) return;
    if (!document.getElementById(id)) {
      activeCat = 'hepsi';
      query = '';
      searchEl.value = '';
      render();
    }
    var el = document.getElementById(id);
    if (!el) return;
    el.open = true;
    setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
  }

  /* Olaylar */
  catsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    activeCat = b.getAttribute('data-cat');
    render();
    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  var t;
  searchEl.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      query = searchEl.value.trim();
      var url = new URL(location.href);
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
      renderList();
    }, 140);
  });

  /* Veri yükle */
  fetch('/data/kurallar.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d;
      var params = new URLSearchParams(location.search);
      if (params.get('q')) { query = params.get('q'); searchEl.value = query; }
      if (params.get('kategori')) activeCat = params.get('kategori');
      render();

      openFromHash();
      /* Sayfa zaten açıkken bir kural linkine tıklanırsa da çalışsın */
      window.addEventListener('hashchange', openFromHash);

      /* SSS yapısal verisi — Google'da zengin sonuç için */
      var faq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: d.maddeler.slice(0, 30).map(function (m) {
          return {
            '@type': 'Question',
            name: m.q,
            acceptedAnswer: { '@type': 'Answer', text: m.a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
          };
        })
      };
      var s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(faq);
      document.head.appendChild(s);
    })
    .catch(function () {
      listEl.innerHTML = '<div class="empty"><p>Kurallar yüklenemedi. Sayfayı yenilemeyi dene.</p></div>';
    });
})();
