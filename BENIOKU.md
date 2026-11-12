# Voleybol ve Veleybol: site kılavuzu

Bu klasör sitenin tamamı. Astro ile derlenir ve Netlify yayınlar. Değişiklikler önce `gelistirme` dalında hazırlanır, PR üzerinden önizlenir ve sen "yayınla" deyince canlıya çıkar. Claude oturumlarının uyacağı kurallar `CLAUDE.md` dosyasındadır.

## Dosya yapısı

```
src/pages/index.astro            Ana sayfa
src/pages/kurallar/index.astro   Kurallar sözlüğü (aranabilir)
src/pages/testler/index.astro    Kural testi setlerinin listesi
src/pages/testler/[slug].astro   Her test setinin sayfası (db/sorular/*.json dosyalarından üretilir)
src/pages/siralama.astro         Skor tablosu
src/pages/giris.astro, kayit.astro, profil.astro,
  sifre-unuttum.astro, sifre-yenile.astro   Üyelik sayfaları
src/pages/gizlilik.astro, kvkk.astro        Gizlilik ve KVKK metinleri
src/pages/404.astro              Bulunamayan sayfa
src/layouts/Base.astro           Ortak iskelet: head etiketleri, tema, sayfa çatısı
src/components/SiteHeader.astro  Üst menü (aktif bağlantı `active` ile verilir)
src/components/SiteFooter.astro  Alt bilgi (değişken sütun `links` ile verilir)
src/components/GoogleGiris.astro Google ile giriş düğmesi
src/scripts/hareket-yukle.js     Hareket paketini sayfa yüklendikten sonra ister
src/scripts/hareket.js           Bölümlerin belirmesi (GSAP) ve yumuşak kaydırma (Lenis)

public/assets/css/site.css       Tüm tasarım (renk, tipografi, düzen)
public/assets/js/site.js         Ortak: tema, menü, canlı sayaçlar
public/assets/js/home.js         Ana sayfadaki video kartları ve raflar
public/assets/js/kurallar.js     Kural arama ve filtreleme
public/assets/js/testler.js      Test seti listesi
public/assets/js/quiz.js         Test akışı ve sonuç ekranı
public/assets/js/siralama.js     Skor tablosu
public/assets/js/kimlik.js       Giriş ve kayıt
public/assets/js/profil.js       Profil sayfası
public/assets/js/sifre.js        Şifre unuttum ve şifre yenile
public/assets/img/               Logo türevleri + og.jpg (paylaşım görseli)

public/data/kurallar.json        53 kural maddesi, 11 kategori: içerik burada
public/data/videos-fallback.json Sunucu çökerse gösterilecek yedek video listesi
public/sitemap.xml               Elle yazılan site haritası (13 adres)

db/migrations/*.sql              Veritabanı şeması (0001'den 0005'e)
db/sorular/*.json                Test setleri ve soruları (7 set, 115 soru)
db/migrate.mjs, db/seed.mjs      Göç ve soru yükleme betikleri

netlify/functions/*.js           19 sunucu fonksiyonu, adresleri /api/<ad>
netlify/functions/_ortak/        Fonksiyonların ortak yardımcıları
netlify.toml                     Derleme, yönlendirme, önbellek ve güvenlik başlıkları
astro.config.mjs                 Astro ayarları
CLAUDE.md                        Claude oturumlarının uyacağı kurallar
dist/                            Derleme çıktısı: git'e girmez, elle düzenlenmez
```

`public/` altındaki her şey siteye olduğu gibi kopyalanır. `src/` altındakiler derlenir. Yayınlanan klasör `dist/`.

## Çalıştırma

```
npm install        Bir kez, bağımlılıklar için (npm ci de çalışır)
npm run dev        Yerel geliştirme sunucusu (localhost:4321, anında yenilenir)
npm run build      dist/ üretir
npm run preview    dist/ içeriğini yerelde servis eder
```

`npm run dev` sırasında `/api/*` uçları çalışmaz. O istekler 404 döner ve sayfa yedek değerlere düşer. Bu beklenen davranıştır. Canlıda fonksiyonlar devrede.

## Yayınlama

Her canlı yayın 15 Netlify kredisi harcar ve ücretsiz plan ayda 300 kredi verir. Bu yüzden iş iki aşamada yürür. Önce dalda hazırlanır ve önizlenir (kredi harcamaz), sonra tek seferde canlıya çıkar.

