/**
 * POST /api/deneme-cevap — tek cevabı işler.
 * Girdi : { deneme_id, sira, secilen }
 * Çıktı : { dogru_mu, dogru_index, aciklama }
 *
 * SICAK YOL: kullanıcı her şıkka bastığında çalışır. Fonksiyon (Ohio) ile
 * veritabanı arasındaki her gidiş-dönüş ~100 ms; bu yüzden oturum kontrolü
 * dışındaki her şey — deneme kontrolü, süre kontrolü, cevap kaydı, açıklama —
 * TEK SQL ifadesinde yapılır. Toplam 2 sorgu (eskiden 4).
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

const SORU_SURE_SN = 60;

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  const govde = K.govdeOku(event);
  const denemeId = String(govde?.deneme_id || '');
  const sira = Number(govde?.sira);
  const secilen = Number(govde?.secilen);
  if (!/^[0-9a-f-]{36}$/.test(denemeId) || !Number.isInteger(sira) || !Number.isInteger(secilen) || secilen < 0)
    return K.yanit(400, { hata: 'Geçersiz istek.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Oturum yok.' });

    const [r] = await sql`
      WITH d AS (
        SELECT id, durum, basladi, toplam FROM denemeler
        WHERE id = ${denemeId}::uuid AND uye_id = ${oturum.uye.id}
      ),
      zaman_asti AS (
        UPDATE denemeler SET durum = 'zaman_asimi'
        WHERE id = (SELECT id FROM d) AND durum = 'suruyor'
          AND now() > (SELECT basladi FROM d) + make_interval(secs => (SELECT toplam FROM d) * ${SORU_SURE_SN})
        RETURNING 1
      ),
      soru AS (
        SELECT ds.secilen AS onceki, s.dogru_index, s.aciklama,
               jsonb_array_length(s.secenekler) AS secenek_sayisi
        FROM deneme_sorulari ds JOIN sorular s ON s.id = ds.soru_id
        WHERE ds.deneme_id = ${denemeId}::uuid AND ds.sira = ${sira}
      ),
      kayit AS (
        UPDATE deneme_sorulari
        SET secilen = ${secilen}, dogru_mu = (${secilen} = (SELECT dogru_index FROM soru))
        WHERE deneme_id = ${denemeId}::uuid AND sira = ${sira} AND secilen IS NULL
          AND (SELECT durum FROM d) = 'suruyor'
          AND NOT EXISTS (SELECT 1 FROM zaman_asti)
          AND ${secilen} < (SELECT secenek_sayisi FROM soru)
        RETURNING dogru_mu
      )
      SELECT
        (SELECT count(*)::int FROM d)          AS deneme_var,
        (SELECT durum FROM d)                  AS durum,
        (SELECT count(*)::int FROM zaman_asti) AS zaman_asti,
        (SELECT count(*)::int FROM soru)       AS soru_var,
        (SELECT onceki FROM soru)              AS onceki,
        (SELECT secenek_sayisi FROM soru)      AS secenek_sayisi,
        (SELECT dogru_index FROM soru)         AS dogru_index,
        (SELECT aciklama FROM soru)            AS aciklama,
        (SELECT count(*)::int FROM kayit)      AS kaydedildi,
        (SELECT dogru_mu FROM kayit)           AS dogru_mu`;

    if (!r.deneme_var) return K.yanit(404, { hata: 'Deneme bulunamadı.' });
    if (r.durum !== 'suruyor' || r.zaman_asti) return K.yanit(410, { hata: 'sure-doldu' });
    if (!r.soru_var) return K.yanit(404, { hata: 'Soru bulunamadı.' });
    if (r.onceki !== null) return K.yanit(409, { hata: 'Bu soru zaten cevaplandı.' });
    if (secilen >= r.secenek_sayisi) return K.yanit(400, { hata: 'Geçersiz seçenek.' });
    if (!r.kaydedildi) return K.yanit(409, { hata: 'Cevap kaydedilemedi, tekrar dene.' });

    return K.yanit(200, { dogru_mu: r.dogru_mu, dogru_index: r.dogru_index, aciklama: r.aciklama });
  } catch (e) {
    console.error('deneme-cevap:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Cevap kaydedilemedi. Tekrar dene.' });
  }
}
