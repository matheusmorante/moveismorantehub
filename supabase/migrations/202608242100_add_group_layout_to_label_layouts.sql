ALTER TABLE public.label_layouts
    ADD COLUMN IF NOT EXISTS de_price_por_group_pos_x NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS de_price_por_group_pos_y NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS de_price_por_group_rotation NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS de_price_por_group_gap NUMERIC NOT NULL DEFAULT 10;
