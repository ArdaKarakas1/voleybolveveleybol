/**
 * POST /api/sifre-yenile — jetonla yeni parola belirler.
 * Girdi: { token, parola }. Başarıda üyenin TÜM oturumları kapatılır
 * (parola sızdıysa açık oturumlar da ölsün) ve yeni oturum açılır.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  const govde = K.govdeOku(event);
  const jeton = String(govde?.token || '');
  const parola = String(govde?.parola || '');
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(jeton)) return K.yanit(400, { hata: 'Bağlantı geçersiz. Yeni bir sıfırlama iste.' });
  if (parola.length < 10 || parola.length > 200)
    return K.yanit(400, { hata: 'Parola en az 10 karakter olmalı.', alan: 'parola' });

  try {
    const sql = veritabani();
    const parolaHash = await K.parolaKarmasi(parola);

    const [r] = await sql`
      WITH j AS (
        UPDATE sifre_sifirlama SET kullanildi = TRUE
        WHERE token_hash = ${K.jetonKarmasi(jeton)} AND NOT kullanildi AND gecerlilik > now()
        RETURNING uye_id
      ),
      u AS (
        UPDATE uyeler SET parola_hash = ${parolaHash}, dogrulandi = TRUE
        WHERE id = (SELECT uye_id FROM j)
        RETURNING id, eposta, kullanici_adi, dogrulandi
      ),
      temizle AS (
        DELETE FROM oturumlar WHERE uye_id = (SELECT id FROM u)
      )
      SELECT (SELECT id FROM u) AS id, (SELECT eposta FROM u) AS eposta,
             (SELECT kullanici_adi FROM u) AS kullanici_adi`;

    if (!r.id) return K.yanit(400, { hata: 'Bağlantının süresi dolmuş ya da kullanılmış. Yeni bir sıfırlama iste.' });

    // Sıfırlama e-postayla yapıldığı için adres de doğrulanmış sayılır.
    const yeniJeton = K.jetonUret();
    await sql`
      INSERT INTO oturumlar (token_hash, uye_id, gecerlilik)
      VALUES (${K.jetonKarmasi(yeniJeton)}, ${r.id}, now() + make_interval(secs => ${K.OTURUM_OMRU_SN}))`;

    return K.yanit(200,
      { uye: { kullanici_adi: r.kullanici_adi, eposta: r.eposta } },
      { 'set-cookie': K.oturumCerezi(yeniJeton) });
  } catch (e) {
    console.error('sifre-yenile:', e.message);
    return K.yanit(500, { hata: 'Parola değiştirilemedi. Tekrar dene.' });
  }
}
