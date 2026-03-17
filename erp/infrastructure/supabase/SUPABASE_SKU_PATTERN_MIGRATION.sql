-- MIGRACAO DE PADRAO DE SKU: LLL-NNNNN
-- 3 LETRAS (BASEADAS NO TIPO E LINHA) + '-' + 5 NUMEROS SEQUENCIAIS

-- 1. Funcao para gerar as letras do prefixo
CREATE OR REPLACE FUNCTION fn_generate_sku_prefix(p_type_name TEXT, p_line TEXT, p_description TEXT)
RETURNS TEXT AS $$
DECLARE
    letters TEXT := '';
    clean_line TEXT;
BEGIN
    -- Prefixo do Tipo (1a letra)
    IF p_type_name IS NOT NULL AND length(trim(p_type_name)) >= 1 THEN
        letters := letters || upper(substring(trim(p_type_name) from 1 for 1));
    END IF;
    
    -- Prefixo da Linha (2 letras)
    clean_line := trim(p_line);
    IF clean_line IS NOT NULL AND length(clean_line) >= 2 THEN
        letters := letters || upper(substring(clean_line from 1 for 2));
    ELSIF clean_line IS NOT NULL AND length(clean_line) = 1 THEN
        letters := letters || upper(clean_line) || 'X';
    END IF;
    
    -- Se nao atingiu 3 letras, complementa com o inicio da descricao
    IF length(letters) < 3 THEN
        letters := letters || substring(upper(replace(trim(p_description), ' ', '')) from 1 for (3 - length(letters)));
    END IF;
    
    RETURN substring(letters from 1 for 3);
END;
$$ LANGUAGE plpgsql;

-- 2. Atualizacao Massiva de Produtos Existentes
-- IMPORTANTE: Esta operacao pode invalidar SKUs antigos se ja estiverem impressos/etiquetados.
DO $$
DECLARE
    r RECORD;
    new_prefix TEXT;
    next_num INT;
    new_sku TEXT;
BEGIN
    -- Vamos reprocessar todos os produtos nao excluidos
    FOR r IN (
        SELECT id, description, product_type_name, line 
        FROM products 
        WHERE deleted = false 
        ORDER BY created_at ASC
    ) LOOP
        new_prefix := fn_generate_sku_prefix(r.product_type_name, r.line, r.description);
        
        -- Busca o proximo numero disponivel para este prefixo
        SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(code from 5 for 5), '[^0-9]', '', 'g'), '')::INT), 0) + 1
        INTO next_num
        FROM products
        WHERE code LIKE new_prefix || '-%';
        
        new_sku := new_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
        
        UPDATE products SET code = new_sku WHERE id = r.id;
    END LOOP;
END $$;

-- 3. Trigger opcional para novos produtos sem SKU
-- Se o usuario nao preencher o SKU, o banco gera automaticamente no novo padrao
CREATE OR REPLACE FUNCTION trg_auto_generate_sku()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INT;
BEGIN
    -- Só gera se o código estiver vazio ou nulo ou se for apenas o prefixo sugerido pelo front (ex: "XXX-")
    IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE '%-' THEN
        v_prefix := fn_generate_sku_prefix(NEW.product_type_name, NEW.line, NEW.description);
        
        SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(code from 5 for 5), '[^0-9]', '', 'g'), '')::INT), 0) + 1
        INTO v_next_num
        FROM products
        WHERE code LIKE v_prefix || '-%';
        
        NEW.code := v_prefix || '-' || LPAD(v_next_num::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tgr_auto_sku ON products;
CREATE TRIGGER tgr_auto_sku
    BEFORE INSERT OR UPDATE OF code, product_type_name, line, description
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION trg_auto_generate_sku();
