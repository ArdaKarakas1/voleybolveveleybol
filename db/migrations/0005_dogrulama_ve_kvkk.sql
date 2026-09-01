-- 0005 — E-posta doğrulama jetonları + KVKK onay zamanı

-- Tek kullanımlık, kısa ömürlü doğrulama jetonları (karması saklanır,
-- sifre_sifirlama ile aynı desen).
CREATE TABLE eposta_dogrulama (
  token_hash  TEXT        PRIMARY KEY,
  uye_id      BIGINT      NOT NULL REFERENCES uyeler(id) ON DELETE CASCADE,
  gecerlilik  TIMESTAMPTZ NOT NULL,
  kullanildi  BOOLEAN     NOT NULL DEFAULT FALSE,
  olusturuldu TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX eposta_dogrulama_uye ON eposta_dogrulama (uye_id);

-- KVKK aydınlatma metninin onaylandığı an — kayıt formundaki kutucuk.
-- Eski hesaplarda NULL kalır (onay metni yayına girmeden açılmışlardır).
ALTER TABLE uyeler ADD COLUMN kvkk_onayi TIMESTAMPTZ;
