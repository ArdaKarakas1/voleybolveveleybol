/**
 * POST /api/deneme-bitir — skoru kesinleştirir.
 * Girdi : { deneme_id }
 * Çıktı : { puan, toplam, sure_sn }
 *
 * Puan tarayıcıdan ASLA alınmaz; cevap kayıtlarından sayılır.
 * Cevaplanmamış sorular yanlış sayılır. Tamamlanmış denemede tekrar
 * çağrılırsa kayıtlı sonucu döner (yenileme güvenli).
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

const SORU_SURE_SN = 60;

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  const denemeId = String(K.govdeOku(event)?.deneme_id || '');
  if (!/^[0-9a-f-]{36}$/.test(denemeId)) return K.yanit(400, { hata: 'Geçersiz istek.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Oturum yok.' });

    const [deneme] = await sql`
      SELECT id, durum, basladi, toplam, puan, sure_sn FROM denemeler
      WHERE id = ${denemeId}::uuid AND uye_id = ${oturum.uye.id}`;
    if (!deneme) return K.yanit(404, { hata: 'Deneme bulunamadı.' });
    if (deneme.durum === 'tamamlandi')
      return K.yanit(200, { puan: deneme.puan, toplam: deneme.toplam, sure_sn: deneme.sure_sn });
    if (deneme.durum === 'zaman_asimi') return K.yanit(410, { hata: 'sure-doldu' });

    const sinir = new Date(deneme.basladi).getTime() + deneme.toplam * SORU_SURE_SN * 1000;
    if (Date.now() > sinir) {
      await sql`UPDATE denemeler SET durum = 'zaman_asimi' WHERE id = ${denemeId}::uuid`;
      return K.yanit(410, { hata: 'sure-doldu' });
    }

    const [sonuc] = await sql`
      UPDATE denemeler SET
        durum = 'tamamlandi',
        bitti = now(),
        puan = (SELECT count(*)::int FROM deneme_sorulari
                WHERE deneme_id = ${denemeId}::uuid AND dogru_mu),
        sure_sn = extract(epoch FROM now() - basladi)::int
      WHERE id = ${denemeId}::uuid AND durum = 'suruyor'
      RETURNING puan, toplam, sure_sn`;
    if (!sonuc) return K.yanit(409, { hata: 'Deneme zaten sonuçlandı.' });

    return K.yanit(200, sonuc);
  } catch (e) {
    console.error('deneme-bitir:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Sonuç kaydedilemedi. Tekrar dene.' });
  }
}
