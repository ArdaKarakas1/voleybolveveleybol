/**
 * public/data/quiz.json üretici.
 *
 * Soruların tek kaynağı db/sorular/genel-kural-testi.json. Bu betik, sayfanın
 * bugünkü hâlinin beklediği biçimi (s/o/d/e) o kaynaktan üretir.
 * quiz.json'ı ELLE DÜZENLEME — değişiklik kaynak dosyada yapılır, sonra:
 *
 *   node db/uret-quiz-json.mjs && npm run db:seed
 *
 * Not: dogru cevaplar (d) bu dosyayla tarayıcıya iniyor. Bu, Faz 2'de puanlama
 * sunucuya taşınana kadar bilinçli olarak böyle — skor henüz kaydedilmediği
 * için kopyanın bir kazancı yok.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const kaynak = JSON.parse(readFileSync(join(KOK, 'db/sorular/genel-kural-testi.json'), 'utf8'));

const cikti = {
  baslik: kaynak.set.baslik,
  goster: kaynak.set.goster ?? kaynak.sorular.length,
  sorular: kaynak.sorular.map((q) => ({ s: q.metin, o: q.secenekler, d: q.dogru_index, e: q.aciklama })),
  sonuclar: kaynak.set.sonuclar ?? []
};

writeFileSync(join(KOK, 'public/data/quiz.json'), JSON.stringify(cikti, null, 2) + '\n');
console.log(`quiz.json üretildi: ${cikti.sorular.length} soru havuzu, her denemede ${cikti.goster} gösterilecek`);
