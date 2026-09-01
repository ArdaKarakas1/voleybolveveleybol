/**
 * GET /api/ben — oturumdaki üyenin bilgisi.
 * Her sayfa yüklenişinde üst menünün kimlik alanını doldurmak için çağrılır.
 * Geçerli oturumun ömrünü tazeler (30 güne kayan pencere).
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return K.yanit(405, { hata: 'Yalnızca GET.' });

  try {
    const oturum = await K.oturumdakiUye(veritabani(), event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Oturum yok.' });
    const u = oturum.uye;
    return K.yanit(200, {
      uye: {
        kullanici_adi: u.kullanici_adi,
        eposta: u.eposta,
        rol: u.rol,
        dogrulandi: u.dogrulandi,
        olusturuldu: u.olusturuldu
      }
    });
  } catch (e) {
    console.error('ben:', e.message);
    return K.yanit(e.statusCode || 500, { hata: 'Oturum bilgisi alınamadı.' });
  }
}
