-- =============================================================================
-- Migration: 20260912170000_cleanup_legacy_jsonb_columns.sql
-- Objetivo: Limpeza/anulação segura das colunas legadas JSONB em goods_receipts,
--           purchases, inbound_invoices e orders, consolidando a arquitetura 100%
--           normalizada no ERP Morante Hub.
-- Backup: Todos os dados originais e o schema de mapeamento foram previamente
--         salvos e arquivados em:
--         supabase/backups/legacy_jsonb_backup_20260912/
-- =============================================================================

DO $$
BEGIN
    -- 1. Goods Receipts: Limpar campo items da tabela goods_receipts
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goods_receipts' AND column_name = 'items'
    ) THEN
        UPDATE public.goods_receipts SET items = '[]'::jsonb WHERE items IS NOT NULL AND items != '[]'::jsonb;
    END IF;

    -- 2. Purchases: Limpar campo items da tabela purchases
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'items'
    ) THEN
        UPDATE public.purchases SET items = '[]'::jsonb WHERE items IS NOT NULL AND items != '[]'::jsonb;
    END IF;

    -- 3. Inbound Invoices: Limpar campo itens da tabela inbound_invoices
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inbound_invoices' AND column_name = 'itens'
    ) THEN
        UPDATE public.inbound_invoices SET itens = '[]'::jsonb WHERE itens IS NOT NULL AND itens != '[]'::jsonb;
    END IF;

    -- 4. Orders: Anular o campo order_data e items mantendo apenas como nulo/vazio
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'items'
    ) THEN
        UPDATE public.orders SET items = '[]'::jsonb WHERE items IS NOT NULL AND items != '[]'::jsonb;
    END IF;
END $$;
