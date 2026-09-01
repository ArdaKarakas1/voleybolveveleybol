/**
 * /api/videos — YouTube içeriklerini otomatik çeker.
 *
 * Nasıl çalışır:
 *  1. Kanalın herkese açık RSS akışını okur (API anahtarı GEREKMEZ).
 *  2. Ayrıca CONFIG.playlists içinde tanımlı her oynatma listesinin RSS'ini okur;
 *     bir video hangi listedeyse o kategoriye girer. (En doğru yöntem — YouTube'da
 *     oynatma listesi açman yeterli, site kendiliğinden günceller.)
 *  3. Oynatma listesi yoksa başlık/açıklama anahtar kelimelerine göre kategori atar.
 *  4. Sonucu 30 dk CDN'de önbelleğe alır; hata olursa son bilinen veriyi döner.
 *
 * Yeni kategori eklemek için: aşağıdaki CATEGORIES dizisine bir satır ekle,
 * istersen YouTube'da aynı isimle bir oynatma listesi aç ve id'sini playlists'e yaz.
 */

const CHANNEL_ID = process.env.YT_CHANNEL_ID || 'UCLIkp2xtSnvDl4EftiZuGJA';

const CATEGORIES = [
  {
    id: 'anlatim',
    label: 'Voleybol Anlatımları',
    blurb: 'Teknik, kural ve temel beceri anlatımları',
    // "Voleybol 101" — bu rafta YALNIZCA listedeki videolar görünür.
    playlistIds: (process.env.YT_PL_ANLATIM || 'PLYxZnNu5N-CLuGuOI09Djqy9Wb9NICCwS').split(','),
    keywords: ['nasıl', 'nasil', 'teknik', 'öğren', 'ogren', 'ders', 'anlatım', 'anlatim', 'temel',
      'manşet', 'manset', 'smaç', 'smac', 'servis', 'pas', 'blok', 'parmak', 'plase', 'karşılama',
      'kural', 'hata', 'antrenman', 'drill', 'çalışma', 'calisma', 'rehber', 'başlangıç', 'baslangic',
      'libero', 'pasör', 'pasor', 'rotasyon', 'duruş', 'durus']
  },
  {
    id: 'analiz',
    label: 'Maç Analizi & Haber',
    blurb: 'Sultanlar Ligi, milli takım ve maç çözümlemeleri',
    // "Voleybol Haberleri" + "Voleybol Maçları" — raf yalnızca bu iki listeden beslenir.
    playlistIds: (process.env.YT_PL_ANALIZ || 'PLWAXcx-3Gvww,PLYxZnNu5N-CJLqtPR_-keZ0S0ho8SiNis').split(','),
    keywords: ['analiz', 'maç', 'mac', 'sultanlar', 'ligi', 'lig', 'vakıfbank', 'vakifbank',
      'fenerbahçe', 'fenerbahce', 'eczacıbaşı', 'eczacibasi', 'galatasaray', 'milli', 'şampiyon',
      'sampiyon', 'transfer', 'haber', 'filenin', 'cev', 'fivb', 'olimpiyat', 'final', 'derbi',
      'efeler', 'skor', 'kadro']
  },
  {
    id: 'eglence',
    label: 'Eğlence & Shorts',
    blurb: 'Kısa videolar, sahadan anlar, voleybol mizahı',
    // "Kısa Kısa Voleybol" + "Voleybol Günlük Doz" — raf yalnızca bu iki listeden beslenir.
    playlistIds: (process.env.YT_PL_EGLENCE || 'PLYxZnNu5N-CKBet0eZ5zc34gtNjnxVqXW,PLYxZnNu5N-CKqUQq528BY8P3UbAlfh724').split(','),
    keywords: ['shorts', 'short', 'komik', 'komedi', 'challenge', 'reaksiyon', 'vlog', 'günlük',
      'gunluk', 'eğlence', 'eglence', 'deneme', 'sahil', 'plaj', 'anlar', 'edit']
  }
];

/** Elle kategori ataması: { 'videoId': 'anlatim' } */
const OVERRIDES = {};

const FEED = id => `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`;
const PLIST = id => `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(id)}`;

let CACHE = { at: 0, payload: null };
const TTL = 1000 * 60 * 20;

const decode = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&amp;/g, '&')
  .trim();

const pick = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decode(m[1]) : '';
};

async function getXml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; voleybolveveleybol.com/1.0)',
      'accept-language': 'tr-TR,tr;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function parseFeed(xml) {
  const out = [];
  const entries = xml.split('<entry>').slice(1);
  for (const raw of entries) {
    const block = raw.split('</entry>')[0];
    const id = pick(block, 'yt:videoId');
    if (!id) continue;
    const thumbMatch = block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
    const viewsMatch = block.match(/<media:statistics[^>]*views="(\d+)"/i);
    out.push({
      id,
      title: pick(block, 'title'),
      published: pick(block, 'published'),
      description: pick(block, 'media:description').slice(0, 400),
      thumb: thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      views: viewsMatch ? Number(viewsMatch[1]) : null
    });
  }
  return out;
}

