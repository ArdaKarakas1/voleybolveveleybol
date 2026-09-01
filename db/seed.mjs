/**
 * Soru senkronizasyonu: db/sorular/*.json → veritabanı.
 *
 * Sorular repoda yaşar (karar: yönetim ekranı yok, sürüm geçmişi git'te).
 * Bu betik her dosya için seti slug ile, soruları (set_id, kaynak_no) ile
 * eşleştirip ekler/günceller. Tekrar çalıştırmak güvenlidir.
 *
 * Dosyadan silinen sorular veritabanından SİLİNMEZ — geçmiş denemelerin
 * cevap kayıtları o sorulara bağlı. Silinenler uyarı olarak raporlanır;
 * gerekirse elle karar verilir.
 *
 * Kullanım: npm run db:seed
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@neondatabase/serverless';

const KLASOR = join(dirname(fileURLToPath(import.meta.url)), 'sorular');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('HATA: DATABASE_URL tanımlı değil.');
  process.exit(1);
}

function dogrula(veri, dosya) {
  const s = veri.set;
  if (!s?.slug || !s?.baslik) throw new Error(`${dosya}: set.slug ve set.baslik zorunlu`);
  if (!Array.isArray(veri.sorular) || veri.sorular.length === 0)
    throw new Error(`${dosya}: sorular boş`);
  const gorulen = new Set();
  for (const q of veri.sorular) {
    if (!Number.isInteger(q.kaynak_no) || q.kaynak_no < 1)
      throw new Error(`${dosya}: kaynak_no eksik/bozuk (${JSON.stringify(q.metin)})`);
    if (gorulen.has(q.kaynak_no)) throw new Error(`${dosya}: kaynak_no ${q.kaynak_no} iki kez var`);
    gorulen.add(q.kaynak_no);
    if (!q.metin || !Array.isArray(q.secenekler) || q.secenekler.length < 2)
      throw new Error(`${dosya}: soru ${q.kaynak_no} — metin/secenekler bozuk`);
    if (!Number.isInteger(q.dogru_index) || q.dogru_index < 0 || q.dogru_index >= q.secenekler.length)
      throw new Error(`${dosya}: soru ${q.kaynak_no} — dogru_index seçeneklerin dışında`);
  }
}

const client = new Client({ connectionString: url });
await client.connect();

try {
  const dosyalar = (await readdir(KLASOR)).filter((f) => f.endsWith('.json')).sort();
  for (const dosya of dosyalar) {
    const veri = JSON.parse(await readFile(join(KLASOR, dosya), 'utf8'));
    dogrula(veri, dosya);
    const s = veri.set;

    await client.query('BEGIN');
    try {
      const { rows: [set] } = await client.query(
        `INSERT INTO setler (slug, baslik, aciklama, kategori, zorluk, yayinda)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           baslik = EXCLUDED.baslik, aciklama = EXCLUDED.aciklama,
           kategori = EXCLUDED.kategori, zorluk = EXCLUDED.zorluk,
           yayinda = EXCLUDED.yayinda
         RETURNING id`,
        [s.slug, s.baslik, s.aciklama ?? '', s.kategori ?? 'genel', s.zorluk ?? 1, s.yayinda ?? false]
      );

      let eklendi = 0, guncellendi = 0;
      for (const q of veri.sorular) {
        const { rows: [r] } = await client.query(
          `INSERT INTO sorular (set_id, kaynak_no, metin, secenekler, dogru_index, aciklama, sira)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
           ON CONFLICT (set_id, kaynak_no) DO UPDATE SET
             metin = EXCLUDED.metin, secenekler = EXCLUDED.secenekler,
             dogru_index = EXCLUDED.dogru_index, aciklama = EXCLUDED.aciklama,
             sira = EXCLUDED.sira
           RETURNING (xmax = 0) AS yeni`,
          [set.id, q.kaynak_no, q.metin, JSON.stringify(q.secenekler),
           q.dogru_index, q.aciklama ?? '', q.kaynak_no]
        );
        r.yeni ? eklendi++ : guncellendi++;
      }

      const { rows: fazla } = await client.query(
        `SELECT kaynak_no FROM sorular WHERE set_id = $1 AND NOT (kaynak_no = ANY($2::int[]))
         ORDER BY kaynak_no`,
        [set.id, veri.sorular.map((q) => q.kaynak_no)]
      );

      await client.query('COMMIT');
      console.log(`  ${s.slug}: ${eklendi} eklendi, ${guncellendi} güncellendi` +
        (fazla.length ? ` — UYARI: dosyada olmayan ${fazla.length} soru veritabanında duruyor (kaynak_no: ${fazla.map((r) => r.kaynak_no).join(', ')})` : ''));
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
  console.log('Tamam.');
} finally {
  await client.end();
}
