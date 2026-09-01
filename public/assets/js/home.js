/* Ana sayfa — YouTube içeriklerini /api/videos üzerinden çeker ve raflara dizer. */
(function () {
  'use strict';

  var featured = document.getElementById('featured');
  var railsHost = document.getElementById('rails');
  if (!featured || !railsHost) return;

  var PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function relTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'bugün';
    if (days === 1) return 'dün';
    if (days < 7) return days + ' gün önce';
    if (days < 30) return Math.floor(days / 7) + ' hafta önce';
    if (days < 365) return Math.floor(days / 30) + ' ay önce';
    return Math.floor(days / 365) + ' yıl önce';
  }

  function isFresh(iso) {
    var d = new Date(iso);
    return !isNaN(d) && (Date.now() - d.getTime()) < 14 * 86400000;
  }

  function card(v, opts) {
    opts = opts || {};
    var chip = opts.chipLabel || (isFresh(v.published) ? 'Yeni' : '');
    var chipClass = (opts.chipLabel || isFresh(v.published)) ? (isFresh(v.published) ? 'chip new' : 'chip') : '';
    var meta = [relTime(v.published)];
    if (v.views) meta.push(window.VVV.formatNumber(v.views) + ' izlenme');
    return '<a class="vcard' + (opts.hero ? ' is-hero' : '') + '" ' +
      'href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener" ' +
      'aria-label="' + esc(v.title) + ' — YouTube\'da izle">' +
      '<img src="' + esc(v.thumb) + '" alt="" loading="' + (opts.hero ? 'eager' : 'lazy') + '" decoding="async" width="480" height="270" ' +
      'onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg\'">' +
      (chip ? '<span class="' + chipClass + '">' + esc(chip) + '</span>' : '') +
      '<span class="play">' + PLAY_ICON + '</span>' +
      '<span class="body"><span class="title">' + esc(v.title) + '</span>' +
      '<span class="meta">' + esc(meta.filter(Boolean).join(' · ')) + '</span></span></a>';
  }

  function renderFeatured(videos) {
    var top = videos.slice(0, 3);
    if (!top.length) { featured.innerHTML = ''; return; }
    featured.innerHTML =
      card(top[0], { hero: true, chipLabel: 'Son yüklenen' }) +
      '<div class="feature-side">' + top.slice(1).map(function (v) { return card(v); }).join('') + '</div>';
  }

  function renderRails(data) {
    var html = '';
    data.categories.forEach(function (cat, i) {
      var items = data.videos.filter(function (v) { return v.category === cat.id; }).slice(0, 12);
      if (!items.length) return;
      var railId = 'rail-' + cat.id;
      html +=
        '<section class="section reveal" id="' + esc(cat.id) + '">' +
        '<div class="shell">' +
        '<div class="section-head">' +
        '<div><h2>' + esc(cat.label) + '</h2><p>' + esc(cat.blurb) + ' · ' + items.length + ' video</p></div>' +
        '<div class="side">' +
        '<div class="rail-nav">' +
        '<button class="icon-btn" data-rail="#' + railId + '" data-dir="prev" aria-label="Geri kaydır"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<button class="icon-btn" data-rail="#' + railId + '" data-dir="next" aria-label="İleri kaydır"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
        '</div>' +
        '<a class="link-more" href="' + esc(data.channelUrl || 'https://www.youtube.com/@voleybolveveleybol') + '/videos" target="_blank" rel="noopener">Tümü →</a>' +
        '</div></div>' +
        '<div class="rail" id="' + railId + '">' + items.map(function (v) { return card(v); }).join('') + '</div>' +
        '</div></section>';
    });
    railsHost.innerHTML = html;
    if (window.VVV && window.VVV.reveal) window.VVV.reveal(railsHost);
  }

  function render(data) {
    if (!data || !data.videos || !data.videos.length) {
      featured.innerHTML = '<div class="panel center" style="grid-column:1/-1">' +
        '<p class="text-dim">Videolar şu anda yüklenemedi. ' +
        '<a class="link-more" href="https://www.youtube.com/@voleybolveveleybol" target="_blank" rel="noopener">YouTube kanalına git →</a></p></div>';
      railsHost.innerHTML = '';
      return;
    }
    renderFeatured(data.videos);
    renderRails(data);
  }

  fetch('/api/videos')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(render)
    .catch(function () {
      // Sunucu fonksiyonu çalışmıyorsa statik yedeğe düş
      return fetch('/data/videos-fallback.json').then(function (r) { return r.json(); }).then(render);
    })
    .catch(function () { render(null); });
})();
