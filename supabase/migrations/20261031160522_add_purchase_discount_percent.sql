ALTER TABLE public.purchases
  ADD COLUMN discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
  CONSTRAINT purchases_discount_percent_range
  CHECK (discount_percent >= 0 AND discount_percent <= 100);
