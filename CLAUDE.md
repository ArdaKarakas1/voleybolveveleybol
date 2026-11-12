# Voleybol ve Veleybol: Claude oturum kuralları

Bu depoda çalışan her Claude oturumu bu dosyayı kendiliğinden okur. Kurallar 12 Kasım 2026 tarihli devir raporundan gelir. Bir adım bu kurallardan biriyle çelişirse oturum durur ve Arda'ya sorar.

Site hafif bir Astro sitesidir (Astro 7, Node 22). React ya da başka bir arayüz çatısı kullanmaz. Depoda 19 statik sayfa, 19 Netlify fonksiyonu (`/api/<ad>`) ve bir Neon Postgres veritabanı bulunur. Dosya haritası, komutlar ve içerik güncelleme adımları `BENIOKU.md` dosyasında durur.

## Deploy kuralları

1. Oturum `main` dalına Arda'nın komutu olmadan push etmez ve PR birleştirmez. `main` dalına giren her değişiklik bir canlı yayın başlatır ve 15 kredi harcar.
2. Oturum bütün işi `gelistirme` dalında yapar. Dala push etmek ve PR açmak kredi harcamaz.
3. Canlı yayın en çok haftada bir çıkar. Oturum değişiklikleri biriktirir ve tek yayında çıkarır.
4. Netlify ortam değişkeni yalnız yeni yayınla geçerlilik kazanır. Oturum değişken değişikliğini planlı yayına bindirir ve yalnız değişken için yayın başlatmaz.
5. Canlıda hata çıkarsa oturum düzeltme yayını başlatmaz. Arda Netlify'da önceki yayına döner (0 kredi), oturum hatayı dalda düzeltir ve düzeltme sonraki yayına girer.
6. Oturum `main` dalına doğrudan commit atmak zorunda kalırsa ve commit siteyi değiştirmiyorsa mesaja `[skip netlify]` ekler. Netlify bu etiketi görünce yayın başlatmaz.

Netlify ücretsiz planı ayda 300 kredi verir. Başarılı canlı yayın 15 kredi harcar. Önizleme yayını, dal yayını, başarısız yayın ve önceki yayına dönme 0 kredidir. Önerilen bütçe ayda en çok 4 canlı yayındır. Kredi biterse Netlify hesaptaki bütün siteleri yeni dönemin başına kadar durdurur.

## Yetki sınırları

| İş | Karar |
|---|---|
| `gelistirme` dalına push, PR açma, önizleme yayını | Arda'nın başlama talimatı yeter |
| PR'ı `main` dalına birleştirme (canlı yayın) | Arda her seferinde "yayınla" der |
| Netlify ayarı, ortam değişkeni, önceki yayına dönme | Arda yapar ya da açık komut verir |
| Veritabanı göçü (`npm run db:migrate`) ve soru yükleme (`npm run db:seed`) | Arda açık komut verir |
| Sitede görünecek yeni rakam ve yeni Türkçe metin | Arda onaylar |
| Netlify, GitHub ve Google hesabına giriş | Arda kendisi yapar |

Oturum parola, API anahtarı ya da `DATABASE_URL` değeri istemez ve bu değerleri sohbete yazmaz.

## Arda'nın çalışma kuralları

