/* Hareket paketini sayfa tam yüklendikten sonra ister.
   Paket sayfayla birlikte inerse ilk boyama gecikir, bu yüzden "load" olayı beklenir.
   - prefers-reduced-motion açıkken paket hiç indirilmez.
   - Paket yalnızca hareketi olan sayfalar için istenir (body üzerinde data-hareket işareti). */
const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gerek = document.body.hasAttribute('data-hareket');

if (!azHareket && gerek) {
  const basla = () => import('./hareket.js');
  if (document.readyState === 'complete') basla();
  else window.addEventListener('load', basla, { once: true });
}
