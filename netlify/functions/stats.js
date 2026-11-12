/**
 * /api/stats — canlı topluluk sayıları.
 *
 * YouTube  : YT_API_KEY varsa resmî API (kesin doğru), yoksa kanal sayfasından okur.
 * TikTok   : profil sayfasından okur (birden fazla desen denenir).
 * Instagram: Instagram otomatik okumayı engelliyor. Okuma sırası:
 *            1) canlı okuma, 2) "veri" dalındaki sayilar.json (elle güncellenir,
 *            dosyayı değiştirmek canlı yayın BAŞLATMAZ), 3) IG_FOLLOWERS ortam
 *            değişkeni (eski yöntem: her değişiklik yeni yayın ister), 4) FALLBACK.
 *
 * Her kaynak bağımsız çalışır: biri düşerse diğerleri canlı kalır, düşen kaynak
 * son bilinen değere döner ve _meta içinde "fallback" olarak işaretlenir.
 */

const HANDLE = 'voleybolveveleybol';
const CHANNEL_ID = process.env.YT_CHANNEL_ID || 'UCLIkp2xtSnvDl4EftiZuGJA';

/** Canlı okuma başarısız olursa gösterilecek son bilinen değerler (12 Kas 2026). */
const FALLBACK = {
  yt: Number(process.env.YT_FALLBACK || 2830),
  ytVideos: Number(process.env.YT_VIDEOS_FALLBACK || 107),
  ytViews: Number(process.env.YT_VIEWS_FALLBACK || 0),
  tt: Number(process.env.TT_FALLBACK || 960),
  ig: Number(process.env.IG_FOLLOWERS || 5917)
};

/**
 * Instagram sayısının elle tutulduğu dosya. "veri" dalında durur; bu dal siteyi
 * derlemez, bu yüzden dosyayı GitHub'da değiştirmek Netlify yayını başlatmaz.
 * Biçim: { "ig": 5917, "guncelleme": "2026-11-12" }
 */
const SAYILAR_URL = process.env.SAYILAR_URL ||
  'https://raw.githubusercontent.com/ArdaKarakas1/voleybolveveleybol/veri/sayilar.json';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const TTL = 1000 * 60 * 15;
let CACHE = { at: 0, payload: null };

async function getText(url, extraHeaders) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: Object.assign(
        { 'user-agent': UA, 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.6' },
        extraHeaders || {}
      )
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally { clearTimeout(timer); }
}

/** "1,2 B" / "1.2K" / "12.345" gibi metinleri sayıya çevirir. */
function humanToNumber(text) {
  if (!text) return null;
  const t = String(text).replace(/\s+/g, ' ').trim();
  const m = t.match(/([\d.,]+)\s*(milyon|million|M|B|bin|K|k)?/i);
  if (!m) return null;
  let num = m[1];
  // Türkçe biçim: 1.234,5 → 1234.5 ; İngilizce: 1,234.5 → 1234.5
  if (num.includes(',') && num.includes('.')) {
    num = num.lastIndexOf(',') > num.lastIndexOf('.')
      ? num.replace(/\./g, '').replace(',', '.')
      : num.replace(/,/g, '');
  } else if (num.includes(',')) {
    num = /,\d{3}$/.test(num) ? num.replace(/,/g, '') : num.replace(',', '.');
  }
  let value = parseFloat(num);
  if (!isFinite(value)) return null;
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'm' || unit === 'milyon' || unit === 'million') value *= 1e6;
  else if (unit === 'b' || unit === 'bin' || unit === 'k') value *= 1e3;
  return Math.round(value);
}

