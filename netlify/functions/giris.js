/**
 * POST /api/giris — oturum aç.
 * Girdi : { eposta, parola }
 * Çıktı : 200 { uye } + oturum çerezi
 *
 * Yanlış e-posta ile yanlış parola aynı mesajı döner; kayıtsız e-postada da
 * scrypt çalıştırılır ki yanıt süresi hangi e-postanın kayıtlı olduğunu ele vermesin.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

const GENEL_HATA = 'E-posta veya parola hatalı.';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  const govde = K.govdeOku(event);
  if (!govde) return K.yanit(400, { hata: 'Geçersiz istek gövdesi.' });

  const eposta = String(govde.eposta || '').trim().toLowerCase();
  const parola = String(govde.parola || '');
  if (!eposta || !parola) return K.yanit(400, { hata: 'E-posta ve parola gerekli.' });

  try {
    const sql = veritabani();

    // E-posta+IP başına 15 dakikada 10 deneme.
    const anahtar = `giris:${K.ipAnahtari(event.headers)}:${K.jetonKarmasi(eposta).slice(0, 12)}`;
    if (!(await K.hizSiniri(sql, anahtar, 10, 900)))
      return K.yanit(429, { hata: 'Çok fazla deneme. 15 dakika sonra tekrar dene.' });

    const [uye] = await sql`
      SELECT id, eposta, kullanici_adi, parola_hash, dogrulandi
      FROM uyeler WHERE lower(eposta) = ${eposta}`;

    if (!uye) {
      await K.zamanlamaEsitle(parola);
      return K.yanit(401, { hata: GENEL_HATA });
    }
    if (!(await K.parolaDogruMu(parola, uye.parola_hash)))
      return K.yanit(401, { hata: GENEL_HATA });

    // Süresi geçmiş oturumları fırsattan istifade temizle.
    await sql`DELETE FROM oturumlar WHERE gecerlilik < now()`;

    const jeton = K.jetonUret();
    await sql`
      INSERT INTO oturumlar (token_hash, uye_id, gecerlilik)
      VALUES (${K.jetonKarmasi(jeton)}, ${uye.id}, now() + make_interval(secs => ${K.OTURUM_OMRU_SN}))`;

    return K.yanit(200,
      { uye: { kullanici_adi: uye.kullanici_adi, eposta: uye.eposta, dogrulandi: uye.dogrulandi } },
      { 'set-cookie': K.oturumCerezi(jeton) });
  } catch (e) {
    console.error('giris:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Giriş şu an yapılamadı. Birazdan tekrar dene.' });
  }
}
