/**
 * POST /api/hesap-sil — hesabı kalıcı olarak siler (KVKK: silme hakkı).
 * Girdi: { onay } — yanlışlıkla silmeye karşı kullanıcı adının aynısı yazılmalı.
 * Üye satırı silinince oturumlar, denemeler ve cevaplar CASCADE ile gider;
 * sıralamadan da düşer. Geri dönüşü yoktur.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Oturum yok.' });

    const onay = String(K.govdeOku(event)?.onay || '').trim().toLowerCase();
    if (onay !== oturum.uye.kullanici_adi)
      return K.yanit(400, { hata: 'Onay için kullanıcı adını aynen yazmalısın.', alan: 'onay' });

    await sql`DELETE FROM uyeler WHERE id = ${oturum.uye.id}`;

    return K.yanit(200, { tamam: true }, { 'set-cookie': K.oturumCereziSil() });
  } catch (e) {
    console.error('hesap-sil:', e.message);
    return K.yanit(500, { hata: 'Hesap silinemedi. Tekrar dene.' });
  }
}
