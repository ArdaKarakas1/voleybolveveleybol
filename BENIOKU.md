# Voleybol ve Veleybol — site kılavuzu

Bu klasör sitenin tamamı. Netlify'a olduğu gibi yükle, çalışır.

## Dosya yapısı

```
index.html              Ana sayfa
kurallar/index.html     Kurallar sözlüğü (aranabilir)
quiz/index.html         Kural testi
404.html                Bulunamayan sayfa

assets/css/site.css     Tüm tasarım (renk, tipografi, düzen)
assets/js/site.js       Ortak: tema, menü, canlı sayaçlar
assets/js/home.js       Ana sayfadaki video rafları
assets/js/kurallar.js   Kural arama ve filtreleme
assets/js/quiz.js       Test akışı
assets/img/             Logo türevleri + og.jpg (paylaşım görseli)

data/kurallar.json      53 kural maddesi — içerik burada
data/quiz.json          14 test sorusu
data/videos-fallback.json  Sunucu çökerse gösterilecek yedek video listesi

netlify/functions/videos.js  YouTube RSS → kategorili video listesi
netlify/functions/stats.js   Canlı takipçi sayıları
netlify.toml            Yönlendirme, önbellek ve güvenlik başlıkları
```

## Kurulum

Netlify'da site zaten bağlıysa dosyaları değiştirip push etmen yeterli.
Sıfırdan kuruyorsan: Netlify → Add new site → bu klasörü sürükle-bırak.
`netlify.toml` gerisini halleder.

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
