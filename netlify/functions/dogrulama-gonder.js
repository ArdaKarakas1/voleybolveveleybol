/**
 * POST /api/dogrulama-gonder — oturumdaki üyeye doğrulama e-postası yollar.
 * E-posta servisi yapılandırılmamışsa 503 'eposta-kapali' döner; site çalışır.
 */
import { veritabani } from './_ortak/db.js';
import * as K from './_ortak/kimlik.js';
import { epostaAktif, epostaGonder, sablon } from './_ortak/eposta.js';
import { siteKoku } from './_ortak/oauth.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return K.yanit(405, { hata: 'Yalnızca POST.' });

  try {
    const sql = veritabani();
    const oturum = await K.oturumdakiUye(sql, event.headers);
    if (!oturum) return K.yanit(401, { hata: 'Oturum yok.' });
    if (oturum.uye.dogrulandi) return K.yanit(200, { tamam: true, zaten: true });
    if (!epostaAktif()) return K.yanit(503, { hata: 'eposta-kapali' });

    // Saatte 3 gönderim — posta kutusu bombardımanı olmasın.
    if (!(await K.hizSiniri(sql, `dogrulama:${oturum.uye.id}`, 3, 3600)))
      return K.yanit(429, { hata: 'Çok sık istedin. Gelen kutunu (ve spam klasörünü) kontrol et.' });

    const jeton = K.jetonUret();
    await sql`
      INSERT INTO eposta_dogrulama (token_hash, uye_id, gecerlilik)
      VALUES (${K.jetonKarmasi(jeton)}, ${oturum.uye.id}, now() + interval '24 hours')`;

    const adres = `${siteKoku(event)}/api/eposta-dogrula?token=${jeton}`;
    await epostaGonder({
      kime: oturum.uye.eposta,
      konu: 'E-posta adresini doğrula — Voleybol ve Veleybol',
      html: sablon(
        'E-posta adresini doğrula',
        `Merhaba <strong>${oturum.uye.kullanici_adi}</strong>! Hesabını doğrulamak için aşağıdaki düğmeye tıkla. Bağlantı 24 saat geçerlidir.`,
        'Adresimi doğrula', adres)
    });

    return K.yanit(200, { tamam: true });
  } catch (e) {
    console.error('dogrulama-gonder:', e.message);
    return K.yanit(500, { hata: 'E-posta gönderilemedi. Birazdan tekrar dene.' });
  }
}
