-- 0003 — Google ile giriş
-- Google ile açılan hesabın parolası yoktur; parola_hash artık boş olabilir.
-- Her hesabın en az bir giriş yöntemi olmalı — bunu CHECK garanti eder.

ALTER TABLE uyeler ALTER COLUMN parola_hash DROP NOT NULL;

ALTER TABLE uyeler ADD COLUMN google_id TEXT;

CREATE UNIQUE INDEX uyeler_google_tekil ON uyeler (google_id) WHERE google_id IS NOT NULL;

ALTER TABLE uyeler ADD CONSTRAINT uyeler_giris_yontemi
  CHECK (parola_hash IS NOT NULL OR google_id IS NOT NULL);
