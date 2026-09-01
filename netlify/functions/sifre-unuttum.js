/**
 * POST /api/sifre-unuttum — sıfırlama bağlantısı gönderir.
 * Girdi: { eposta }. E-postanın kayıtlı olup olmadığı ASLA belli edilmez:
 * her durumda aynı 200 döner (hesap keşfi engellenir).
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';
import { epostaAktif, epostaGonder, sablon } from './_ortak/eposta.js';
import { siteKoku } from './_ortak/oauth.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });
  if (!epostaAktif()) return K.yanit(503, { hata: 'eposta-kapali' });

  const eposta = String(K.govdeOku(event)?.eposta || '').trim().toLowerCase();
  if (!eposta) return K.yanit(400, { hata: 'E-posta gerekli.' });

  const AYNI_CEVAP = K.yanit(200, { tamam: true, mesaj: 'Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi.' });

  try {
    const sql = veritabani();
    if (!(await K.hizSiniri(sql, `sifirla:${K.ipAnahtari(event.headers)}`, 5, 3600)))
      return K.yanit(429, { hata: 'Çok fazla istek. Bir süre sonra tekrar dene.' });

    const [uye] = await sql`
      SELECT id, kullanici_adi, parola_hash FROM uyeler WHERE lower(eposta) = ${eposta}`;

    // Yalnızca parolası olan hesaplara gönderilir (Google hesabının sıfırlanacak
    // parolası yok); iki durumda da dışarıya aynı cevap.
    if (uye && uye.parola_hash) {
      const jeton = K.jetonUret();
      await sql`
        INSERT INTO sifre_sifirlama (token_hash, uye_id, gecerlilik)
        VALUES (${K.jetonKarmasi(jeton)}, ${uye.id}, now() + interval '30 minutes')`;
      const adres = `${siteKoku(event)}/sifre-yenile/?token=${jeton}`;
      await epostaGonder({
        kime: eposta,
        konu: 'Parola sıfırlama — Voleybol ve Veleybol',
        html: sablon(
          'Parolanı sıfırla',
          `Merhaba <strong>${uye.kullanici_adi}</strong>! Yeni bir parola belirlemek için aşağıdaki düğmeye tıkla. Bağlantı <strong>30 dakika</strong> geçerlidir ve bir kez kullanılabilir.`,
          'Yeni parola belirle', adres)
      });
    }
    return AYNI_CEVAP;
  } catch (e) {
    console.error('sifre-unuttum:', e.message);
    return AYNI_CEVAP; // hata bile hesap varlığını ele vermesin
  }
}