function guessCategory(video, lockedCats) {
  if (OVERRIDES[video.id]) return OVERRIDES[video.id];
  // Oynatma listesine bağlanmış (kilitli) kategorilere tahminle video GİRMEZ —
  // o raflar yalnızca listedeki videoları gösterir.
  const candidates = CATEGORIES.filter(c => !lockedCats.has(c.id));
  const hay = `${video.title} ${video.description}`.toLocaleLowerCase('tr');
  let best = null, bestScore = 0;
  for (const cat of candidates) {
    let score = 0;
    for (const kw of cat.keywords) if (hay.includes(kw)) score++;
    if (score > bestScore) { bestScore = score; best = cat.id; }
  }
  if (best) return best;
  // Hiçbir anahtar kelime eşleşmediyse: kilitsiz ilk kategoriye, hepsi kilitliyse rafsız bırak.
  return candidates.length ? candidates[0].id : 'diger';
}

exports.handler = async function () {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400',
    'access-control-allow-origin': '*'
  };

  if (CACHE.payload && Date.now() - CACHE.at < TTL) {
    return { statusCode: 200, headers, body: JSON.stringify({ ...CACHE.payload, cached: true }) };
  }

  const meta = { source: 'rss', playlistsUsed: [], errors: [] };

  try {
    const xml = await getXml(FEED(CHANNEL_ID));
    const videos = parseFeed(xml);
    if (!videos.length) throw new Error('RSS akışı boş döndü');

    // Oynatma listesi tanımlıysa kategori eşlemesini oradan al (en güvenilir yol).
    // Listesi başarıyla okunan kategori "kilitlenir": rafında yalnızca listedeki videolar kalır.
    const byId = new Map(videos.map(v => [v.id, v]));
    const catOf = new Map();
    const lockedCats = new Set();

    // Bir video birden fazla listedeyse, CATEGORIES dizisinde ÖNCE gelen kategori kazanır
    // (anlatim > analiz > eglence). Böylece çakışan videolar hep öğretici rafa gider.
    const priorityOf = id => CATEGORIES.findIndex(c => c.id === id);

    await Promise.all(CATEGORIES.filter(c => c.playlistIds && c.playlistIds.length).map(async cat => {
      const results = await Promise.allSettled(cat.playlistIds.map(async pid => {
        const pxml = await getXml(PLIST(pid.trim()));
        const items = parseFeed(pxml);
        items.forEach(item => {
          const existing = catOf.get(item.id);
          if (existing === undefined || priorityOf(cat.id) < priorityOf(existing)) {
            catOf.set(item.id, cat.id);
          }
          if (!byId.has(item.id)) { byId.set(item.id, item); }
        });
        return pid;
      }));
      const okCount = results.filter(r => r.status === 'fulfilled').length;
      results.filter(r => r.status === 'rejected')
        .forEach(r => meta.errors.push(`playlist:${cat.id}: ${r.reason && r.reason.message}`));
      // En az bir listesi okunabildiyse kategori kilitlenir; hiçbiri okunamazsa
      // raf boş kalmasın diye anahtar kelime tahmini devrede kalır.
      if (okCount > 0) {
        lockedCats.add(cat.id);
        meta.playlistsUsed.push(`${cat.id}(${okCount}/${cat.playlistIds.length})`);
      }
    }));

    const all = [...byId.values()]
      .map(v => ({ ...v, category: OVERRIDES[v.id] || catOf.get(v.id) || guessCategory(v, lockedCats) }))
      .sort((a, b) => new Date(b.published) - new Date(a.published));

    const payload = {
      channelId: CHANNEL_ID,
      channelUrl: 'https://www.youtube.com/@voleybolveveleybol',
      updated: new Date().toISOString(),
      categories: CATEGORIES.map(({ id, label, blurb }) => ({
        id, label, blurb, count: all.filter(v => v.category === id).length
      })),
      videos: all,
      _meta: meta
    };

    CACHE = { at: Date.now(), payload };
    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (err) {
    if (CACHE.payload) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...CACHE.payload, stale: true, _meta: { ...CACHE.payload._meta, errors: [err.message] } })
      };
    }
    return {
      statusCode: 200,
      headers: { ...headers, 'cache-control': 'public, max-age=0, s-maxage=60' },
      body: JSON.stringify({ videos: [], categories: CATEGORIES.map(({ id, label, blurb }) => ({ id, label, blurb, count: 0 })), error: err.message })
    };
  }
};
