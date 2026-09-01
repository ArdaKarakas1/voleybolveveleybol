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

    // Tek ifade: süre kontrolü + sonuçlandırma + mevcut sonucu okuma.
    const [r] = await sql`
      WITH d AS (
        SELECT id, durum, basladi, toplam, puan, sure_sn FROM denemeler
        WHERE id = ${denemeId}::uuid AND uye_id = ${oturum.uye.id}
      ),
      sonlandir AS (
        UPDATE denemeler SET
          durum = CASE
            WHEN now() > (SELECT basladi FROM d) + make_interval(secs => (SELECT toplam FROM d) * ${SORU_SURE_SN})
            THEN 'zaman_asimi' ELSE 'tamamlandi' END,
          bitti = now(),
          puan = (SELECT count(*)::int FROM deneme_sorulari
                  WHERE deneme_id = ${denemeId}::uuid AND dogru_mu),
          sure_sn = extract(epoch FROM now() - basladi)::int
        WHERE id = (SELECT id FROM d) AND durum = 'suruyor'
        RETURNING durum, puan, toplam, sure_sn
      )
      SELECT
        (SELECT count(*)::int FROM d) AS deneme_var,
        (SELECT durum FROM d)         AS eski_durum,
        (SELECT puan FROM d)          AS eski_puan,
        (SELECT toplam FROM d)        AS eski_toplam,
        (SELECT sure_sn FROM d)       AS eski_sure,
        (SELECT durum FROM sonlandir) AS yeni_durum,
        (SELECT puan FROM sonlandir)  AS puan,
        (SELECT toplam FROM sonlandir) AS toplam,
        (SELECT sure_sn FROM sonlandir) AS sure_sn`;

    if (!r.deneme_var) return K.yanit(404, { hata: 'Deneme bulunamadı.' });
    if (r.eski_durum === 'tamamlandi')
      return K.yanit(200, { puan: r.eski_puan, toplam: r.eski_toplam, sure_sn: r.eski_sure });
    if (r.eski_durum === 'zaman_asimi' || r.yeni_durum === 'zaman_asimi')
      return K.yanit(410, { hata: 'sure-doldu' });
    if (!r.yeni_durum) return K.yanit(409, { hata: 'Deneme zaten sonuçlandı.' });

    return K.yanit(200, { puan: r.puan, toplam: r.toplam, sure_sn: r.sure_sn });
  } catch (e) {
    console.error('deneme-bitir:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Sonuç kaydedilemedi. Tekrar dene.' });
  }
}
