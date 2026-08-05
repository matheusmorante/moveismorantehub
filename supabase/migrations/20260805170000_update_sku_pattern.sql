-- Migration: Update SKU Pattern to 3 letters of first word of title and 6 digits sequential.

-- 1. Function to generate SKU Prefix based on first word of the title
CREATE OR REPLACE FUNCTION fn_generate_sku_prefix(p_description TEXT)
RETURNS TEXT AS $$
DECLARE
    first_word TEXT;
    prefix TEXT := '';
BEGIN
    -- Extract first word, trim and replace non-alphabetic/numeric characters
    first_word := split_part(trim(p_description), ' ', 1);
    first_word := regexp_replace(first_word, '[^a-zA-Z0-9]', '', 'g');
    
    IF length(first_word) >= 3 THEN
        prefix := upper(substring(first_word from 1 for 3));
    ELSE
        prefix := upper(rpad(first_word, 3, 'X'));
    END IF;
    
    RETURN prefix;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger function to auto generate SKU for products
CREATE OR REPLACE FUNCTION trg_auto_generate_sku()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INT;
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE '%-' THEN
        v_prefix := fn_generate_sku_prefix(NEW.description);
        
        -- Find next available 6-digit sequence for this prefix
        SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(code from 5 for 6), '[^0-9]', '', 'g'), '')::INT), 0) + 1
        INTO v_next_num
        FROM products
        WHERE code LIKE v_prefix || '-%';
        
        NEW.code := v_prefix || '-' || LPAD(v_next_num::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tgr_auto_sku ON products;
CREATE TRIGGER tgr_auto_sku
    BEFORE INSERT OR UPDATE OF code, description
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION trg_auto_generate_sku();
