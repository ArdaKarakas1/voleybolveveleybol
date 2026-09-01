/* Voleybol ve Veleybol — ortak site davranışları */
(function () {
  'use strict';

  /* ---------- Tema ---------- */
  var root = document.documentElement;
  var KEY = 'vvv-theme';
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0A1122' : '#FEF6E5');
  }
  try {
    var saved = localStorage.getItem(KEY);
    applyTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  } catch (e) { applyTheme('light'); }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(KEY, next); } catch (err) {}
  });

  /* ---------- Mobil menü ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-menu-toggle]');
    var nav = document.getElementById('mobileNav');
    if (!nav) return;
    if (btn) {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      return;
    }
    if (nav.classList.contains('open') && e.target.closest('#mobileNav a')) {
      nav.classList.remove('open');
      document.body.style.overflow = '';
      var t = document.querySelector('[data-menu-toggle]');
      if (t) t.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- Sticky header gölgesi ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Kaydırıldıkça beliren bölümler ---------- */
  function reveal(scope) {
    if (!('IntersectionObserver' in window)) return; // JS destek yoksa içerik zaten görünür
    root.classList.add('has-reveal');
    var els = (scope || document).querySelectorAll('.reveal:not(.in)');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  window.VVV = window.VVV || {};
  window.VVV.reveal = reveal;
  reveal();

  /* ---------- Sayı biçimlendirme (Türkçe) ---------- */
  var nf = new Intl.NumberFormat('tr-TR');
  function formatNumber(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e6) return nf.format(Math.round(n / 1e5) / 10) + ' Mn';
    if (n >= 10000) return nf.format(Math.round(n / 100) / 10) + ' B';
    return nf.format(n);
  }
  window.VVV.formatNumber = formatNumber;

  function countUp(el, target) {
    if (!isFinite(target)) { el.textContent = '—'; return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = formatNumber(target); return;
    }
    var start = performance.now(), dur = 1100;
    (function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatNumber(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------- Canlı topluluk sayıları ---------- */
  var statEls = document.querySelectorAll('[data-stat]');
  if (statEls.length) {
    fetch('/api/stats', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        var vals = { yt: d.yt, tt: d.tt, ig: d.ig, total: d.total, ytVideos: d.ytVideos };
        statEls.forEach(function (el) {
          var v = vals[el.getAttribute('data-stat')];
          if (v == null) return;
          if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (ents) {
              ents.forEach(function (en) { if (en.isIntersecting) { countUp(el, v); io.disconnect(); } });
            }, { threshold: 0.35 });
            io.observe(el);
          } else { el.textContent = formatNumber(v); }
        });
        var note = document.querySelector('[data-stat-note]');
        if (note) {
          var when = d.updated ? new Date(d.updated) : new Date();
          var extra = (d._meta && d._meta.ig === 'manual') ? ' · Instagram sayısı elle güncelleniyor' : '';
          note.textContent = 'Son güncelleme: ' + when.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) + extra;
        }
      })
      .catch(function () {
        statEls.forEach(function (el) {
          var fb = el.getAttribute('data-fallback');
          el.textContent = fb ? formatNumber(Number(fb)) : '—';
        });
        var note = document.querySelector('[data-stat-note]');
        if (note) note.textContent = 'Son bilinen değerler gösteriliyor (canlı veri alınamadı).';
      });
  }

  /* ---------- Üst menü kimlik alanı ---------- */
  var kimlikAlan = document.querySelector('[data-kimlik]');
  if (kimlikAlan) {
    var mobilNav = document.getElementById('mobileNav');
    var misafir = function () {
      kimlikAlan.innerHTML = '<a class="btn btn-ghost btn-sm" href="/giris/">Giriş yap</a>';
      if (mobilNav) mobilNav.insertAdjacentHTML('beforeend', '<a href="/giris/">Giriş yap</a>');
    };
    fetch('/api/ben', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('misafir'); return r.json(); })
      .then(function (d) {
        var ad = d.uye.kullanici_adi;
        var a = document.createElement('a');
        a.className = 'btn btn-ghost btn-sm';
        a.href = '/profil/';
        a.title = 'Profilim';
        a.textContent = ad;
        kimlikAlan.replaceChildren(a);
        if (mobilNav) {
          var m = document.createElement('a');
          m.href = '/profil/';
          m.textContent = 'Profilim (' + ad + ')';
          mobilNav.appendChild(m);
        }
      })
      .catch(misafir);
  }

  /* ---------- Footer yılı ---------- */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Raf okları ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-rail]');
    if (!btn) return;
    var rail = document.querySelector(btn.getAttribute('data-rail'));
    if (!rail) return;
    var dir = btn.getAttribute('data-dir') === 'prev' ? -1 : 1;
    rail.scrollBy({ left: dir * Math.max(280, rail.clientWidth * 0.8), behavior: 'smooth' });
  });
})();
