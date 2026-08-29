ALTER TABLE public.goods_receipts
    ADD COLUMN IF NOT EXISTS fiscal_key TEXT,
    ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
