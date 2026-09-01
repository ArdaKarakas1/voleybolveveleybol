/**
 * Veritabanı bağlantısı — Neon'un HTTP sürücüsü.
 * Her sorgu bağımsız bir HTTP isteğidir; bağlantı havuzu derdi yoktur,
 * serverless için doğru araç budur. Örnek modül düzeyinde önbelleklenir.
 */
import { neon } from '@neondatabase/serverless';

let sql = null;

function veritabani() {
  if (!process.env.DATABASE_URL) {
    const e = new Error('DATABASE_URL tanımlı değil — Netlify ortam değişkenlerini kontrol et.');
    e.statusCode = 500;
    throw e;
  }
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

export { veritabani };
