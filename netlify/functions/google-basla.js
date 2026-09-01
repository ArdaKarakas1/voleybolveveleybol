/**
 * GET /api/google-basla — Google girişini başlatır.
 * ?donus=/adres ile döndükten sonra gidilecek site içi sayfa verilebilir.
 */
import * as O from './_ortak/oauth.js';

export async function handler(event) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return O.hataylaDon('google-kapali');

  const { state, cerez } = O.stateBaslat(event.queryStringParameters?.donus);

  const adres = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: O.siteKoku(event) + '/api/google-donus',
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account'
  });

  return O.yonlendir(adres, [cerez]);
}
