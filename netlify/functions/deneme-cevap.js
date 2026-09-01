/**
 * POST /api/deneme-cevap — tek cevabı işler.
 * Girdi : { deneme_id, sira, secilen }
 * Çıktı : { dogru_mu, dogru_index, aciklama }
 *
 * Doğruluk kararı yalnızca burada verilir. Aynı soruya ikinci cevap 409;
 * süre dolmuşsa deneme zaman aşımına düşürülür ve 410 döner.
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

    const [deneme] = await sql`
      SELECT id, durum, basladi, toplam FROM denemeler
      WHERE id = ${denemeId}::uuid AND uye_id = ${oturum.uye.id}`;
    if (!deneme) return K.yanit(404, { hata: 'Deneme bulunamadı.' });
    if (deneme.durum !== 'suruyor') return K.yanit(410, { hata: 'sure-doldu' });

    const sinir = new Date(deneme.basladi).getTime() + deneme.toplam * SORU_SURE_SN * 1000;
    if (Date.now() > sinir) {
      await sql`UPDATE denemeler SET durum = 'zaman_asimi' WHERE id = ${denemeId}::uuid`;
      return K.yanit(410, { hata: 'sure-doldu' });
    }

    const [soru] = await sql`
      SELECT ds.secilen, s.dogru_index, s.aciklama, jsonb_array_length(s.secenekler) AS secenek_sayisi
      FROM deneme_sorulari ds JOIN sorular s ON s.id = ds.soru_id
      WHERE ds.deneme_id = ${denemeId}::uuid AND ds.sira = ${sira}`;
    if (!soru) return K.yanit(404, { hata: 'Soru bulunamadı.' });
    if (soru.secilen !== null) return K.yanit(409, { hata: 'Bu soru zaten cevaplandı.' });
    if (secilen >= soru.secenek_sayisi) return K.yanit(400, { hata: 'Geçersiz seçenek.' });

    const dogruMu = secilen === soru.dogru_index;
    await sql`
      UPDATE deneme_sorulari SET secilen = ${secilen}, dogru_mu = ${dogruMu}
      WHERE deneme_id = ${denemeId}::uuid AND sira = ${sira} AND secilen IS NULL`;

    return K.yanit(200, { dogru_mu: dogruMu, dogru_index: soru.dogru_index, aciklama: soru.aciklama });
  } catch (e) {
    console.error('deneme-cevap:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Cevap kaydedilemedi. Tekrar dene.' });
  }
}
