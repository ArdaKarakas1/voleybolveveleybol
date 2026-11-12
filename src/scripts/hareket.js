/* Hareket katmanı: ekranın altında kalan bölümler GSAP ve ScrollTrigger ile sırayla belirir.
   Bu dosya hareket-yukle.js üzerinden, sayfa tam yüklendikten sonra istenir.

   Kurallar:
   - Hiçbir içerik bu dosyaya bağlı olarak gizli başlamaz. Dosya yüklenmezse sayfa eksiksiz görünür.
   - Yalnız ekranın altında kalan öğeler gizlenir ve kaydırınca belirir. Zaten görünen hiçbir şeye dokunulmaz.
   - Giriş hareketleri 600 ms'yi geçmez. Site sayfa geçişlerinde @view-transition kullanıyor,
     uzun bir giriş her geçişte yeniden oynayıp yorar.
   - prefers-reduced-motion açıkken bu dosya hiç indirilmez (hareket-yukle.js).
   - ScrollTrigger.refresh() çağrılmaz. Refresh kaydırmayı sıfırlayıp geri koyar ve
     adresteki #bölüm kaydırmasını yarıda keser. Bunun yerine bölümler konumları kesinleşince kurulur. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* Bölümün üstü ekranın bu oranından aşağıdaysa "altta" sayılır ve kaydırınca canlanır. */
const ORAN = 0.85;

function altta(el) {
  return el.getBoundingClientRect().top > window.innerHeight * ORAN;
}

/* Bölümün başlığı ve içindeki öğeler bölüm görününce sırayla belirir.
   Bölüm zaten görünüyorsa olduğu gibi kalır. Canlanan bölümde site.css'teki .reveal yedeğine
   gerek kalmaz, sınıf kaldırılır. Yedek, bu dosya yüklenmediğinde çalışmaya devam eder. */
function bolumuCanlandir(bolum, hedefler, ayar) {
  if (!bolum || !altta(bolum)) return;
  const liste = gsap.utils.toArray(hedefler).filter(Boolean);
  if (!liste.length) return;
  const a = ayar || {};
  bolum.classList.remove('reveal');
  gsap.from(liste, {
    y: a.y || 24,
    opacity: 0,
    duration: 0.45,
    ease: 'power2.out',
    stagger: { amount: a.aralik || 0.15 },
    // Biten animasyon satır içi stilleri bırakır: kartların üzerine gelince yükselme (hover) çalışmaya devam eder.
    clearProps: 'opacity,transform',
    scrollTrigger: { trigger: bolum, start: 'top ' + ORAN * 100 + '%', once: true }
  });
}

const kok = (secici) => document.querySelector(secici);
const baslik = (bolum) => bolum && bolum.querySelector('.section-head');

/* home.js kartları sonradan çizer ve işi bitirince "vvv:icerik" olayını yayınlar.
   Kartlar sayfayı uzatır, aşağıdaki bölümlerin konumu ancak o zaman kesinleşir.
   Bu yüzden bütün bölümler tek geçişte, kartlar çizildikten sonra kurulur. */
let kuruldu = false;
function bolumleriKur() {
  if (kuruldu) return;
  kuruldu = true;

  const sayac = kok('.counter-band');
  if (sayac) {
    bolumuCanlandir(sayac, [
      sayac.querySelector('.counter-head'),
      ...sayac.querySelectorAll('.counter'),
      sayac.querySelector('.counter-foot')
    ], { y: 20 });
  }

  const featured = document.getElementById('featured');
  const son = featured && featured.closest('section');
  if (son) bolumuCanlandir(son, [baslik(son), ...featured.querySelectorAll('.vcard')], { aralik: 0.12 });

  document.querySelectorAll('#rails > section').forEach((raf) => {
    bolumuCanlandir(raf, [baslik(raf), ...raf.querySelectorAll('.rail .vcard')], { aralik: 0.2 });
  });

  const ogren = kok('#ogren');
  if (ogren) bolumuCanlandir(ogren, [baslik(ogren), ...ogren.querySelectorAll('.promo')], { y: 28 });

  const iletisim = kok('#iletisim');
  if (iletisim) bolumuCanlandir(iletisim, [baslik(iletisim), iletisim.querySelector('.panel')], { y: 28 });
}

// Kartlar bu dosyadan önce çizilmiş olabilir (home.js bayrağı); sonra çizilirse olay bekler.
if (window.VVV && window.VVV.icerikHazir) bolumleriKur();
else document.addEventListener('vvv:icerik', bolumleriKur, { once: true });

/* Yumuşak kaydırma (Lenis). Yalnız fare ve imleç olan bilgisayarda çalışır.
   Telefonda ve dokunmatik ekranda tarayıcının kendi kaydırması kalır, Lenis dosyası hiç istenmez.
   - Lenis dinamik import ile ayrı bir parça olarak iner, GSAP parçasına eklenmez.
   - Kaydırmayı GSAP'ın zamanlayıcısı sürer. ScrollTrigger her kaydırmadan haberdar olur.
   - anchors: aynı sayfadaki #bağlantılar Lenis ile kayar. Başlığın üst çubuğun altında kalmaması için
     Lenis, html üzerindeki scroll-padding-top değerini kendisi okur.
   - Mobil menü açıkken kaydırma durdurulur (site.js, window.VVV.lenis).
   - Yatay raflar, mobil menü ve sıralama tablosu kendi kaydırmasını korur. Bu öğelerde data-lenis-prevent
     işareti vardır. Lenis o tekerlek hareketlerine karışmaz.
   - scroll-behavior: smooth ayarına dokunulmaz. Lenis kaydırırken behavior: "instant" kullanır. */
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  import('lenis').then(({ default: Lenis }) => {
    const lenis = new Lenis({ anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.VVV = window.VVV || {};
    window.VVV.lenis = lenis;
    // Menü Lenis hazır olmadan açılmışsa kaydırma şimdi kilitlenir.
    const menu = document.getElementById('mobileNav');
    if (menu && menu.classList.contains('open')) lenis.stop();
  });
}
