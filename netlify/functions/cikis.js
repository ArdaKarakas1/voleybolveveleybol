/**
 * POST /api/cikis — oturumu kapat.
 * Veritabanındaki oturum kaydını siler ve çerezi düşürür.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  try {
    const jeton = K.cerezdenJeton(event.headers);
    if (jeton) {
      const sql = veritabani();
      await sql`DELETE FROM oturumlar WHERE token_hash = ${K.jetonKarmasi(jeton)}`;
    }
  } catch (e) {
    // Çerez yine de düşürülür; çıkış isteği kullanıcı için her koşulda "başarılı" olmalı.
    console.error('cikis:', e.message);
  }

  return K.yanit(200, { tamam: true }, { 'set-cookie': K.oturumCereziSil() });
}