- Arda çok adımlı işte önce planı ve özeti görür. Oturum onaydan sonra uygular.
- Oturum kendi bulabileceği bilgiyi Arda'ya sormaz, önce kendisi dener.
- Arda devrik cümle, öznesi belirsiz cümle ve cümle bağlayan tire istemez. Sitede görünecek her yeni Türkçe metin `turkce-insansi-metin` skill'inden geçer.
- Arda ücretsiz araç kullanır. Oturum ücretli abonelik önermez.
- Oturum Arda'nın panellerini (YouTube Studio, Instagram, Netlify) tarayıcıdan yalnız okur ve ayar değiştiren hiçbir düğmeye basmaz.
- Birden çok Claude oturumu aynı anda çalışabilir. Oturum çakışabilecek her işten önce koordinasyon panosuna bakar (`oturum-koordinasyonu` skill'i). Bu işin kaydının anahtarı `is-site-gelistirme`.
- Oturum Arda'nın bilgisayarında dosya silmez. Eskiyen dosyanın adına `.silinecek_` ön ekini koyar.

## Çalışma düzeni

1. `gelistirme` dalında çalış. Dal yoksa güncel `main` dalından aç. Bir yayından sonra dalı yeniden güncel `main` dalından aç.
2. Bağımlılıkları `npm ci` ya da `npm install` ile kur. Kilit dosyası değişirse `package-lock.json` dosyasını commit'le.
3. Her paketten sonra `COMMIT_REF=test npm run build` ile derle. `dist/index.html` içinde satır içi betik kalmadığını kontrol et. Yalnız JSON-LD veri bloğu satır içi kalabilir.
4. `dist` klasörünü sitenin güvenlik başlıklarıyla yerelde aç ve ölç. CSP ihlali 0 olmalı. LCP taban değerinden en çok 40 ms sapmalı, ölçüm gürültüsü bu kadardır. Telefonda ana sayfanın JS toplamı 55 KB'ı (gzip) geçmemeli.
5. Masaüstü ve telefon genişliğinde, açık ve koyu temada ekran görüntüsü al. Görüntülere kendin bak.
6. Değişikliği `gelistirme` dalına commit'le.
7. PR aç. Açıklamaya paketleri ve test sonuçlarını yaz. Başlığa `[skip ci]` ya da `[skip netlify]` yazma. Bu etiketler önizlemeyi kapatır.
8. Netlify birkaç dakika içinde PR'a önizleme linkini yazar: `https://deploy-preview-<PR numarası>--voleybolveveleybol.netlify.app`. PR dalına gelen her yeni push önizlemeyi yeniler ve kredi harcamaz.
9. Önizlemede şunlara bak: Sayfalar açılıyor mu, konsolda CSP ihlali var mı, `/api/stats` ve `/api/videos` yanıt veriyor mu, telefon genişliği ve koyu tema doğru mu. `/api/ben` önizlemede 500 dönerse ortam değişkenleri önizlemeye gelmemiştir.
10. Önizlemede hesap açma, giriş yapma ve test çözme. Önizlemenin fonksiyonları büyük olasılıkla canlı veritabanına bağlanır. Google ile giriş önizleme adresinde çalışmaz.
11. Oturum Arda'ya önizleme linkini, ekran görüntülerini ve değişiklik listesini verir. Arda "yayınla" derse oturum PR'ı `main` dalına tek commit olarak birleştirir (`gh pr merge --squash`).
12. Yayından sonra canlı sitede şunlara bak: CSS adresindeki `?v=` değeri yeni commit'in ilk 10 karakteriyle aynı mı, konsolda CSP ihlali var mı, sayaç, video kartları, test sayfası ve telefon görünümü doğru mu, LCP 12 Kasım değerinden (Arda'nın Mac'inde 1,4 sn) kötü mü.
13. Canlıda hata varsa oturum düzeltme yayını başlatmaz (kural 5). Arda Netlify'da Deploys listesinden önceki yayını açar ve "Publish deploy" düğmesine basar.

Yayın 2 (girişsiz test, kural başına sayfa, "Markalar için" bölümü) ayrı onay ister. Oturum başlamadan önce Arda'ya ayrıntılı plan sunar.

## Hareket kuralları

- Hareket paketi (`src/scripts/hareket.js`: GSAP, ScrollTrigger ve Lenis) sayfa `load` olayından sonra yüklenir. Sayfayla birlikte yüklenen paket LCP'yi yaklaşık 100 ms geciktirdi.
- Hiçbir içerik JS'e bağlı olarak gizli başlamaz. Paket yüklenmezse sayfa eksiksiz görünür. Paket yalnız ekranın altında kalan bölümleri gizler ve kaydırınca gösterir.
- İlk ekrandaki giriş animasyonu CSS ile çalışır ve `.hero` içinde kalır. Hero başlığı, paragrafı ve logosu opaklık animasyonuna girmez, yalnız kayar ya da ölçeklenir. Giriş animasyonları 600 ms'yi geçmez.
- GSAP ve Lenis `prefers-reduced-motion` açıkken çalışmaz. Bu durumda paket hiç indirilmez. `site.css` aynı ayarda CSS animasyonlarını da kapatır.
- Kurallar sözlüğüne (`/kurallar/`) hareket ekleme. O sayfada arama ve açılır liste hızlı kalmalı.
- Telefonda ana sayfanın toplam JS'i 55 KB'ı (gzip) geçmez. Son ölçüm 52.151 bayttır.
- Lenis yalnız fare ve imleç olan cihazda çalışır ve ayrı parça olarak iner. Telefonda ve dokunmatik ekranda hiç istenmez.
- Yatay ya da kendi içinde kayan yeni bir öğe eklersen `data-lenis-prevent-horizontal` (yatay) ya da `data-lenis-prevent` (her yön) niteliğini ver. Nitelik yoksa masaüstünde Lenis fare tekerleğini yakalar ve öğe kaymaz.
- Mobil menü açılırken `window.VVV.lenis.stop()`, kapanırken `start()` çağrılır (`site.js`). Menüyü değiştirirsen bu çağrıları koru.
- `ScrollTrigger.refresh()` çağırma. Refresh kaydırmayı sıfırlayıp geri koyar ve adresteki `#bölüm` kaydırmasını yarıda keser.
- Arda React Bits'ten bir efekt isterse oturum efekti GSAP ile yeniden yazar. React Bits lisansı bileşenleri sitede kullanmaya izin verir ve bileşenleri ayrıca dağıtmayı yasaklar.

## Teknik notlar

- Güvenlik başlığı (CSP) `netlify.toml` içindedir. `script-src 'self'` satır içi ve dış betiği engeller. `connect-src 'self'` tarayıcının başka sunucuya istek atmasını engeller. `img-src` yalnız siteyi ve `*.ytimg.com` adresini kabul eder.
- `astro.config.mjs` içindeki `assetsInlineLimit: 0` ayarı Astro'nun küçük betikleri HTML'e gömmesini engeller. Bu ayarı kaldırma.
- `public/assets/js/*.js` düz betiklerdir ve derlenmez. `Base.astro` bu adreslere `?v=<commit>` ekler. `src/scripts/` altındaki betikler derlenir ve `/_astro/` altında adında özet taşıyan dosyalar olarak çıkar. `/assets/*` ve `/_astro/*` bir yıl `immutable` önbelleklenir.
- `npm run dev` ve yerel derlemede `/api/*` uçları çalışmaz. Oturumda `DATABASE_URL` de yoktur. Sayfalar yedek değerlere düşer. Gerçekçi veri gerekirse canlı sitedeki `/api/videos` yanıtını kaydet ve yerel bir sahte sunucudan ver.
- Test araçları (sunucu, ölçüm, senaryo ve ekran görüntüsü betikleri) depoda değildir. Devir raporunun "Ek: test araçları" bölümünde durur. Betikleri depo dışında bir klasöre yaz.
- Bulut çalışma alanının kabuğu yalnız paket depolarına ve GitHub'a erişir. Siteye, YouTube'a ve Google Fonts'a erişemez. Yerel ekran görüntüsünde yazılar bu yüzden yedek yazı tipiyle görünür. Chrome `/usr/bin/google-chrome` yolundadır. Playwright `NODE_PATH=/opt/npm-tools/node_modules` ile çalışır. `playwright install` çalıştırma.
- Instagram takipçi sayısı `veri` dalındaki `sayilar.json` dosyasında durur: `{ "ig": 5917, "guncelleme": "2026-11-12" }`. `/api/stats` önce canlı okumayı, sonra bu dosyayı, sonra `IG_FOLLOWERS` ortam değişkenini, en sonda koddaki yedek değeri dener. `veri` dalı siteyi derlemez. Dosyayı değiştirmek canlı yayın başlatmaz. `ig` alanına yalnız rakam yazılır (nokta ve virgül olmaz). Değişiklik sitede yaklaşık 30 dakikada görünür. Yeni rakamı Arda onaylar.
- `/api/videos` kanalın RSS akışını ve beş oynatma listesinin akışını okur. Her videoya bir `short` alanı ekler: `true` Shorts (dikey kart), `false` uzun video, `null` bilinmiyor (eski yatay kart). Sınıflama akıştaki bağlantıdan yapılır (`/shorts/` ya da `/watch`). `UUSH` listesi yalnız en yeni 15 Shorts'u verdiği için yöntem olarak seçilmedi.
- `/kurallar/#kural-id` bağlantıları video açıklamalarında kullanılır. Yayındaki bir kuralın `id` değerini değiştirme.

## Commit

- Commit mesajı Türkçedir ve Türkçe karakter içermez: `Konu: aciklama`. Mesajı bir dosyaya yazıp `git commit -F` ile ver. Önceki commit'lerdeki gibi ölçüm sonuçlarını mesaja ekleyebilirsin.

## Komutlar

```
npm run dev          Yerel geliştirme sunucusu (localhost:4321)
npm run build        dist/ üretir
npm run preview      dist/ içeriğini yerelde servis eder
npm run check        astro check çalıştırır
npm run db:migrate   Bekleyen veritabanı göçlerini uygular (yalnız Arda'nın açık komutuyla)
npm run db:seed      db/sorular/ içeriğini veritabanına yazar (yalnız Arda'nın açık komutuyla)
```
