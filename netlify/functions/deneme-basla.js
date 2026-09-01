/**
 * POST /api/deneme-basla — yeni deneme açar. Üyelik gerekir.
 * Girdi : { set_slug }
 * Çıktı : { deneme_id, toplam, sure_sn_toplam, sorular: [{ sira, metin, secenekler }] }
 *
 * Karıştırma ve soru seçimi SUNUCUDA yapılır; doğru cevap tarayıcıya
 * hiçbir zaman gönderilmez (mimari dokümanı bölüm 06).
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

const SORU_SURE_SN = 60; // soru başına; toplam limit = soru sayısı × 60

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Test çözmek için giriş yapmalısın.' });

    // Saatte 30 deneme — tekrar çözmek serbest, otomasyonla doldurma değil.
    if (!(await K.hizSiniri(sql, `deneme:${oturum.uye.id}`, 30, 3600)))
      return K.yanit(429, { hata: 'Çok fazla deneme başlattın. Biraz sonra tekrar dene.' });

    const slug = String(K.govdeOku(event)?.set_slug || 'genel-kural-testi');
    const [set] = await sql`
      SELECT id, baslik, goster FROM setler WHERE slug = ${slug} AND yayinda`;
    if (!set) return K.yanit(404, { hata: 'Böyle bir test yok.' });

    // Yarım kalmış denemeler askıda kalmasın.
    await sql`
      UPDATE denemeler SET durum = 'zaman_asimi'
      WHERE uye_id = ${oturum.uye.id} AND durum = 'suruyor'`;

    // Havuzdan rastgele seçim + karıştırma tek adımda.
    // goster NULL ise LIMIT NULL = sınırsız (havuzun tamamı).
    const havuz = await sql`
      SELECT id, metin, secenekler FROM sorular
      WHERE set_id = ${set.id}
      ORDER BY random()
      LIMIT ${set.goster}`;
    if (!havuz.length) return K.yanit(404, { hata: 'Bu testte henüz soru yok.' });

    const [deneme] = await sql`
      INSERT INTO denemeler (uye_id, set_id, toplam)
      VALUES (${oturum.uye.id}, ${set.id}, ${havuz.length})
      RETURNING id`;

    await sql`
      INSERT INTO deneme_sorulari (deneme_id, soru_id, sira)
      SELECT ${deneme.id}, s.soru_id, s.sira
      FROM unnest(${havuz.map((q) => q.id)}::bigint[]) WITH ORDINALITY AS s(soru_id, sira)`;

    return K.yanit(200, {
      deneme_id: deneme.id,
      toplam: havuz.length,
      sure_sn_toplam: havuz.length * SORU_SURE_SN,
      sorular: havuz.map((q, i) => ({ sira: i + 1, metin: q.metin, secenekler: q.secenekler }))
    });
  } catch (e) {
    console.error('deneme-basla:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Test başlatılamadı. Birazdan tekrar dene.' });
  }
}
