/**
 * GET /api/siralama          — genel sıralama: her üyenin set başına EN İYİ
 *                              skorlarının TOPLAMI (çok set çözen ödüllenir).
 * GET /api/siralama?set=slug — tek setin sıralaması: en iyi deneme, eşitlikte
 *                              kısa süre.
 * Sonuçlar 10 sn bellekte önbeklenir (anahtar: set). ?taze=1 önbelleği atlar —
 * test biten kullanıcı yerini ANINDA görsün diye sonuç ekranı bu parametreyle gelir.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';
import { epostaAktif } from './_ortak/eposta.js';

// Doğrulama e-postası gönderilebiliyorsa sıralamaya yalnızca doğrulanmış
// hesaplar girer (sahte hesap freni). Servis kapalıyken filtre uygulanmaz —
// yoksa parola kullanıcıları doğrulanma imkânı olmadan tablodan düşerdi.

const TTL = 1000 * 10; // 10 sn — skorlar tabloya neredeyse aninda yansisin
const CACHE = new Map(); // set → { at, veri }

export async function handler(event) {
  if (event.httpMethod !== 'GET') return K.yanit(405, { hata: 'Yalnızca GET.' });

  const set = String(event.queryStringParameters?.set || '');
  const taze = event.queryStringParameters?.taze === '1';
  if (set && !/^[a-z0-9-]{2,60}$/.test(set)) return K.yanit(400, { hata: 'Geçersiz set.' });

  try {
    const onbellek = CACHE.get(set);
    if (taze || !onbellek || Date.now() - onbellek.at > TTL) {
      const sql = veritabani();
      const satirlar = set
        ? await sql`
            SELECT kullanici_adi, puan, toplam, sure_sn, bitti
            FROM (
              SELECT DISTINCT ON (d.uye_id)
                u.kullanici_adi, d.puan, d.toplam, d.sure_sn, d.bitti
              FROM denemeler d
              JOIN uyeler u ON u.id = d.uye_id
              JOIN setler s ON s.id = d.set_id
              WHERE d.durum = 'tamamlandi' AND s.slug = ${set}
                AND (u.dogrulandi OR NOT ${epostaAktif()})
              ORDER BY d.uye_id, d.puan DESC, d.sure_sn ASC, d.bitti ASC
            ) en_iyiler
            ORDER BY puan DESC, sure_sn ASC, bitti ASC
            LIMIT 50`
        : await sql`
            SELECT kullanici_adi,
                   sum(puan)::int AS puan, sum(toplam)::int AS toplam,
                   sum(sure_sn)::int AS sure_sn, max(bitti) AS bitti,
                   count(*)::int AS set_sayisi
            FROM (
              SELECT DISTINCT ON (d.uye_id, d.set_id)
                d.uye_id, u.kullanici_adi, d.puan, d.toplam, d.sure_sn, d.bitti
              FROM denemeler d JOIN uyeler u ON u.id = d.uye_id
              WHERE d.durum = 'tamamlandi'
                AND (u.dogrulandi OR NOT ${epostaAktif()})
              ORDER BY d.uye_id, d.set_id, d.puan DESC, d.sure_sn ASC, d.bitti ASC
            ) set_bazli
            GROUP BY uye_id, kullanici_adi
            ORDER BY puan DESC, sure_sn ASC
            LIMIT 50`;
      CACHE.set(set, { at: Date.now(), veri: { guncellendi: new Date().toISOString(), set: set || null, tablo: satirlar } });
    }
    return K.yanit(200, CACHE.get(set).veri, { 'cache-control': taze ? 'no-store' : 'public, max-age=5' });
  } catch (e) {
    console.error('siralama:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Sıralama alınamadı.' });
  }
}
