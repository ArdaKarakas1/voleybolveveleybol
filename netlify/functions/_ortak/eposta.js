/**
 * E-posta gönderimi — Resend API üzerinden, bağımlılıksız (fetch).
 *
 * Ortam değişkenleri:
 *   RESEND_API_KEY  — yoksa gönderim kapalıdır; uçlar bunu kullanıcıya
 *                     anlaşılır biçimde söyler, site çalışmaya devam eder.
 *   EPOSTA_GONDEREN — "Voleybol ve Veleybol <no-reply@voleybolveveleybol.com>"
 *                     Alan adı Resend'de doğrulanana kadar test göndereni
 *                     "onboarding@resend.dev" kullanılabilir.
 */

export const epostaAktif = () => !!process.env.RESEND_API_KEY;

export async function epostaGonder({ kime, konu, html }) {
  const cevap = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EPOSTA_GONDEREN || 'Voleybol ve Veleybol <onboarding@resend.dev>',
      to: [kime],
      subject: konu,
      html
    })
  });
  if (!cevap.ok) {
    const detay = (await cevap.text()).slice(0, 300);
    throw new Error(`Resend ${cevap.status}: ${detay}`);
  }
}

/** Ortak e-posta gövdesi — sade, istemci uyumlu HTML. */
export function sablon(baslik, metin, dugmeMetni, dugmeAdres) {
  return `<!doctype html><html lang="tr"><body style="margin:0;padding:32px 16px;background:#FEF6E5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#14213D">
  <div style="max-width:480px;margin:0 auto;background:#FFFDF7;border:1px solid rgba(20,33,61,.12);border-radius:16px;padding:32px">
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#E8722B;font-weight:700">Voleybol ve Veleybol</p>
    <h1 style="margin:0 0 14px;font-size:22px">${baslik}</h1>
    <p style="margin:0 0 22px;line-height:1.6">${metin}</p>
    <a href="${dugmeAdres}" style="display:inline-block;background:#14213D;color:#FFFFFF;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:12px">${dugmeMetni}</a>
    <p style="margin:26px 0 0;font-size:13px;color:#56618A;line-height:1.6">
      Düğme çalışmazsa bu adresi tarayıcına yapıştır:<br>
      <span style="word-break:break-all">${dugmeAdres}</span>
    </p>
    <p style="margin:18px 0 0;font-size:13px;color:#56618A">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>
  </div>
</body></html>`;
}