async function youtubeViaApi() {
  const key = process.env.YT_API_KEY;
  if (!key) return null;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${key}`;
  const json = JSON.parse(await getText(url));
  const s = json?.items?.[0]?.statistics;
  if (!s) return null;
  return { yt: Number(s.subscriberCount), ytVideos: Number(s.videoCount), ytViews: Number(s.viewCount), how: 'api' };
}

async function youtubeViaScrape() {
  const html = await getText(`https://www.youtube.com/channel/${CHANNEL_ID}?hl=tr`);
  const subsRaw =
    html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/)?.[1] ||
    html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)?.[1] ||
    html.match(/([\d.,]+\s*(?:B|bin|Mn|milyon|K|M))\s*abone/i)?.[1];
  const vidsRaw =
    html.match(/"videosCountText":\{"runs":\[\{"text":"([^"]+)"/)?.[1] ||
    html.match(/([\d.,]+)\s*video/i)?.[1];
  const subs = humanToNumber(subsRaw);
  if (!subs) throw new Error('abone sayısı bulunamadı');
  return { yt: subs, ytVideos: humanToNumber(vidsRaw), ytViews: null, how: 'scrape' };
}

async function tiktok() {
  const html = await getText(`https://www.tiktok.com/@${HANDLE}`);
  const raw =
    html.match(/"followerCount":(\d+)/)?.[1] ||
    html.match(/"followers":\{"count":(\d+)/)?.[1] ||
    html.match(/([\d.,]+[KMB]?)\s*<\/strong>\s*<\/[^>]*>\s*Takip[çc]i/i)?.[1];
  const n = /^\d+$/.test(String(raw)) ? Number(raw) : humanToNumber(raw);
  if (!n) throw new Error('takipçi sayısı bulunamadı');
  return n;
}

/** sayilar.json'dan Instagram sayısını okur. Geçersiz içerik hata sayılır. */
async function instagramDosyadan() {
  const j = JSON.parse(await getText(SAYILAR_URL, { accept: 'application/json' }));
  const ham = j && j.ig;
  const n = typeof ham === 'number' ? ham : (/^\d+$/.test(String(ham).trim()) ? Number(ham) : NaN);
  if (!Number.isInteger(n) || n <= 0 || n >= 1e8) throw new Error('sayilar.json: ig geçersiz');
  return { value: n, tarih: typeof j.guncelleme === 'string' ? j.guncelleme.slice(0, 10) : null };
}

async function instagram() {
  // 1) Resmî olmayan web profil API'si — Instagram'ın kendi web uygulamasının
  //    kullandığı uç nokta. x-ig-app-id başlığıyla çoğu sunucudan anonim çalışır.
  const IG_APP_ID = '936619743392459';
  const apiUrls = [
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${HANDLE}`,
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${HANDLE}`
  ];
  for (const url of apiUrls) {
    try {
      const txt = await getText(url, {
        'x-ig-app-id': IG_APP_ID,
        'accept': 'application/json',
        'referer': `https://www.instagram.com/${HANDLE}/`
      });
      const n = JSON.parse(txt)?.data?.user?.edge_followed_by?.count;
      if (n) return { value: Number(n), how: 'live' };
    } catch (e) { /* sıradaki yöntemi dene */ }
  }

  // 2) Profil HTML'i — login duvarı gelse bile og:description meta etiketi
  //    çoğu zaman "2,518 Followers, ..." bilgisini içerir.
  try {
    const html = await getText(`https://www.instagram.com/${HANDLE}/`);
    const raw =
      html.match(/content="([\d.,]+[KMB]?)\s*(?:Followers|takipçi)/i)?.[1] ||
      html.match(/"edge_followed_by":\{"count":(\d+)\}/)?.[1] ||
      html.match(/([\d.,]+[KMB]?)\s*Followers/i)?.[1];
    const n = /^\d+$/.test(String(raw)) ? Number(raw) : humanToNumber(raw);
    if (n) return { value: n, how: 'live' };
  } catch (e) { /* yedeğe düş */ }

  // 3) veri dalındaki sayilar.json. Site bunu "elle güncelleniyor" diye gösterir (how: 'manual').
  //    Dosya okunamazsa nedeni /api/stats çıktısındaki _meta.igDosyaHatasi alanında görünür;
  //    böylece "sayıyı değiştirdim ama site eski kaldı" durumu tahminsiz teşhis edilir.
  let dosyaHatasi = null;
  try {
    const d = await instagramDosyadan();
    return { value: d.value, how: 'manual', tarih: d.tarih };
  } catch (e) { dosyaHatasi = String((e && e.message) || e).slice(0, 80); }

  // 4) Eski yöntem: ortam değişkeni. Her değişiklik yeni yayın ister, bu yüzden son çare.
  if (process.env.IG_FOLLOWERS) return { value: Number(process.env.IG_FOLLOWERS), how: 'manual', hata: dosyaHatasi };

  // 5) Koddaki son bilinen değer.
  return { value: FALLBACK.ig, how: 'fallback', hata: dosyaHatasi };
}

exports.handler = async function () {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400',
    'access-control-allow-origin': '*'
  };

  if (CACHE.payload && Date.now() - CACHE.at < TTL) {
    return { statusCode: 200, headers, body: JSON.stringify({ ...CACHE.payload, cached: true }) };
  }

  const out = { ...FALLBACK, updated: new Date().toISOString(), _meta: {} };

  const [ytRes, ttRes, igRes] = await Promise.allSettled([
    (async () => (await youtubeViaApi()) || (await youtubeViaScrape()))(),
    tiktok(),
    instagram()
  ]);

  if (ytRes.status === 'fulfilled' && ytRes.value?.yt) {
    out.yt = ytRes.value.yt;
    // Kazımadan gelen video sayısı bazen sayfadaki alakasız bir "N video" metnini
    // yakalıyor (örn. 1). Makul değilse son bilinen değeri koru.
    if (ytRes.value.ytVideos && ytRes.value.ytVideos >= FALLBACK.ytVideos * 0.5) {
      out.ytVideos = ytRes.value.ytVideos;
    }
    if (ytRes.value.ytViews) out.ytViews = ytRes.value.ytViews;
    out._meta.yt = ytRes.value.how;
  } else {
    out._meta.yt = 'fallback';
  }

  if (ttRes.status === 'fulfilled' && ttRes.value) { out.tt = ttRes.value; out._meta.tt = 'live'; }
  else { out._meta.tt = 'fallback'; }

  if (igRes.status === 'fulfilled') {
    out.ig = igRes.value.value;
    out._meta.ig = igRes.value.how;
    if (igRes.value.tarih) out._meta.igTarih = igRes.value.tarih;
    if (igRes.value.hata) out._meta.igDosyaHatasi = igRes.value.hata;
  }
  else { out._meta.ig = 'fallback'; }

  out.total = (out.yt || 0) + (out.tt || 0) + (out.ig || 0);

  CACHE = { at: Date.now(), payload: out };
  return { statusCode: 200, headers, body: JSON.stringify(out) };
};
