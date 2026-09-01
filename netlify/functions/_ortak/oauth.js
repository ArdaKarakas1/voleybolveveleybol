/**
 * Google OAuth ortak parçaları.
 *
 * Akış:
 *   /api/google-basla → state üret, kısa ömürlü çereze yaz, Google'a yönlendir
 *   /api/google-donus → state doğrula, code'u jetonla değiştir, id_token'daki
 *                       kimlikle üyeyi bul/oluştur/bağla, oturum aç, siteye dön
 *
 * id_token doğrudan Google'ın token ucundan TLS ile geldiği için imza
 * doğrulaması gerekmez — içerik zaten kaynağından alınmıştır.
 */
import crypto from 'node:crypto';
import * as K from './kimlik.js';

const STATE_CEREZ = 'vvv_oauth';

/* ---------- state çerezi (CSRF koruması) ---------- */

export function stateBaslat(donus) {
  const state = crypto.randomBytes(24).toString('base64url');
  const guvenliDonus = (typeof donus === 'string' && donus.startsWith('/') && !donus.startsWith('//'))
    ? donus : '/profil/';
  const yuk = Buffer.from(JSON.stringify({ state, donus: guvenliDonus })).toString('base64url');
  return {
    state,
    // Lax: Google'dan dönüş üst düzey GET yönlendirmesidir, Lax çerez taşınır.
    cerez: `${STATE_CEREZ}=${yuk}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`
  };
}

export function stateCoz(headers) {
  const ham = (headers && (headers.cookie || headers.Cookie)) || '';
  for (const parca of ham.split(';')) {
    const [ad, ...deger] = parca.trim().split('=');
    if (ad === STATE_CEREZ) {
      try { return JSON.parse(Buffer.from(deger.join('='), 'base64url').toString()); }
      catch { return null; }
    }
  }
  return null;
}

export const stateCereziSil = `${STATE_CEREZ}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;

/* ---------- yönlendirme yanıtları ---------- */

export function yonlendir(adres, cerezler) {
  return {
    statusCode: 302,
    headers: { location: adres, 'cache-control': 'no-store' },
    multiValueHeaders: cerezler ? { 'set-cookie': cerezler } : undefined,
    body: ''
  };
}

export function hataylaDon(kod) {
  return yonlendir('/giris/?hata=' + encodeURIComponent(kod), [stateCereziSil]);
}

/* ---------- üye bul / bağla / oluştur ---------- */

function adAdayi(eposta) {
  let ad = String(eposta).split('@')[0].toLowerCase()
    .replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    .slice(0, 20);
  if (ad.length < 3) ad = 'uye_' + ad;
  return ad;
}

/**
 * Google kimliğiyle üyeyi bulur; yoksa doğrulanmış e-posta üzerinden mevcut
 * hesaba bağlar; o da yoksa yeni hesap açar. Dönüş: uye satırı.
 */
export async function uyeBulVeyaOlustur(sql, { kimlik, eposta, epostaDogrulandi }) {
  let satirlar = await sql`
    SELECT id, eposta, kullanici_adi, dogrulandi FROM uyeler WHERE google_id = ${kimlik}`;
  if (satirlar.length) return satirlar[0];

  // Aynı doğrulanmış e-postayla parola hesabı varsa: bağla. (Google e-postayı
  // doğruladığı için hesabın sahibi olduğu kesin — hesap ele geçirme riski yok.)
  if (eposta && epostaDogrulandi) {
    satirlar = await sql`
      UPDATE uyeler SET google_id = ${kimlik}, dogrulandi = TRUE
      WHERE lower(eposta) = ${eposta.toLowerCase()}
      RETURNING id, eposta, kullanici_adi, dogrulandi`;
    if (satirlar.length) return satirlar[0];
  }

  if (!eposta) {
    const e = new Error('Google e-posta adresi vermedi.');
    e.kod = 'eposta-yok';
    throw e;
  }

  // Yeni hesap: kullanıcı adı e-postanın yerel kısmından türetilir; çakışırsa
  // rastgele son ek denenir.
  const taban = adAdayi(eposta);
  for (let deneme = 0; deneme < 6; deneme++) {
    const ad = deneme === 0 ? taban
      : (taban.slice(0, 18) + '_' + crypto.randomInt(100, 9999)).slice(0, 24);
    try {
      const [uye] = await sql`
        INSERT INTO uyeler (eposta, kullanici_adi, google_id, dogrulandi, kvkk_onayi)
        VALUES (${eposta.toLowerCase()}, ${ad}, ${kimlik}, ${!!epostaDogrulandi}, now())
        RETURNING id, eposta, kullanici_adi, dogrulandi`;
      return uye;
    } catch (e) {
      if (e.code === '23505' && String(e.message).includes('kullanici_adi')) continue;
      if (e.code === '23505' && String(e.message).includes('eposta')) {
        // E-posta kayıtlı ama Google adresi doğrulamamış: bağlamak güvensiz
        // (doğrulanmamış adresle başkasının hesabı ele geçirilebilir),
        // yeni hesap da açılamaz. Kullanıcı parolasıyla girsin.
        const h = new Error('E-posta kayıtlı ama Google tarafında doğrulanmamış.');
        h.kod = 'eposta-dogrulanmamis';
        throw h;
      }
      throw e;
    }
  }
  throw new Error('Uygun kullanıcı adı üretilemedi.');
}

/** Oturum açıp kullanıcıyı dönüş adresine yollar. */
export async function oturumAcVeDon(sql, uyeId, donus) {
  const jeton = K.jetonUret();
  await sql`
    INSERT INTO oturumlar (token_hash, uye_id, gecerlilik)
    VALUES (${K.jetonKarmasi(jeton)}, ${uyeId}, now() + make_interval(secs => ${K.OTURUM_OMRU_SN}))`;
  return yonlendir(donus, [K.oturumCerezi(jeton), stateCereziSil]);
}

/** JWT gövdesini (imzayı doğrulamadan) çözer — token ucu TLS'ten geldiği için yeterli. */
export function jwtGovdesi(idToken) {
  try {
    return JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString());
  } catch {
    return null;
  }
}

export function siteKoku(event) {
  const host = (event.headers && (event.headers.host || event.headers.Host)) || 'voleybolveveleybol.com';
  return `https://${host}`;
}
