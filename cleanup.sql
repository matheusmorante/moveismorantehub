-- Migration: Limpeza de Duplicatas de Teste - Etapa 1.5
-- Objetivo: Remover os 64 registros de teste isolados sem vínculos

BEGIN;

LOCK TABLE products IN EXCLUSIVE MODE;
LOCK TABLE product_variations IN EXCLUSIVE MODE;

DO $$
DECLARE
    v_count INT;
    v_deleted_vars INT;
    v_deleted_prods INT;
    v_duplicates INT;
    v_fk RECORD;
    v_query TEXT;
BEGIN
    CREATE TEMP TABLE tmp_garbage_products (id UUID PRIMARY KEY, name TEXT NOT NULL) ON COMMIT DROP;
    INSERT INTO tmp_garbage_products (id, name) VALUES
    ('1703a42a-5bfb-499e-9be6-350022bd5357', '[teste_aut]_draft_1789504402157 Guarda-Roupa F├¬nix Draft'),
    ('d7830e15-4caa-4dc8-a9ad-9c9b70bbdaa9', '[teste_aut]_draft_1789497231862 Guarda-Roupa F├¬nix Draft'),
    ('b4835cb6-5dec-4c16-b7d2-e37c8a094ac1', '[teste_aut]_draft_1789497279392 Sof├í Draft Conclus├úo'),
    ('0bbc06ba-1a33-4b2b-893f-030df22b85dc', '[teste_aut]_draft_1789497988601 Poltrona Draft'),
    ('372a0ffd-4415-4e4f-9fc7-018180366cfb', '[teste_aut]_draft_1789498063921 Guarda-Roupa F├¬nix Draft'),
    ('c051fb8c-dca5-4371-ab3c-762294eeacb7', '[teste_aut]_draft_1789498160854 Sof├í Draft Conclus├úo'),
    ('4f999ffa-8a70-4d36-81c5-aa99377c0be0', '[teste_aut]_draft_1789500590840 Guarda-Roupa F├¬nix Draft'),
    ('a658223d-57a4-4be6-b3e0-8bef2ac147f8', '[teste_aut]_draft_1789500661608 Sof├í Draft Conclus├úo'),
    ('e76519a1-04d6-41b6-8e58-e1e8b4d56f57', '[teste_aut]_draft_1789501856871 Poltrona Draft'),
    ('98c31e61-d706-4a48-a48b-5890861534c3', '[teste_aut]_draft_1789501856871 Guarda-Roupa F├¬nix Draft'),
    ('99e80fe9-451c-40a7-a36a-d1030b93d313', '[teste_aut]_draft_1789501957624 Sof├í Draft Conclus├úo'),
    ('bed30965-4be1-4261-ac83-f71d2b258bc9', '[teste_aut]_draft_1789502407896 Guarda-Roupa F├¬nix Draft'),
    ('fa5fd1a7-8590-488a-b4c3-92c0ad67f5d7', '[teste_aut]_draft_1789502435296 Sof├í Draft Conclus├úo'),
    ('917e262e-7c8e-4baf-a22a-f9554e42c2bc', '[teste_aut]_draft_1789503217163 Poltrona Draft'),
    ('244f7b2f-1ec9-4cf3-8475-22c1613a7600', '[teste_aut]_draft_1789503217163 Guarda-Roupa F├¬nix Draft'),
    ('51f2a293-a355-4bfd-811b-f8b9c1109264', '[teste_aut]_draft_1789503292982 Sof├í Draft Conclus├úo'),
    ('3ffd9d4d-f284-49e1-aef5-e993e52f8cba', '[teste_aut]_draft_1789504549443 Guarda-Roupa F├¬nix Draft'),
    ('64258fb9-a1a6-40c8-95de-ee44b3ae595a', '[teste_aut]_draft_1789504790485 Guarda-Roupa F├¬nix Draft'),
    ('0db0eb14-d98f-46f8-a72e-c782e7fc831f', '[teste_aut]_draft_1789504871088 Guarda-Roupa F├¬nix Draft'),
    ('107afeba-ce75-42f2-8e9e-1fef8ad9319a', '[teste_aut]_draft_1789505109435 Guarda-Roupa F├¬nix Draft'),
    ('4ba98c47-1c38-436b-a312-e27583c107b3', '[teste_aut]_draft_1789505736951 Guarda-Roupa F├¬nix Draft'),
    ('b58232ed-10d7-4eba-b199-6c61c5e36eb7', '[teste_aut]_draft_1789505982670 Guarda-Roupa F├¬nix Draft'),
    ('c4fb15ee-5b7e-452e-96d7-c3a14723c462', '[teste_aut]_draft_1789506338369 Guarda-Roupa F├¬nix Draft'),
    ('dca6f9e0-b0c3-452f-96c2-41b797181263', '[teste_aut]_draft_1789500557478 Poltrona Draft'),
    ('f69c4a19-9d50-4dd9-b0e5-e1cdf5845582', '[teste_aut]_draft_1789505214674 Guarda-Roupa F├¬nix Draft'),
    ('edd4bfa6-72fa-4d92-b51d-1f24a758b580', 'Pai Origem Rollback'),
    ('ede82043-c49c-47a7-922f-82a4ec656043', 'Pai Origem Rollback'),
    ('defb0bca-a297-4596-83ab-1c9c6ff92a7e', 'Pai Origem Rollback'),
    ('3acfe6fb-5614-4772-84cd-c8a77b9207f2', 'Pai Origem Rollback'),
    ('a71be5f2-b782-4038-9be2-6fdf30bf3b4f', 'Pai Origem Rollback'),
    ('18e57e28-50d1-4ef3-bfac-680b5d4451da', 'Pai Origem Rollback'),
    ('d9b1ec25-9d42-4f8c-a036-7138bf17186e', 'Pai Origem Rollback'),
    ('b3e4bca7-831c-499a-8e16-5e73086f259e', 'Pai Origem Rollback'),
    ('319d3573-bebc-44b5-9703-e9a066e82d62', 'Pai Origem Rollback'),
    ('6f9aaa0f-6967-46ae-9959-6563781c99ce', 'Pai Origem Rollback'),
    ('307f8b13-9d2a-4698-80a2-a8a08890dc15', 'Pai Origem Rollback'),
    ('e168ae1a-7a59-4ae4-9d8b-2de1a9093fae', 'Pai Origem Rollback'),
    ('09ea28f8-8a85-4668-ae38-f7f005404cfa', 'Pai Origem Rollback'),
    ('a68a4e49-7bba-41b2-b776-fc97cbf2ac93', 'Pai Origem Rollback'),
    ('e43d78af-d46c-4036-978b-6dfcde6ed50c', 'Pai Origem Rollback'),
    ('762ae27a-ce96-46f2-81a9-36c195f24b7e', 'Pai Origem Rollback'),
    ('ecb13d24-6130-4441-b0d2-72a117c2f94e', 'Pai Origem Rollback'),
    ('d857baf1-315f-4eff-8a06-91c316f838ef', 'Pai Origem Rollback'),
    ('65a1f977-e3ce-481f-9108-f987126acbb1', 'Pai Origem Rollback'),
    ('f2c7b00f-617a-4c51-93bb-87dcc5548742', 'Pai Origem Rollback'),
    ('e0fe8fb2-dbf9-4285-8f33-71ea0962613e', 'Pai Origem Rollback'),
    ('d301e582-8826-419c-80dd-8c8c96940d1e', 'Pai Origem Rollback'),
    ('44b0dbfb-7f1b-4d54-bfdb-8fc9ed46a415', 'Pai Origem Rollback'),
    ('297f8a23-9f17-4bba-ba59-325237c55122', 'Pai Origem Rollback'),
    ('949f1007-1712-45b5-a66c-5d7d3abd3bf4', 'Pai Origem Rollback'),
    ('9c71904d-91df-4c9d-8c39-b42fe0da0b0e', 'Pai Origem Rollback'),
    ('088a45c8-26f2-445b-acd9-d867a4ad1f6d', 'Pai Origem Rollback'),
    ('383ee4c8-b625-4070-bf67-5c2e2fc7934c', 'Pai Origem Rollback'),
    ('1d0dc56c-e100-4365-8426-b1e94ad2880c', 'Pai Origem Rollback'),
    ('6c8c3cdf-0100-4862-9165-6bc517c91c77', 'Pai Origem Rollback'),
    ('e5d49d08-2b5b-4995-99b8-07e360c9b424', 'Pai Origem Rollback'),
    ('d9e19b67-26ee-49d0-8cb0-b1cb9a3c7c0a', 'Pai Origem Rollback'),
    ('5f08f935-5e25-4d35-ad7b-ae320c1facbe', 'Pai Origem Rollback'),
    ('6c4c517f-3aa4-4d18-bc68-f60a51707039', 'Pai Origem Rollback'),
    ('12c8a584-66ce-47b3-af0b-c9dd78aecbaa', 'Pai Origem Rollback'),
    ('e44a26b9-a4e8-45e4-86d6-a1617db2b05a', 'Pai Origem Rollback'),
    ('df27b648-5d7c-4690-bf24-3561d30285bb', 'Pai Origem Rollback'),
    ('0378c18a-f87a-4944-95f4-36cb90c58a19', 'Pai B Concorrencia Mesma Var'),
    ('bd0776cf-7afc-4af4-a782-002bbb385a59', 'Pai B Teste Concorrencia');

    -- 4. COUNT(*) = COUNT(DISTINCT id) = 64
    SELECT COUNT(*), COUNT(DISTINCT id) INTO v_count, v_deleted_prods FROM tmp_garbage_products;
    IF v_count <> 64 OR v_deleted_prods <> 64 THEN
        RAISE EXCEPTION 'Abortado: A lista temporária não contém exatamente 64 UUIDs distintos (Count: %, Distinct: %)', v_count, v_deleted_prods;
    END IF;

    -- 5. Validação UUID + Assinatura/Name exato
    SELECT COUNT(*) INTO v_count FROM products p JOIN tmp_garbage_products t ON p.id = t.id WHERE p.name = t.name;
    IF v_count <> 64 THEN
        RAISE EXCEPTION 'Abortado: Os UUIDs ou nomes dos candidatos mudaram desde o dry-run!';
    END IF;

    -- 6 & 7. Rechecagem runtime de TODAS as FKs (Products)
    FOR v_fk IN (
        SELECT tc.table_name, kcu.column_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name 
         AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'products' 
          AND tc.table_schema = 'public'
          AND NOT (tc.table_name = 'product_variations' AND kcu.column_name = 'product_id')
    ) LOOP
        v_query := 'SELECT COUNT(*) FROM ' || quote_ident(v_fk.table_name) || 
                   ' r JOIN tmp_garbage_products t ON r.' || quote_ident(v_fk.column_name) || '::text = t.id::text';
        EXECUTE v_query INTO v_count;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'Abortado: % vínculos na tabela % apontando para products!', v_count, v_fk.table_name;
        END IF;
    END LOOP;

    -- Rechecagem runtime de TODAS as FKs (Product Variations)
    FOR v_fk IN (
        SELECT tc.table_name, kcu.column_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name 
         AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'product_variations' 
          AND tc.table_schema = 'public'
    ) LOOP
        v_query := 'SELECT COUNT(*) FROM ' || quote_ident(v_fk.table_name) || 
                   ' r JOIN product_variations v ON r.' || quote_ident(v_fk.column_name) || '::text = v.id::text ' ||
                   ' JOIN tmp_garbage_products t ON v.product_id::text = t.id::text';
        EXECUTE v_query INTO v_count;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'Abortado: % vínculos na tabela % apontando para product_variations!', v_count, v_fk.table_name;
        END IF;
    END LOOP;

    -- 8. DELETE Variations
    DELETE FROM product_variations WHERE product_id IN (SELECT id FROM tmp_garbage_products);
    GET DIAGNOSTICS v_deleted_vars = ROW_COUNT;
    RAISE NOTICE 'Variações deletadas: %', v_deleted_vars;

    -- 8 & 9. DELETE Products
    DELETE FROM products WHERE id IN (SELECT id FROM tmp_garbage_products);
    GET DIAGNOSTICS v_deleted_prods = ROW_COUNT;
    IF v_deleted_prods <> 64 THEN
        RAISE EXCEPTION 'Abortado: Esperado deletar 64 produtos, mas % foram deletados.', v_deleted_prods;
    END IF;

    -- 10. Nenhum dos 64 permanece
    SELECT COUNT(*) INTO v_count FROM products WHERE id IN (SELECT id FROM tmp_garbage_products);
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Abortado: % produtos do lote não foram deletados e ainda existem no banco!', v_count;
    END IF;

    -- 11. Duplicatas globais = 0
    SELECT COUNT(*) INTO v_duplicates FROM (
        SELECT code FROM products WHERE code IS NOT NULL GROUP BY code HAVING COUNT(*) > 1
    ) dupes;

    IF v_duplicates > 0 THEN
        RAISE EXCEPTION 'Abortado: O banco ainda possui % códigos duplicados após a limpeza global!', v_duplicates;
    END IF;

END $$;

COMMIT;
