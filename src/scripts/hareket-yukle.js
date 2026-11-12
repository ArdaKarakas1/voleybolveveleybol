/* Hareket paketini sayfa tam yüklendikten sonra ister.
   Paket sayfayla birlikte inerse ilk boyama gecikir, bu yüzden "load" olayı beklenir.
   - prefers-reduced-motion açıkken paket hiç indirilmez.
   - Paket iki iş için istenir:
       1. Ana sayfada bölümler kaydırınca belirir (body üzerinde data-hareket işareti).
       2. Fare ve imleç olan bilgisayarda her sayfada yumuşak kaydırma çalışır (Lenis, hareket.js içinden).
   - Telefonda ve dokunmatik ekranda paket yalnız ana sayfada iner. Lenis dosyası oralarda hiç istenmez. */
const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const anaSayfa = document.body.hasAttribute('data-hareket');
const fareli = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!azHareket && (anaSayfa || fareli)) {
  const basla = () => import('./hareket.js');
  if (document.readyState === 'complete') basla();
  else window.addEventListener('load', basla, { once: true });
}
