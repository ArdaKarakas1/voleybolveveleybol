/**
 * Kimlik yardımcıları: parola karması, oturum jetonu, çerez, hız sınırı.
 *
 * Tasarım (mimari dokümanı bölüm 11):
 * - Parola: Node yerleşik scrypt, kullanıcı başına rastgele tuz.
 * - Oturum: 32 baytlık rastgele jeton çerezde; SHA-256 karması veritabanında.
 * - Çerez: HttpOnly + Secure + SameSite=Strict — aynı origin olduğumuz için mümkün.
 * - Yanlış e-posta ile yanlış parola AYNI mesajı döner ve her ikisinde de
 *   scrypt çalıştırılır (zamanlama farkıyla e-posta sızdırılmaz).
 */
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

export const CEREZ_AD = 'vvv_oturum';
export const OTURUM_OMRU_SN = 60 * 60 * 24 * 30; // 30 gün, her kullanımda tazelenir
const SCRYPT = { N: 16384, r: 8, p: 1, uzunluk: 32 };

/* ---------- parola ---------- */

export async function parolaKarmasi(parola) {
  const tuz = crypto.randomBytes(16);
  const tur = await scrypt(parola, tuz, SCRYPT.uzunluk, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, tuz.toString('base64'), tur.toString('base64')].join('$');
}

export async function parolaDogruMu(parola, kayit) {
  try {
    const [tip, N, r, p, tuzB64, turB64] = String(kayit).split('$');
    if (tip !== 'scrypt') return false;
    const beklenen = Buffer.from(turB64, 'base64');
    const tur = await scrypt(parola, Buffer.from(tuzB64, 'base64'), beklenen.length,
      { N: Number(N), r: Number(r), p: Number(p) });
    return crypto.timingSafeEqual(tur, beklenen);
  } catch {
    return false;
  }
}

// Kayıtlı olmayan e-postada da aynı süre harcansın diye kullanılan sahte karma.
const SAHTE_KARMA_SOZU = parolaKarmasi('zamanlama-esitleme-parolasi');
export async function zamanlamaEsitle(parola) {
  await parolaDogruMu(parola, await SAHTE_KARMA_SOZU);
}

/* ---------- oturum jetonu ---------- */

export function jetonUret() {
  return crypto.randomBytes(32).toString('base64url');
}

export function jetonKarmasi(jeton) {
  return crypto.createHash('sha256').update(jeton).digest('hex');
}

/* ---------- çerez ---------- */

export function oturumCerezi(jeton) {
  return `${CEREZ_AD}=${jeton}; Max-Age=${OTURUM_OMRU_SN}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function oturumCereziSil() {
  return `${CEREZ_AD}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function cerezdenJeton(headers) {
  const ham = (headers && (headers.cookie || headers.Cookie)) || '';
  for (const parca of ham.split(';')) {
    const [ad, ...deger] = parca.trim().split('=');
    if (ad === CEREZ_AD) return deger.join('=') || null;
  }
  return null;
}

/* ---------- oturum sorgulama ---------- */

/**
 * İstekteki çerezden üyeyi bulur. Geçerli oturum varsa ömrünü tazeler.
 * Dönüş: { uye, tokenHash } ya da null.
 */
export async function oturumdakiUye(sql, headers) {
  const jeton = cerezdenJeton(headers);
  if (!jeton) return null;
  const tokenHash = jetonKarmasi(jeton);
  const satirlar = await sql`
    UPDATE oturumlar o SET
      son_kullanim = now(),
      gecerlilik   = now() + make_interval(secs => ${OTURUM_OMRU_SN})
    FROM uyeler u
    WHERE o.token_hash = ${tokenHash} AND o.gecerlilik > now() AND u.id = o.uye_id
    RETURNING u.id, u.eposta, u.kullanici_adi, u.rol, u.dogrulandi, u.olusturuldu`;
  if (!satirlar.length) return null;
  return { uye: satirlar[0], tokenHash };
}

/* ---------- hız sınırı ---------- */

export function ipAnahtari(headers) {
  const ip = (headers && (headers['x-nf-client-connection-ip'] || headers['client-ip'])) || 'bilinmiyor';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/**
 * Kayan pencereli sınır: pencere içindeki deneme sayısı limiti aşarsa false.
 * Deneme her çağrıda kaydedilir; eski kayıtlar fırsat buldukça temizlenir.
 */
export async function hizSiniri(sql, anahtar, limit, pencereSn) {
  if (Math.random() < 0.05) {
    await sql`DELETE FROM hiz_sinir WHERE zaman < now() - interval '1 day'`;
  }
  await sql`INSERT INTO hiz_sinir (anahtar) VALUES (${anahtar})`;
  const [{ sayi }] = await sql`
    SELECT count(*)::int AS sayi FROM hiz_sinir
    WHERE anahtar = ${anahtar} AND zaman > now() - make_interval(secs => ${pencereSn})`;
  return sayi <= limit;
}

/* ---------- yanıt yardımcıları ---------- */

export function yanit(statusCode, govde, ekBaslik) {
  return {
    statusCode,
    headers: Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }, ekBaslik || {}),
    body: JSON.stringify(govde)
  };
}

export function govdeOku(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return null; }
}

