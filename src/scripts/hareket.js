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
