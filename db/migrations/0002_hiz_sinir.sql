-- 0002 — Hız sınırlama kayıtları
-- Kayıt ve giriş denemeleri IP/e-posta başına sınırlanır (doküman bölüm 11).
-- Bellek içi sayaç yerine tablo: fonksiyon örnekleri arasında ortak ve
-- soğuk başlatmada sıfırlanmaz. anahtar ham IP değil, karmasını içerir.

CREATE TABLE hiz_sinir (
  anahtar TEXT        NOT NULL,
  zaman   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX hiz_sinir_anahtar_zaman ON hiz_sinir (anahtar, zaman);
