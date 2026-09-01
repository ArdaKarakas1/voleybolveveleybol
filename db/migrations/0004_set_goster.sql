-- 0004 — Set başına gösterilecek soru sayısı
-- NULL = havuzun tamamı. Deneme başlarken sunucu havuzdan bu kadar soru seçer.

ALTER TABLE setler ADD COLUMN goster SMALLINT CHECK (goster IS NULL OR goster > 0);
