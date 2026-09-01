/**
 * GET /api/skorlarim — üyenin deneme geçmişi ve en iyi skoru.
 * Profil sayfası kullanır.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return K.yanit(405, { hata: 'Yalnızca GET.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Oturum yok.' });

    const gecmis = await sql`
      SELECT d.id, s.baslik AS set_baslik, d.puan, d.toplam, d.sure_sn, d.bitti
      FROM denemeler d JOIN setler s ON s.id = d.set_id
      WHERE d.uye_id = ${oturum.uye.id} AND d.durum = 'tamamlandi'
      ORDER BY d.bitti DESC
      LIMIT 20`;

    const [enIyi] = await sql`
      SELECT d.puan, d.toplam, d.sure_sn, d.bitti
      FROM denemeler d
      WHERE d.uye_id = ${oturum.uye.id} AND d.durum = 'tamamlandi'
      ORDER BY d.puan DESC, d.sure_sn ASC
      LIMIT 1`;

    return K.yanit(200, { gecmis, en_iyi: enIyi || null });
  } catch (e) {
    console.error('skorlarim:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Skorlar alınamadı.' });
  }
}
