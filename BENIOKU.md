# Voleybol ve Veleybol — site kılavuzu

Bu klasör sitenin tamamı. Astro ile derlenir, GitHub'a push edilince Netlify
otomatik yayınlar.

## Dosya yapısı

```
src/pages/index.astro          Ana sayfa
src/pages/kurallar/index.astro Kurallar sözlüğü (aranabilir)
src/pages/quiz/index.astro     Kural testi
src/pages/404.astro            Bulunamayan sayfa
src/layouts/Base.astro         Ortak iskelet: head etiketleri, tema, sayfa çatısı
src/components/SiteHeader.astro  Üst menü (aktif bağlantı `active` ile verilir)
src/components/SiteFooter.astro  Alt bilgi (değişken sütun `links` ile verilir)

public/assets/css/site.css     Tüm tasarım (renk, tipografi, düzen)
public/assets/js/site.js       Ortak: tema, menü, canlı sayaçlar
public/assets/js/home.js       Ana sayfadaki video rafları
public/assets/js/kurallar.js   Kural arama ve filtreleme
public/assets/js/quiz.js       Test akışı
public/assets/img/             Logo türevleri + og.jpg (paylaşım görseli)

public/data/kurallar.json      53 kural maddesi — içerik burada
public/data/quiz.json          14 test sorusu
public/data/videos-fallback.json  Sunucu çökerse gösterilecek yedek video listesi

netlify/functions/videos.js    YouTube RSS → kategorili video listesi
netlify/functions/stats.js     Canlı takipçi sayıları
netlify.toml                   Derleme, yönlendirme, önbellek ve güvenlik başlıkları
astro.config.mjs               Astro ayarları
dist/                          Derleme çıktısı — git'e girmez, elle düzenlenmez
```

`public/` altındaki her şey siteye olduğu gibi kopyalanır. `src/` altındakiler
derlenir. Yayınlanan klasör `dist/`.

## Çalıştırma

```
npm install        Bir kez, bağımlılıklar için
npm run dev        Yerel geliştirme sunucusu (localhost:4321, anında yenilenir)
npm run build      dist/ üretir
npm run preview    dist/ içeriğini yerelde servis eder
```

`npm run dev` sırasında `/api/*` uçları çalışmaz — o istekler 404 döner ve
sayfa yedek değerlere düşer. Bu beklenen davranış; canlıda fonksiyonlar devrede.

## Yayınlama

```
.\yayinla.ps1 "ne degistirdigini yaz"
```

Bu betik değişiklikleri commit'leyip push eder; Netlify derlemeyi kendisi yapar.
**Netlify paneline sürükle-bırak ile deploy etme** — Git bağlantısını koparır.

## Veritabanı (Neon Postgres)

Üyelik ve skor altyapısı Neon'daki `voleybolveveleybol` projesinde
(`curly-bonus-62218411`, Frankfurt). Bağlantı `.env.local` içindeki
`DATABASE_URL` ile — bu dosya git'e girmez, `neon link` yeniden üretir.

```
db/migrations/*.sql    Şema değişiklikleri, numara sırasıyla uygulanır
db/migrate.mjs         Göç çalıştırıcısı (uygulananları _gocler'de izler)
db/sorular/*.json      Soruların kaynağı — sorular REPODA yaşar
db/seed.mjs            Soruları veritabanına senkronlar (tekrar çalıştırmak güvenli)
```

```
npm run db:migrate     Bekleyen göçleri uygula
npm run db:seed        db/sorular/ içeriğini veritabanına yaz
```

Kurallar:
- Uygulanmış bir göç dosyasını düzenleme; değişiklik = yeni numaralı dosya.
- Soru eklemek/düzenlemek için `db/sorular/*.json` dosyasını değiştir,
  `npm run db:seed` çalıştır. Doğru cevaplar (`dogru_index`) yalnızca burada
  ve veritabanında durur — tarayıcıya gönderilecek hiçbir dosyaya koyma.
- Dosyadan silinen soru veritabanından silinmez (geçmiş denemeler ona bağlı);
  seed uyarı verir, karar elle verilir.

## Yeni sayfa eklemek

`src/pages/` altına bir `.astro` dosyası koy, `Base` şablonunu kullan:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Sayfa başlığı" description="..." path="/adres/" active="menuAnahtari">
  <main id="main">…</main>
