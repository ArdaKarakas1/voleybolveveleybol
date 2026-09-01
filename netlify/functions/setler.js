/**
 * GET /api/setler — yayındaki kural setleri.
 * Oturum varsa her set için üyenin en iyi skoru da döner (doküman bölüm 08).
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return K.yanit(405, { hata: 'Yalnızca GET.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers); // yoksa null — sayfa herkese açık

    const setler = await sql`
      SELECT s.slug, s.baslik, s.aciklama, s.kategori, s.zorluk,
             LEAST(COALESCE(s.goster, 32767), count(q.id))::int AS soru_sayisi,
             count(q.id)::int AS havuz,
             eb.puan AS en_iyi_puan, eb.toplam AS en_iyi_toplam
      FROM setler s
      LEFT JOIN sorular q ON q.set_id = s.id
      LEFT JOIN LATERAL (
        SELECT d.puan, d.toplam FROM denemeler d
        WHERE d.set_id = s.id AND d.durum = 'tamamlandi' AND d.uye_id = ${oturum ? oturum.uye.id : null}
        ORDER BY d.puan DESC, d.sure_sn ASC LIMIT 1
      ) eb ON ${!!oturum}
      WHERE s.yayinda
      GROUP BY s.id, eb.puan, eb.toplam
      ORDER BY s.zorluk, s.baslik`;

    return K.yanit(200, { setler }, { 'cache-control': oturum ? 'no-store' : 'public, max-age=300' });
  } catch (e) {
    console.error('setler:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Setler alınamadı.' });
  }
}
