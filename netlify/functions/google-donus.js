/**
 * GET /api/google-donus — Google'dan dönüş: code → id_token → üye → oturum.
 */
import { veritabani } from './_ortak/db.js';
import * as O from './_ortak/oauth.js';

export async function handler(event) {
  const q = event.queryStringParameters || {};
  const durum = O.stateCoz(event.headers);

  if (q.error) return O.hataylaDon('google-iptal');
  if (!q.code || !durum || durum.state !== q.state)
    return O.hataylaDon('google-state');

  try {
    const cevap = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: q.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: O.siteKoku(event) + '/api/google-donus',
        grant_type: 'authorization_code'
      })
    });
    if (!cevap.ok) {
      console.error('google token:', cevap.status, (await cevap.text()).slice(0, 200));
      return O.hataylaDon('google-basarisiz');
    }

    const kimlikler = O.jwtGovdesi((await cevap.json()).id_token);
    if (!kimlikler?.sub) return O.hataylaDon('google-basarisiz');

    const sql = veritabani();
    const uye = await O.uyeBulVeyaOlustur(sql, {
      kimlik: kimlikler.sub,
      eposta: kimlikler.email,
      epostaDogrulandi: kimlikler.email_verified === true || kimlikler.email_verified === 'true'
    });
    return await O.oturumAcVeDon(sql, uye.id, durum.donus);
  } catch (e) {
    console.error('google-donus:', e.message);
    return O.hataylaDon(e.kod || 'google-basarisiz');
  }
}
