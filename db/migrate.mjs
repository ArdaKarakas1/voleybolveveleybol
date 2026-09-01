/**
 * Göç çalıştırıcısı.
 *
 * db/migrations/ altındaki .sql dosyalarını ad sırasıyla uygular ve
 * uygulananları veritabanındaki _gocler tablosunda işaretler — aynı dosya
 * iki kez çalışmaz. Yeni bir şema değişikliği = yeni numaralı .sql dosyası;
 * uygulanmış bir dosyayı düzenlemek yasak (o iş yeni dosyada yapılır).
 *
 * Kullanım: npm run db:migrate  (DATABASE_URL'i .env.local'dan okur)
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@neondatabase/serverless';

const KLASOR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('HATA: DATABASE_URL tanımlı değil. `neon link` çalıştırıldı mı, .env.local var mı?');
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _gocler (
      dosya     TEXT        PRIMARY KEY,
      uygulandi TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const dosyalar = (await readdir(KLASOR)).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await client.query('SELECT dosya FROM _gocler');
  const uygulanmis = new Set(rows.map((r) => r.dosya));

  let sayi = 0;
  for (const dosya of dosyalar) {
    if (uygulanmis.has(dosya)) {
      console.log(`  atlandı  ${dosya} (zaten uygulanmış)`);
      continue;
    }
    const sql = await readFile(join(KLASOR, dosya), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _gocler (dosya) VALUES ($1)', [dosya]);
      await client.query('COMMIT');
      console.log(`  uygulandı ${dosya}`);
      sayi++;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`  HATA     ${dosya}: ${e.message}`);
      process.exit(1);
    }
  }
  console.log(sayi ? `Tamam: ${sayi} göç uygulandı.` : 'Tamam: veritabanı zaten güncel.');
} finally {
  await client.end();
}
