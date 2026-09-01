-- 0001 — Temel şema
-- Mimari dokümanı bölüm 07'deki yedi tablo.
-- Sıralama tablosu yok: denemelerden türetilen bir sorgu (bkz. denemeler_siralama indeksi).

CREATE TABLE uyeler (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  eposta        TEXT        NOT NULL,
  kullanici_adi TEXT        NOT NULL,
  parola_hash   TEXT        NOT NULL,
  rol           TEXT        NOT NULL DEFAULT 'uye' CHECK (rol IN ('uye', 'yonetici')),
  dogrulandi    BOOLEAN     NOT NULL DEFAULT FALSE,
  olusturuldu   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (eposta ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CHECK (kullanici_adi ~ '^[a-z0-9_]{3,24}$')
);

-- Tekillik büyük/küçük harfe duyarsız: Arda ile arda aynı kişidir.
CREATE UNIQUE INDEX uyeler_eposta_tekil        ON uyeler (lower(eposta));
CREATE UNIQUE INDEX uyeler_kullanici_adi_tekil ON uyeler (lower(kullanici_adi));

-- Çerezdeki jetonun kendisi değil, SHA-256 karması saklanır:
-- veritabanı sızsa bile oturum çalınamaz.
CREATE TABLE oturumlar (
  token_hash   TEXT        PRIMARY KEY,
  uye_id       BIGINT      NOT NULL REFERENCES uyeler(id) ON DELETE CASCADE,
  gecerlilik   TIMESTAMPTZ NOT NULL,
  olusturuldu  TIMESTAMPTZ NOT NULL DEFAULT now(),
  son_kullanim TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX oturumlar_uye        ON oturumlar (uye_id);
CREATE INDEX oturumlar_gecerlilik ON oturumlar (gecerlilik);

-- "Kural seti": bir test. Kaynağı repodaki db/sorular/*.json dosyaları;
-- seed betiği slug üzerinden eşleştirir.
CREATE TABLE setler (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,60}$'),
  baslik      TEXT        NOT NULL,
  aciklama    TEXT        NOT NULL DEFAULT '',
  kategori    TEXT        NOT NULL DEFAULT 'genel',
  zorluk      SMALLINT    NOT NULL DEFAULT 1 CHECK (zorluk BETWEEN 1 AND 3),
  yayinda     BOOLEAN     NOT NULL DEFAULT FALSE,
  olusturuldu TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- dogru_index bu tablodan tarayıcıya ASLA gönderilmez (doküman bölüm 06).
-- kaynak_no: sorunun repo dosyasındaki numarası; seed betiğinin eşleştirme anahtarı.
CREATE TABLE sorular (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  set_id      BIGINT   NOT NULL REFERENCES setler(id) ON DELETE CASCADE,
  kaynak_no   INTEGER  NOT NULL,
  metin       TEXT     NOT NULL,
  secenekler  JSONB    NOT NULL CHECK (jsonb_typeof(secenekler) = 'array'),
  dogru_index SMALLINT NOT NULL CHECK (dogru_index >= 0),
  aciklama    TEXT     NOT NULL DEFAULT '',
  sira        INTEGER  NOT NULL DEFAULT 0,
  UNIQUE (set_id, kaynak_no)
);

-- Skorun tek kaynağı. puan yalnızca sunucu tarafından yazılır.
CREATE TABLE denemeler (
  id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uye_id  BIGINT      NOT NULL REFERENCES uyeler(id) ON DELETE CASCADE,
  set_id  BIGINT      NOT NULL REFERENCES setler(id) ON DELETE CASCADE,
  durum   TEXT        NOT NULL DEFAULT 'suruyor'
                      CHECK (durum IN ('suruyor', 'tamamlandi', 'zaman_asimi')),
  basladi TIMESTAMPTZ NOT NULL DEFAULT now(),
  bitti   TIMESTAMPTZ,
  puan    INTEGER,
  toplam  INTEGER     NOT NULL,
  sure_sn INTEGER,
  CHECK (durum <> 'tamamlandi' OR (puan IS NOT NULL AND bitti IS NOT NULL))
);

CREATE INDEX denemeler_uye_set ON denemeler (uye_id, set_id);

-- Sıralama sorgusunun indeksi: set bazında en yüksek puan, eşitlikte kısa süre.
CREATE INDEX denemeler_siralama ON denemeler (set_id, puan DESC, sure_sn ASC)
  WHERE durum = 'tamamlandi';

-- Sunucunun karıştırdığı soru sırası ve verilen cevaplar.
-- secilen NULL = henüz cevaplanmadı; ikinci cevap uygulama katmanında reddedilir.
CREATE TABLE deneme_sorulari (
  deneme_id UUID     NOT NULL REFERENCES denemeler(id) ON DELETE CASCADE,
  soru_id   BIGINT   NOT NULL REFERENCES sorular(id) ON DELETE CASCADE,
  sira      INTEGER  NOT NULL,
  secilen   SMALLINT,
  dogru_mu  BOOLEAN,
  sure_ms   INTEGER,
  PRIMARY KEY (deneme_id, soru_id),
  UNIQUE (deneme_id, sira)
);

-- Tek kullanımlık, kısa ömürlü sıfırlama jetonları (karması saklanır).
CREATE TABLE sifre_sifirlama (
  token_hash  TEXT        PRIMARY KEY,
  uye_id      BIGINT      NOT NULL REFERENCES uyeler(id) ON DELETE CASCADE,
  gecerlilik  TIMESTAMPTZ NOT NULL,
  kullanildi  BOOLEAN     NOT NULL DEFAULT FALSE,
  olusturuldu TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sifre_sifirlama_uye ON sifre_sifirlama (uye_id);