1. Değişiklikler `gelistirme` dalında yapılır. Dala push etmek kredi harcamaz.
2. GitHub'da `gelistirme` dalından `main` dalına bir PR (Pull Request) açılır. Netlify birkaç dakika içinde PR'a bir önizleme linki yazar: `https://deploy-preview-<PR numarası>--voleybolveveleybol.netlify.app`. PR dalına gelen her yeni push önizlemeyi yeniler.
3. Önizleme kontrol edilir. Düzeltme gerekirse iş dalda yapılır ve önizleme kendiliğinden yenilenir.
4. Hazırsa "yayınla" de. PR `main` dalına tek commit olarak birleştirilir (GitHub'daki "Squash and merge" düğmesi aynı işi yapar). Netlify canlı yayını kurar ve 15 kredi harcar.
5. Yayından sonra canlı site kontrol edilir. CSS adresindeki `?v=` değeri yeni commit'in ilk 10 karakteriyle aynı olmalı. Sayaç, video kartları, test sayfası ve telefon görünümü doğru olmalı.

Önizlemede hesap açma, giriş yapma ve test çözme. Önizlemenin fonksiyonları büyük olasılıkla canlı veritabanına bağlanır. Google ile giriş önizleme adresinde çalışmaz.

Kurallar:
- Canlı yayın en çok haftada bir çıkar. Değişiklikler birikir ve tek yayında çıkar.
- Netlify ortam değişkeni yalnız yeni yayınla geçerli olur. Değişkeni PR'ı birleştirmeden önce Netlify'a gir. Yalnız değişken için yayın başlatma.
- `main` dalına siteyi değiştirmeyen bir commit doğrudan atılırsa (örneğin yalnız bir belge) mesajına `[skip netlify]` eklenir. Netlify bu etiketi görünce yayın başlatmaz. PR başlığına bu etiketi yazma, çünkü önizlemeyi kapatır.
- **Netlify paneline sürükle-bırak ile deploy etme.** Git bağlantısını koparır.
- Eski `yayinla.ps1` betiği her commit'i push edip her seferinde canlı yayın başlatıyordu. Artık kullanılmaz.

Kredi harcayan ve harcamayan işlemler:

| İşlem | Kredi |
|---|---|
| Başarılı canlı yayın | 15 |
| Önizleme yayını (PR) ve başarısız yayın | 0 |
| Önceki yayına dönme | 0 |

Önerilen bütçe ayda en çok 4 canlı yayındır (60 kredi). Kalan kredi trafiğe kalır. Kredi biterse Netlify hesaptaki bütün siteleri yeni dönemin başına kadar durdurur.

### Canlıda hata çıkarsa

Yeni yayın başlatma. Netlify'da Deploys listesinden önceki yayını aç ve "Publish deploy" düğmesine bas. Netlify yeni derleme yapmaz, eski sürüm hemen canlıya geçer ve kredi harcanmaz. Hata dalda düzeltilir ve düzeltme sonraki yayınla çıkar. Otomatik yayın açıkken `main` dalına giren sonraki değişiklik geri alınan sürümün üstüne yazar.

## Hareket ve yumuşak kaydırma

Ana sayfada ekranın altındaki bölümler kaydırınca sırayla belirir. Fare olan bilgisayarda bütün sayfalar yumuşak kayar.

- `src/scripts/hareket-yukle.js` hareket paketini sayfa tam yüklendikten sonra ister. Telefonda ve dokunmatik ekranda paket yalnız ana sayfada iner. Fare olan bilgisayarda yumuşak kaydırma için her sayfada iner.
- `src/scripts/hareket.js` iki iş yapar. Bölümleri GSAP ile kaydırınca belirtir. Lenis ile yumuşak kaydırmayı kurar. Lenis ayrı bir parça olarak iner ve telefonda hiç istenmez.
- Hero girişi ve test geri bildirimi (doğru şıkkın büyümesi, yanlış şıkkın sarsılması) CSS ile çalışır. Kod `site.css` içindedir.
- İşletim sisteminde "hareketi azalt" ayarı açık olan ziyaretçide hareket paketi hiç inmez ve CSS animasyonları kapanır.
- Paket yüklenmezse sayfa eksiksiz görünür. Hiçbir içerik JS'e bağlı olarak gizli başlamaz.
- Kurallar sözlüğünde hareket yoktur. Arama ve açılır liste hızlı kalsın diye.
- Telefonda ana sayfanın toplam JS'i 55 KB'ı (gzip) geçmemeli. Son ölçüm 52.151 bayttır.
- Yatay ya da kendi içinde kayan yeni bir öğe eklenirse öğeye `data-lenis-prevent-horizontal` (yatay) ya da `data-lenis-prevent` (her yön) niteliği verilir. Nitelik yoksa masaüstünde fare tekerleği o öğeyi kaydırmaz. Menü, video rafları, "Son içerik" bölümü ve sıralama tablosunda nitelik var.
- Yeni bir bölümün kaydırınca belirmesi için `hareket.js` içindeki `bolumleriKur()` fonksiyonuna bir `bolumuCanlandir(...)` satırı eklenir.
- `ScrollTrigger.refresh()` çağrılmaz. Refresh kaydırmayı sıfırlar ve adresteki `#bölüm` kaydırmasını yarıda keser.

## Veritabanı (Neon Postgres)

Üyelik ve skor altyapısı Neon'daki `voleybolveveleybol` projesinde (`curly-bonus-62218411`, Frankfurt). Bağlantı `.env.local` içindeki `DATABASE_URL` ile kurulur. Bu dosya git'e girmez, `neon link` yeniden üretir.

```
db/migrations/*.sql    Şema değişiklikleri, numara sırasıyla uygulanır
db/migrate.mjs         Göç çalıştırıcısı (uygulananları _gocler'de izler)
db/sorular/*.json      Soruların kaynağı, sorular REPODA yaşar
db/seed.mjs            Soruları veritabanına senkronlar (tekrar çalıştırmak güvenli)
```

```
npm run db:migrate     Bekleyen göçleri uygula
npm run db:seed        db/sorular/ içeriğini veritabanına yaz
```

Kurallar:
- Uygulanmış bir göç dosyasını düzenleme. Her değişiklik yeni numaralı bir dosya olur.
- Test soruları tarayıcıya `/api/deneme-basla` üzerinden CEVAPSIZ gider. Doğruluk kararı sunucuda verilir. Doğru cevaplar yalnızca `db/sorular/` dosyalarında ve veritabanında durur. İstemciye giden hiçbir dosyaya koyma.
- Sunucu her denemede havuzdan `goster` kadar soruyu rastgele seçer. Süre sınırı soru başına 60 sn'dir (`deneme-basla`, `deneme-cevap` ve `deneme-bitir` fonksiyonları).
- Dosyadan silinen soru veritabanından silinmez, çünkü geçmiş denemeler ona bağlıdır. Seed uyarı verir ve karar elle verilir.
- İki komut da canlı veritabanına yazar. Komutları yalnız sen çalıştırırsın ya da bir Claude oturumuna açıkça söylersin.

## Test setleri ve soruları

Her test seti `db/sorular/` altında bir JSON dosyasıdır. Şu an yedi set ve toplam 115 soru var.

```json
{
  "set": {
    "slug": "temel-oyun",
    "baslik": "Temel Oyun ve Sayı Sistemi",
    "aciklama": "Kısa tanıtım metni.",
    "kategori": "temel",
    "zorluk": 1,
    "yayinda": true,
    "goster": 10
  },
  "sorular": [
    {
      "kaynak_no": 1,
      "metin": "Soru metni?",
      "secenekler": ["Birinci şık", "İkinci şık", "Üçüncü şık", "Dördüncü şık"],
      "dogru_index": 1,
      "aciklama": "Cevaptan sonra görünen açıklama. HTML kullanabilirsin."
    }
  ]
}
```

- `slug` testin adresidir (`/testler/<slug>/`). Yayındaki bir setin `slug` değerini değiştirme.
- `zorluk` 1 ile 3 arasındadır: 1 Başlangıç, 2 Orta, 3 İleri.
- `yayinda` değeri `false` olan set sitede görünmez.
- `goster` her denemede havuzdan rastgele seçilecek soru sayısıdır. Boş bırakırsan bütün sorular sorulur.
- `kaynak_no` sorunun değişmeyen numarasıdır ve set içinde benzersizdir. Güncelleme bu numarayla eşleşir. Mevcut sorunun numarasını değiştirme. Yeni soru yeni numara alır.
- `dogru_index` doğru şıkkın sıfırdan başlayan sırasıdır (ilk şık = 0).
- Sonuç bantları ("Isınma turu", "Saha bilgisi iyi", "Hakem gibisin") `public/assets/js/quiz.js` içindeki `BANTLAR` dizisindedir. Eşikler doğru cevap oranıdır (0,5 = yarısı). Soru sayısı değişince eşikleri güncellemek gerekmez.

Set listesi ve set sayfaları derleme sırasında bu dosyalardan üretilir. Deneme akışı ise veritabanından çalışır. Bu yüzden yeni set ya da soru için iki iş gerekir: değişikliği yayınlamak ve `npm run db:seed` çalıştırmak. Önce `db:seed`, sonra yayın sırası doğrudur. Böylece yeni sayfa açıldığında veritabanı hazırdır.

## Yeni sayfa eklemek

`src/pages/` altına bir `.astro` dosyası koy ve `Base` şablonunu kullan:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Sayfa başlığı" description="..." path="/adres/" active="menuAnahtari">
  <main id="main">…</main>
</Base>
```

Dosya yolu adres olur: `src/pages/siralama.astro` → `/siralama/`. Header ve footer kendiliğinden gelir. `Base` şu ayarları da alır:

- `scripts={['/assets/js/sayfa.js']}` sayfaya özel betikleri ekler. Adreslere `?v=` otomatik eklenir.
- `hareket` değeri `true` olursa bölümler kaydırınca belirir. Şimdilik yalnız ana sayfa kullanıyor.
- `robots` arama motoru yönergesini değiştirir. Varsayılan "indekslensin" biçimindedir.

Yeni sayfayı `public/sitemap.xml` dosyasına da ekle, çünkü site haritası elle yazılıyor.

## Videolar nasıl güncelleniyor?

**Hiçbir şey yapmana gerek yok.** `/api/videos` kanalın herkese açık RSS akışını okur, son videoları çeker ve kategorilere ayırır. API anahtarı gerekmez. Sonuç 30 dakika önbelleğe alınır.

- Ana sayfadaki "Son içerik" bölümü en yeni videoları gösterir. Videonun hangi oynatma listesinde olduğuna bakılmaz.
- Raflar oynatma listelerinden beslenir. Bir video rafta görünsün istiyorsan YouTube'da ilgili listeye ekle. Hiçbir listede olmayan video raflarda çıkmaz, "Son içerik" bölümünde yine görünür.

| Raf | Oynatma listeleri |
|---|---|
| Voleybol Anlatımları | Voleybol 101 |
| Maç Analizi & Haber | Voleybol Haberleri, Voleybol Maçları |
| Eğlence & Shorts | Kısa Kısa Voleybol, Voleybol Günlük Doz |

Bir video birden fazla listedeyse listesi önce gelen raf kazanır (anlatım, analiz, eğlence sırasıyla).

Liste kimlikleri `netlify/functions/videos.js` içinde yazılıdır. Başka liste kullanmak istersen Netlify'da şu ortam değişkenlerine virgülle ayrılmış liste kimliklerini gir (yeni yayın ister):

| Değişken | Karşılığı |
|---|---|
| `YT_PL_ANLATIM` | "Voleybol Anlatımları" rafının listeleri |
| `YT_PL_ANALIZ` | "Maç Analizi & Haber" rafının listeleri |
| `YT_PL_EGLENCE` | "Eğlence & Shorts" rafının listeleri |

Liste kimliği, liste adresindeki `list=` sonrasındaki `PL...` ile başlayan koddur.

### Shorts kartı

Her videoya bir `short` alanı eklenir. Shorts videoları ana sayfada dikey (9:16) kartta ve dikey kapakla çıkar, uzun videolar yatay kalır. Sınıflama YouTube akışındaki bağlantıdan yapılır (`/shorts/` ya da `/watch`). Akış sınıflayamazsa kart eskisi gibi yatay çizilir. Dikey kapak sırayla `oar2.webp`, `oar2.jpg` ve `hqdefault.jpg` dosyalarından denenir.

### Yeni kategori eklemek

`netlify/functions/videos.js` içindeki `CATEGORIES` dizisine bir satır ekle: id, ekranda görünecek `label`, kısa `blurb`, `playlistIds` ve anahtar kelimeler. Ana sayfa rafı kendiliğinden oluşur.

## Takipçi sayıları

`/api/stats` kaynakları ayrı ayrı dener. Biri düşerse diğerleri canlı kalır, düşen kaynak son bilinen değeri gösterir. Sonuç 15 dakika önbelleğe alınır.

### Instagram sayısını güncellemek

Instagram otomatik okumayı engelliyor. Sayı `veri` dalındaki `sayilar.json` dosyasından okunur:

```json
{ "ig": 5917, "guncelleme": "2026-11-12" }
```

1. GitHub'da `veri` dalındaki dosyayı aç: `https://github.com/ArdaKarakas1/voleybolveveleybol/blob/veri/sayilar.json`
2. Kalem simgesine bas. `ig` değerini yeni sayıyla, `guncelleme` değerini bugünün tarihiyle değiştir.
3. "Commit changes" düğmesiyle kaydet.

- `ig` alanına yalnız rakam yaz. Nokta ve virgül olmaz (`6000` doğru, `6.000` yanlış).
- `veri` dalı siteyi derlemez. Dosyayı değiştirmek Netlify yayını başlatmaz ve kredi harcamaz. İlk güncellemeden sonra Netlify'ın Deploys listesinde yeni yayın çıkmadığını kontrol et.
- Yeni sayı sitede yaklaşık 30 dakikada görünür.
- Dosyayı bir Claude oturumu da güncelleyebilir. Sayıyı sen söylersin ya da oturum profilden okur ve sen onaylarsın.

Okuma sırası şöyledir: canlı okuma, `sayilar.json`, `IG_FOLLOWERS` ortam değişkeni, koddaki yedek değer.

### Ortam değişkenleri

| Değişken | Ne işe yarar |
|---|---|
| `YT_API_KEY` | *(isteğe bağlı)* YouTube Data API anahtarı. Girersen abone sayısı kazıma yerine resmî API'den gelir, bu çok daha güvenilirdir. |
| `IG_FOLLOWERS` | Instagram için yedek sayı. `sayilar.json` okunamazsa kullanılır. Değiştirmek yeni yayın ister. |
| `SAYILAR_URL` | `sayilar.json` adresi. Varsayılan `veri` dalındaki dosyadır. |
| `YT_FALLBACK`, `YT_VIDEOS_FALLBACK`, `YT_VIEWS_FALLBACK`, `TT_FALLBACK` | Canlı okuma başarısız olursa gösterilecek son bilinen değerler. |
| `YT_CHANNEL_ID` | Kanal id'si. Varsayılan zaten doğru: `UCLIkp2xtSnvDl4EftiZuGJA`. |

Netlify'da ortam değişkenleri Site configuration bölümündeki Environment variables sayfasındadır (eski adıyla Site settings).

## Kural eklemek / düzeltmek

`public/data/kurallar.json` içindeki `maddeler` dizisine yeni bir nesne ekle:

```json
{
  "id": "benzersiz-kisa-ad",
  "cat": "vurus",
  "q": "Sorunun başlığı?",
  "a": "<p>Cevap. HTML kullanabilirsin.</p>",
  "tags": ["arama", "için", "kelimeler"]
}
```

`cat` değeri dosyadaki `kategoriler` listesinin id'lerinden biri olmalı. Her maddeye `/kurallar/#benzersiz-kisa-ad` şeklinde doğrudan link verilebilir. Video açıklamalarında bu linkleri kullan. Yayındaki bir maddenin `id` değerini değiştirme, çünkü açıklamalardaki linkler kırılır.

**Önemli:** Kural bilgileri FIVB 2025–2028 resmî oyun kurallarına göre doğrulandı. Yeni madde eklerken kaynağını kontrol et. Yanlış kural bilgisi kanalın güvenilirliğine zarar verir.

## Renkleri değiştirmek

`public/assets/css/site.css` dosyasındaki en üstteki `:root` bloğu. Tüm site oradaki değişkenlerden beslenir, bir rengi değiştirince her yerde değişir. Karanlık tema için `:root[data-theme="dark"]` bloğu vardır.

## Yerelde denemek

```bash
npm run build
npm run preview                  # derlenmiş siteyi açar
# ya da derlemeden sonra:
python3 -m http.server 8000 -d dist
```

İki yolda da `/api/*` çalışmaz. Site otomatik olarak `public/data/videos-fallback.json` dosyasına ve yedek sayılara düşer. Bu davranış bilinçlidir. Fonksiyonlarla birlikte denemek için `npx netlify dev` kullanılabilir, ancak bu komut Astro'ya geçişten sonra denenmedi.
