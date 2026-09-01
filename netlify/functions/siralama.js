/**
 * GET /api/siralama — herkese açık sıralama tablosu.
 *
 * Her üyenin EN İYİ tamamlanmış denemesi sayılır; eşitlikte süresi kısa olan
 * öne geçer (mimari dokümanı bölüm 07). Sonuç 5 dakika bellekte önbeklenir —
 * stats.js'teki desenin aynısı.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

const TTL = 1000 * 60 * 5;
let CACHE = { at: 0, veri: null };

export async function handler(event) {
  if (event.httpMethod !== 'GET') return K.yanit(405, { hata: 'Yalnızca GET.' });

  try {
    if (Date.now() - CACHE.at > TTL || !CACHE.veri) {
      const sql = veritabani();
      const satirlar = await sql`
        SELECT kullanici_adi, puan, toplam, sure_sn, bitti
        FROM (
          SELECT DISTINCT ON (d.uye_id)
            u.kullanici_adi, d.puan, d.toplam, d.sure_sn, d.bitti
          FROM denemeler d JOIN uyeler u ON u.id = d.uye_id
          WHERE d.durum = 'tamamlandi'
          ORDER BY d.uye_id, d.puan DESC, d.sure_sn ASC, d.bitti ASC
        ) en_iyiler
        ORDER BY puan DESC, sure_sn ASC, bitti ASC
        LIMIT 50`;
      CACHE = { at: Date.now(), veri: { guncellendi: new Date().toISOString(), tablo: satirlar } };
    }
    return K.yanit(200, CACHE.veri, { 'cache-control': 'public, max-age=60' });
  } catch (e) {
    console.error('siralama:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Sıralama alınamadı.' });
  }
}