</Base>
```

Dosya yolu adres olur: `src/pages/siralama/index.astro` → `/siralama/`.
Header ve footer kendiliğinden gelir.

## Videolar nasıl güncelleniyor?

**Hiçbir şey yapmana gerek yok.** `/api/videos` kanalın herkese açık RSS akışını
okur, son videoları çeker ve kategorilere ayırır. API anahtarı gerekmez.

### Kategorilendirmeyi kesinleştirmek (önerilir)

Şu an kategori, video başlığındaki anahtar kelimelerden tahmin ediliyor —
çoğu zaman doğru, ama garanti değil. Kesin sonuç için YouTube'da üç oynatma
listesi aç ve id'lerini Netlify'da ortam değişkeni olarak gir:

| Değişken | Karşılığı |
|---|---|
| `YT_PL_ANLATIM` | "Voleybol Anlatımları" oynatma listesi id'si |
| `YT_PL_ANALIZ` | "Maç Analizi & Haber" oynatma listesi id'si |
| `YT_PL_EGLENCE` | "Eğlence & Shorts" oynatma listesi id'si |

Oynatma listesi id'si, liste URL'sindeki `list=` sonrasındaki `PL...` ile başlayan koddur.

Bundan sonra bir videoyu hangi listeye eklersen sitede o rafta çıkar. Tahmin
devre dışı kalır.

### Yeni kategori eklemek

`netlify/functions/videos.js` içindeki `CATEGORIES` dizisine bir satır ekle:
id, ekranda görünecek `label`, kısa `blurb`, istersen `playlistId` ve
anahtar kelimeler. Ana sayfa rafı kendiliğinden oluşur.

## Takipçi sayıları

`/api/stats` üç kaynağı ayrı ayrı dener; biri düşerse diğerleri canlı kalır,
düşen kaynak son bilinen değeri gösterir.

| Değişken | Ne işe yarar |
|---|---|
| `YT_API_KEY` | *(isteğe bağlı)* YouTube Data API anahtarı. Girersen abone sayısı kazıma yerine resmî API'den gelir — çok daha güvenilir. |
| `IG_FOLLOWERS` | Instagram takipçi sayısı. Instagram otomatik okumayı engelliyor, bu sayıyı ara ara elle güncellemen gerekir. |
| `YT_FALLBACK`, `TT_FALLBACK` | Canlı okuma başarısız olursa gösterilecek son bilinen değerler. |
| `YT_CHANNEL_ID` | Kanal id'si (varsayılan zaten doğru: `UCLIkp2xtSnvDl4EftiZuGJA`). |

Netlify'da: Site settings → Environment variables.

## Kural eklemek / düzeltmek

`data/kurallar.json` içindeki `maddeler` dizisine yeni bir nesne ekle:

```json
{
  "id": "benzersiz-kisa-ad",
  "cat": "vurus",
  "q": "Sorunun başlığı?",
  "a": "<p>Cevap. HTML kullanabilirsin.</p>",
  "tags": ["arama", "için", "kelimeler"]
}
```

`cat` değeri dosyanın başındaki `kategoriler` listesindeki id'lerden biri olmalı.
Her maddeye `/kurallar/#benzersiz-kisa-ad` şeklinde doğrudan link verilebilir —
video açıklamalarında bunu kullan.

**Önemli:** Kural bilgileri FIVB 2025–2028 resmî oyun kurallarına göre
doğrulandı. Yeni madde eklerken kaynağını kontrol et; yanlış kural bilgisi
kanalın güvenilirliğine zarar verir.

## Test sorusu eklemek

`data/quiz.json` → `sorular` dizisi. `d` alanı doğru cevabın **sıfırdan başlayan
sırasıdır** (ilk şık = 0). `sonuclar` dizisindeki `min` eşiklerini soru sayısını
değiştirdiğinde güncellemeyi unutma.

## Renkleri değiştirmek

`assets/css/site.css` en üstteki `:root` bloğu. Tüm site oradaki değişkenlerden
besleniyor; bir rengi değiştirince her yerde değişir. Karanlık tema için
`:root[data-theme="dark"]` bloğu.

## Yerelde denemek

```bash
npx netlify dev     # fonksiyonlar da çalışır
# veya sadece arayüz için:
python3 -m http.server 8000
```

İkincisinde `/api/*` çalışmaz; site otomatik olarak `data/videos-fallback.json`
dosyasına ve yedek sayılara düşer — bu davranış bilinçli.
