/**
 * GET /api/eposta-dogrula?token=… — e-postadaki bağlantı buraya gelir.
 * Jeton geçerliyse üyeyi doğrular ve profile yönlendirir.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';
import { yonlendir } from './_ortak/oauth.js';

export async function handler(event) {
  const jeton = String(event.queryStringParameters?.token || '');
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(jeton)) return yonlendir('/profil/?dogrulama=gecersiz');

  try {
    const sql = veritabani();
    const [r] = await sql`
      WITH j AS (
        UPDATE eposta_dogrulama SET kullanildi = TRUE
        WHERE token_hash = ${K.jetonKarmasi(jeton)} AND NOT kullanildi AND gecerlilik > now()
        RETURNING uye_id
      ),
      u AS (
        UPDATE uyeler SET dogrulandi = TRUE WHERE id = (SELECT uye_id FROM j)
        RETURNING id
      )
      SELECT (SELECT count(*)::int FROM u) AS tamam`;

    return yonlendir(r.tamam ? '/profil/?dogrulama=tamam' : '/profil/?dogrulama=gecersiz');
  } catch (e) {
    console.error('eposta-dogrula:', e.message);
    return yonlendir('/profil/?dogrulama=hata');
  }
}
