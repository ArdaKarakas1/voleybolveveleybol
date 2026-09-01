/**
 * POST /api/kayit — yeni üye.
 * Girdi : { eposta, kullanici_adi, parola }
 * Çıktı : 200 { uye } + oturum çerezi (kayıt biter bitmez giriş yapılmış olur;
 *         e-posta doğrulaması Faz 5'te, doğrulanmamış üye sıralamaya girmez)
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

const EPOSTA_DESENI = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const KULLANICI_DESENI = /^[a-z0-9_]{3,24}$/;

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  const govde = K.govdeOku(event);
  if (!govde) return K.yanit(400, { hata: 'Geçersiz istek gövdesi.' });

  const eposta = String(govde.eposta || '').trim().toLowerCase();
  const kullaniciAdi = String(govde.kullanici_adi || '').trim().toLowerCase();
  const parola = String(govde.parola || '');

  if (!EPOSTA_DESENI.test(eposta) || eposta.length > 254)
    return K.yanit(400, { hata: 'Geçerli bir e-posta adresi gir.', alan: 'eposta' });
  if (!KULLANICI_DESENI.test(kullaniciAdi))
    return K.yanit(400, { hata: 'Kullanıcı adı 3–24 karakter olmalı; yalnızca küçük harf, rakam ve alt çizgi.', alan: 'kullanici_adi' });
  if (parola.length < 10 || parola.length > 200)
    return K.yanit(400, { hata: 'Parola en az 10 karakter olmalı.', alan: 'parola' });

  try {
    const sql = veritabani();

    // IP başına saatte 5 kayıt — otomatik hesap açmayı frenler.
    if (!(await K.hizSiniri(sql, `kayit:${K.ipAnahtari(event.headers)}`, 5, 3600)))
      return K.yanit(429, { hata: 'Çok fazla kayıt denemesi. Bir süre sonra tekrar dene.' });

    const parolaHash = await K.parolaKarmasi(parola);

    let uye;
    try {
      [uye] = await sql`
        INSERT INTO uyeler (eposta, kullanici_adi, parola_hash)
        VALUES (${eposta}, ${kullaniciAdi}, ${parolaHash})
        RETURNING id, eposta, kullanici_adi, dogrulandi, olusturuldu`;
    } catch (e) {
      if (e.code === '23505') {
        const alan = String(e.message).includes('kullanici_adi') ? 'kullanici_adi' : 'eposta';
        return K.yanit(409, {
          hata: alan === 'kullanici_adi'
            ? 'Bu kullanıcı adı alınmış. Başka bir tane dene.'
            : 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.',
          alan
        });
      }
      throw e;
    }

    const jeton = K.jetonUret();
    await sql`
      INSERT INTO oturumlar (token_hash, uye_id, gecerlilik)
      VALUES (${K.jetonKarmasi(jeton)}, ${uye.id}, now() + make_interval(secs => ${K.OTURUM_OMRU_SN}))`;

    return K.yanit(200,
      { uye: { kullanici_adi: uye.kullanici_adi, eposta: uye.eposta, dogrulandi: uye.dogrulandi } },
      { 'set-cookie': K.oturumCerezi(jeton) });
  } catch (e) {
    console.error('kayit:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Kayıt şu an tamamlanamadı. Birazdan tekrar dene.' });
  }
}
