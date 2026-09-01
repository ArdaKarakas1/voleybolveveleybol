/**
 * POST /api/deneme-basla — yeni deneme açar. Üyelik gerekir.
 * Girdi : { set_slug }
 * Çıktı : { deneme_id, toplam, sure_sn_toplam, sorular: [{ sira, metin, secenekler }] }
 *
 * Karıştırma ve soru seçimi SUNUCUDA yapılır; doğru cevap tarayıcıya
 * hiçbir zaman gönderilmez. Set kontrolü, eski denemeleri kapatma, seçim,
 * deneme + soru kayıtları tek SQL ifadesinde — toplam 3 sorgu (eskiden ~7).
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

const SORU_SURE_SN = 60;

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Test çözmek için giriş yapmalısın.' });

    if (!(await K.hizSiniri(sql, `deneme:${oturum.uye.id}`, 30, 3600)))
      return K.yanit(429, { hata: 'Çok fazla deneme başlattın. Biraz sonra tekrar dene.' });

    const slug = String(K.govdeOku(event)?.set_slug || 'genel-kural-testi');

    const [r] = await sql`
      WITH set_k AS (
        SELECT id, goster FROM setler WHERE slug = ${slug} AND yayinda
      ),
      kapat AS (
        UPDATE denemeler SET durum = 'zaman_asimi'
        WHERE uye_id = ${oturum.uye.id} AND durum = 'suruyor'
          AND EXISTS (SELECT 1 FROM set_k) -- geçersiz slug mevcut denemeyi öldürmesin
      ),
      havuz AS (
        SELECT s.id, s.metin, s.secenekler, row_number() OVER () AS sira
        FROM (
          SELECT id, metin, secenekler FROM sorular
          WHERE set_id = (SELECT id FROM set_k)
          ORDER BY random()
          LIMIT (SELECT goster FROM set_k)
        ) s
      ),
      yeni AS (
        INSERT INTO denemeler (uye_id, set_id, toplam)
        SELECT ${oturum.uye.id}, (SELECT id FROM set_k), (SELECT count(*) FROM havuz)
        WHERE EXISTS (SELECT 1 FROM havuz)
        RETURNING id
      ),
      kayitlar AS (
        INSERT INTO deneme_sorulari (deneme_id, soru_id, sira)
        SELECT (SELECT id FROM yeni), id, sira FROM havuz
      )
      SELECT
        (SELECT count(*)::int FROM set_k) AS set_var,
        (SELECT id FROM yeni)             AS deneme_id,
        (SELECT count(*)::int FROM havuz) AS toplam,
        (SELECT json_agg(json_build_object('sira', sira, 'metin', metin, 'secenekler', secenekler)
                ORDER BY sira) FROM havuz) AS sorular`;

    if (!r.set_var) return K.yanit(404, { hata: 'Böyle bir test yok.' });
    if (!r.toplam) return K.yanit(404, { hata: 'Bu testte henüz soru yok.' });

    return K.yanit(200, {
      deneme_id: r.deneme_id,
      toplam: r.toplam,
      sure_sn_toplam: r.toplam * SORU_SURE_SN,
      sorular: r.sorular
    });
  } catch (e) {
    console.error('deneme-basla:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Test başlatılamadı. Birazdan tekrar dene.' });
  }
}
