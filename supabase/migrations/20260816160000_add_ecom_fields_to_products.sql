-- Migration: Add E-commerce specific fields to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'draft';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_salvado boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS depth_use_length boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
