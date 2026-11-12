/* Ana sayfa — YouTube içeriklerini /api/videos üzerinden çeker ve raflara dizer. */
(function () {
  'use strict';

  var featured = document.getElementById('featured');
  var railsHost = document.getElementById('rails');
  if (!featured || !railsHost) return;

  var PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z"/></svg>';

  /* "Son içerik" bölümünün dikey düzeni (en az bir Shorts varsa kullanılır):
       'a' = eşit boy, 'b' = büyük ilk kart.
     Önizlemede ikisini karşılaştırmak için adrese ?duzen=a ya da ?duzen=b eklenebilir. */
  var SON_ICERIK_DUZEN = 'a';
  /* Geniş ekranda dört sütun var: Shorts bir, uzun video iki sütun kaplar. */
  var SON_ICERIK_SUTUN = 4;
  /* Bundan dar bir kapak, YouTube'un var olmayan kapak için döndüğü 120x90 boş resimdir. */
  var EN_AZ_KAPAK_GENISLIGI = 200;

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

  /* Shorts kapağı dikeydir. Sırayla denenir: oar2.webp, oar2.jpg, hqdefault.jpg.
     Son basamak her videoda vardır; dikey kartta kapağın ortası görünür. */
  function kapakAdresi(id, adim) {
    return [
      'https://i.ytimg.com/vi_webp/' + id + '/oar2.webp',
      'https://i.ytimg.com/vi/' + id + '/oar2.jpg',
      'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'
    ][adim];
  }

  /* opts.yatay: Shorts olsa bile kartı yatay çiz (eski "Son içerik" düzeni için). */
  function card(v, opts) {
    opts = opts || {};
    var dikey = v.short === true && !opts.yatay;
    var chip = opts.chipLabel || (isFresh(v.published) ? 'Yeni' : '');
    var chipClass = (opts.chipLabel || isFresh(v.published)) ? (isFresh(v.published) ? 'chip new' : 'chip') : '';
    var meta = [relTime(v.published)];
    if (v.views) meta.push(window.VVV.formatNumber(v.views) + ' izlenme');
    var kapak = dikey ? kapakAdresi(v.id, 0) : (v.thumb || 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg');
    return '<a class="vcard' + (opts.hero ? ' is-hero' : '') + (dikey ? ' is-short' : '') + '" ' +
      'href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener" ' +
      'aria-label="' + esc(v.title) + ' — YouTube\'da izle">' +
      '<img src="' + esc(kapak) + '" alt="" loading="' + (opts.hero && !dikey ? 'eager' : 'lazy') + '" decoding="async" ' +
      'width="' + (dikey ? 270 : 480) + '" height="' + (dikey ? 480 : 270) + '" ' +
      'data-vid="' + esc(v.id) + '"' + (dikey ? ' data-adim="0"' : '') + '>' +
      (chip ? '<span class="' + chipClass + '">' + esc(chip) + '</span>' : '') +
      '<span class="play">' + PLAY_ICON + '</span>' +
      '<span class="body"><span class="title">' + esc(v.title) + '</span>' +
      '<span class="meta">' + esc(meta.filter(Boolean).join(' · ')) + '</span></span></a>';
  }

  function duzenSec() {
    var m = /[?&]duzen=([ab])(?:&|$)/.exec(window.location.search);
    return m ? m[1] : SON_ICERIK_DUZEN;
  }

  /* Dikey düzende kaç video gösterileceği: sütun sayısı dolana kadar, sırayı bozmadan. */
  function sonIcerikSec(videos) {
    var secilen = [];
    var kullanilan = 0;
    for (var i = 0; i < videos.length; i++) {
      var agirlik = videos[i].short === true ? 1 : 2;
      if (kullanilan + agirlik > SON_ICERIK_SUTUN) break;
      secilen.push(videos[i]);
      kullanilan += agirlik;
    }
    return secilen;
  }

  /* Bugünkü düzen: bir büyük, iki küçük yatay kart. Shorts bilgisi yoksa (akış okunamadıysa) bu çizilir. */
  function renderFeaturedYatay(videos) {
    var top = videos.slice(0, 3);
    if (!top.length) { featured.innerHTML = ''; return; }
    featured.className = 'feature-grid';
    featured.innerHTML =
      card(top[0], { hero: true, yatay: true, chipLabel: 'Son yüklenen' }) +
      '<div class="feature-side">' + top.slice(1).map(function (v) { return card(v, { yatay: true }); }).join('') + '</div>';
  }

  function renderFeatured(videos) {
    var secilen = sonIcerikSec(videos);
    var dikeyVar = secilen.some(function (v) { return v.short === true; });
    if (!dikeyVar) { renderFeaturedYatay(videos); return; }
    var duzen = duzenSec();
    featured.className = 'son-icerik son-' + duzen;
    featured.innerHTML = secilen.map(function (v, i) {
      /* B düzeninde büyük kart yalnız Shorts içindir; ilk video uzunsa A'daki gibi yatay çizilir. */
      return card(v, { hero: duzen === 'b' && i === 0 && v.short === true, chipLabel: i === 0 ? 'Son yüklenen' : '' });
    }).join('');
  }

  function renderRails(data) {
    var html = '';
    data.categories.forEach(function (cat, i) {
      var items = data.videos.filter(function (v) { return v.category === cat.id; }).slice(0, 12);
      if (!items.length) return;
      var railId = 'rail-' + cat.id;
      /* Rafta en az bir Shorts varsa kartlar aynı yükseklikte dizilir; yoksa raf eski düzende kalır. */
      var dikeyRaf = items.some(function (v) { return v.short === true; });
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
        '<div class="rail' + (dikeyRaf ? ' rail-dikey' : '') + '" id="' + railId + '" data-lenis-prevent-horizontal>' + items.map(function (v) { return card(v); }).join('') + '</div>' +
        '</div></section>';
    });
    railsHost.innerHTML = html;
    if (window.VVV && window.VVV.reveal) window.VVV.reveal(railsHost);
  }

  /* Küçük resim yedeği. CSP satır içi onerror'a izin vermediği için dinleyiciyle bağlanır.
     Dikey kapak (data-adim var) üç basamaktır: oar2.webp, oar2.jpg, hqdefault.jpg.
     Yatay kartın tek yedeği hqdefault.jpg'dir. */
  function sonrakiKapak(img) {
    var vid = img.getAttribute('data-vid');
    if (!vid) return;
    var adim = img.getAttribute('data-adim');
    if (adim === null) {
      img.removeAttribute('data-vid'); // ikinci hata döngü yaratmasın
      img.src = 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg';
      return;
    }
    var sonraki = Number(adim) + 1;
    if (sonraki > 2) { img.removeAttribute('data-vid'); return; } // son basamak, başka yedek yok
    img.setAttribute('data-adim', String(sonraki));
    img.src = kapakAdresi(vid, sonraki);
  }

  function resimYedegiBagla(kok) {
    kok.querySelectorAll('img[data-vid]').forEach(function (img) {
      img.addEventListener('error', function () { sonrakiKapak(img); });
      if (img.getAttribute('data-adim') !== null) {
        /* YouTube var olmayan dikey kapak için 404 ile 120x90 boş bir resim döner.
           Tarayıcı bunu hata saymaz; "load" olayında genişliğe bakılır. */
        img.addEventListener('load', function () {
          if (img.naturalWidth && img.naturalWidth < EN_AZ_KAPAK_GENISLIGI) sonrakiKapak(img);
        });
      }
    });
  }

  function render(data) {
    if (!data || !data.videos || !data.videos.length) {
      featured.className = 'feature-grid';
      featured.innerHTML = '<div class="panel center" style="grid-column:1/-1">' +
        '<p class="text-dim">Videolar şu anda yüklenemedi. ' +
        '<a class="link-more" href="https://www.youtube.com/@voleybolveveleybol" target="_blank" rel="noopener">YouTube kanalına git →</a></p></div>';
      railsHost.innerHTML = '';
      icerikHazir(); // içerik gelmese de sayfa düzeni burada kesinleşir
      return;
    }
    renderFeatured(data.videos);
    renderRails(data);
    resimYedegiBagla(featured);
    resimYedegiBagla(railsHost);
    icerikHazir();
  }

  /* Kartlar çizilince hareket katmanı haberdar edilir (src/scripts/hareket.js).
     Katman bu olaydan sonra yüklenirse VVV.icerikHazir bayrağına bakar. */
  function icerikHazir() {
    window.VVV = window.VVV || {};
    window.VVV.icerikHazir = true;
    document.dispatchEvent(new CustomEvent('vvv:icerik'));
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
