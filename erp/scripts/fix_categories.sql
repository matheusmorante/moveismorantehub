-- SQL MIGRATION / CORRECTION: FIX PRODUCT CATEGORIES AND SYNCHRONIZE CATEGORY_ID
BEGIN;

    -- Update product e5f10dc8-89a5-48ac-8c77-6fea63112d66 to category 6d702b44-6633-4fb4-808b-967ea6090dec
    UPDATE public.products
    SET category_id = '6d702b44-6633-4fb4-808b-967ea6090dec', updated_at = NOW()
    WHERE id = 'e5f10dc8-89a5-48ac-8c77-6fea63112d66';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT 'e5f10dc8-89a5-48ac-8c77-6fea63112d66'::uuid, '6d702b44-6633-4fb4-808b-967ea6090dec'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = 'e5f10dc8-89a5-48ac-8c77-6fea63112d66' AND category_id = '6d702b44-6633-4fb4-808b-967ea6090dec'
    );
  

    -- Update product 4a8fc879-d509-4dd8-8709-5eb91e4b56b8 to category cf2be708-6cae-4f59-ac33-07e3381bc3df
    UPDATE public.products
    SET category_id = 'cf2be708-6cae-4f59-ac33-07e3381bc3df', updated_at = NOW()
    WHERE id = '4a8fc879-d509-4dd8-8709-5eb91e4b56b8';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT '4a8fc879-d509-4dd8-8709-5eb91e4b56b8'::uuid, 'cf2be708-6cae-4f59-ac33-07e3381bc3df'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = '4a8fc879-d509-4dd8-8709-5eb91e4b56b8' AND category_id = 'cf2be708-6cae-4f59-ac33-07e3381bc3df'
    );
  

    -- Update product 9dca9f63-57ef-4204-bb77-9bea261b79f1 to category 197b3ff8-78d9-4e1e-bc78-416cbaa6c12a
    UPDATE public.products
    SET category_id = '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a', updated_at = NOW()
    WHERE id = '9dca9f63-57ef-4204-bb77-9bea261b79f1';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT '9dca9f63-57ef-4204-bb77-9bea261b79f1'::uuid, '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = '9dca9f63-57ef-4204-bb77-9bea261b79f1' AND category_id = '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a'
    );
  

    -- Update product 862f40a3-1084-4acc-bbd6-f2f9ecdf39b2 to category df9d0105-e438-4569-97e3-3be34f83ec98
    UPDATE public.products
    SET category_id = 'df9d0105-e438-4569-97e3-3be34f83ec98', updated_at = NOW()
    WHERE id = '862f40a3-1084-4acc-bbd6-f2f9ecdf39b2';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT '862f40a3-1084-4acc-bbd6-f2f9ecdf39b2'::uuid, 'df9d0105-e438-4569-97e3-3be34f83ec98'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = '862f40a3-1084-4acc-bbd6-f2f9ecdf39b2' AND category_id = 'df9d0105-e438-4569-97e3-3be34f83ec98'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = '862f40a3-1084-4acc-bbd6-f2f9ecdf39b2' AND category_id = '27bbf25b-32b7-40ce-904c-618c654447f2';
    

    -- Update product 1e54cdb5-4909-4896-967b-775f4c127ecf to category df9d0105-e438-4569-97e3-3be34f83ec98
    UPDATE public.products
    SET category_id = 'df9d0105-e438-4569-97e3-3be34f83ec98', updated_at = NOW()
    WHERE id = '1e54cdb5-4909-4896-967b-775f4c127ecf';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT '1e54cdb5-4909-4896-967b-775f4c127ecf'::uuid, 'df9d0105-e438-4569-97e3-3be34f83ec98'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = '1e54cdb5-4909-4896-967b-775f4c127ecf' AND category_id = 'df9d0105-e438-4569-97e3-3be34f83ec98'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = '1e54cdb5-4909-4896-967b-775f4c127ecf' AND category_id = 'f642586c-4f73-409c-8066-ad5651061073';
    

    -- Update product 738b26b2-b257-4ff0-a8c6-0aab14f60688 to category 197b3ff8-78d9-4e1e-bc78-416cbaa6c12a
    UPDATE public.products
    SET category_id = '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a', updated_at = NOW()
    WHERE id = '738b26b2-b257-4ff0-a8c6-0aab14f60688';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT '738b26b2-b257-4ff0-a8c6-0aab14f60688'::uuid, '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = '738b26b2-b257-4ff0-a8c6-0aab14f60688' AND category_id = '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = '738b26b2-b257-4ff0-a8c6-0aab14f60688' AND category_id = 'c2e94000-f3ce-4c4f-80f7-ee0476793a59';
    

    -- Update product ccd24699-628e-4e03-b20c-a6c9f28d6ce6 to category 8024e433-982e-4777-a254-a8769c1bcacb
    UPDATE public.products
    SET category_id = '8024e433-982e-4777-a254-a8769c1bcacb', updated_at = NOW()
    WHERE id = 'ccd24699-628e-4e03-b20c-a6c9f28d6ce6';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT 'ccd24699-628e-4e03-b20c-a6c9f28d6ce6'::uuid, '8024e433-982e-4777-a254-a8769c1bcacb'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = 'ccd24699-628e-4e03-b20c-a6c9f28d6ce6' AND category_id = '8024e433-982e-4777-a254-a8769c1bcacb'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = 'ccd24699-628e-4e03-b20c-a6c9f28d6ce6' AND category_id = '2df6d0c1-f9cd-419e-8d0f-22c63efd18f7';
    

    -- Update product a20d9403-82a0-40d0-9cdd-5ac5b3d9f352 to category bee7d82b-ccd5-45c8-893a-45cf54433cb7
    UPDATE public.products
    SET category_id = 'bee7d82b-ccd5-45c8-893a-45cf54433cb7', updated_at = NOW()
    WHERE id = 'a20d9403-82a0-40d0-9cdd-5ac5b3d9f352';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT 'a20d9403-82a0-40d0-9cdd-5ac5b3d9f352'::uuid, 'bee7d82b-ccd5-45c8-893a-45cf54433cb7'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = 'a20d9403-82a0-40d0-9cdd-5ac5b3d9f352' AND category_id = 'bee7d82b-ccd5-45c8-893a-45cf54433cb7'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = 'a20d9403-82a0-40d0-9cdd-5ac5b3d9f352' AND category_id = '7efd43ad-bb98-49d9-baa1-3a4b25ac5bb5';
    

    -- Update product f832c0f2-6cd7-4088-a76b-652b7fa0d000 to category 8ea41168-5acd-46c2-8061-da86fc1e8be2
    UPDATE public.products
    SET category_id = '8ea41168-5acd-46c2-8061-da86fc1e8be2', updated_at = NOW()
    WHERE id = 'f832c0f2-6cd7-4088-a76b-652b7fa0d000';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT 'f832c0f2-6cd7-4088-a76b-652b7fa0d000'::uuid, '8ea41168-5acd-46c2-8061-da86fc1e8be2'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = 'f832c0f2-6cd7-4088-a76b-652b7fa0d000' AND category_id = '8ea41168-5acd-46c2-8061-da86fc1e8be2'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = 'f832c0f2-6cd7-4088-a76b-652b7fa0d000' AND category_id = 'bb55b391-ea52-4527-b429-26b0e2b71b71';
    

    -- Update product 60992dff-3d24-4a3b-a325-16b52e47f5c1 to category 8ea41168-5acd-46c2-8061-da86fc1e8be2
    UPDATE public.products
    SET category_id = '8ea41168-5acd-46c2-8061-da86fc1e8be2', updated_at = NOW()
    WHERE id = '60992dff-3d24-4a3b-a325-16b52e47f5c1';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT '60992dff-3d24-4a3b-a325-16b52e47f5c1'::uuid, '8ea41168-5acd-46c2-8061-da86fc1e8be2'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = '60992dff-3d24-4a3b-a325-16b52e47f5c1' AND category_id = '8ea41168-5acd-46c2-8061-da86fc1e8be2'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = '60992dff-3d24-4a3b-a325-16b52e47f5c1' AND category_id = 'bb55b391-ea52-4527-b429-26b0e2b71b71';
    

    -- Update product bbd7697b-332b-44ff-a9be-bee2999d2a6a to category f642586c-4f73-409c-8066-ad5651061073
    UPDATE public.products
    SET category_id = 'f642586c-4f73-409c-8066-ad5651061073', updated_at = NOW()
    WHERE id = 'bbd7697b-332b-44ff-a9be-bee2999d2a6a';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT 'bbd7697b-332b-44ff-a9be-bee2999d2a6a'::uuid, 'f642586c-4f73-409c-8066-ad5651061073'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = 'bbd7697b-332b-44ff-a9be-bee2999d2a6a' AND category_id = 'f642586c-4f73-409c-8066-ad5651061073'
    );
  

      DELETE FROM public.product_categories
      WHERE product_id = 'bbd7697b-332b-44ff-a9be-bee2999d2a6a' AND category_id = '7efd43ad-bb98-49d9-baa1-3a4b25ac5bb5';
    

  DELETE FROM public.product_categories
  WHERE product_id = '5511f886-6626-45c8-8c9b-3d6b55305c19' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';


  DELETE FROM public.product_categories
  WHERE product_id = '45570901-f295-46b2-984d-96af85e0079a' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';


  DELETE FROM public.product_categories
  WHERE product_id = 'c19d34fc-191d-4e23-aae5-7af7321fc5ed' AND category_id IN ('1859e792-0790-4554-b269-e3b0b707896e', 'df9d0105-e438-4569-97e3-3be34f83ec98');


  DELETE FROM public.product_categories
  WHERE product_id = '12d381a7-236f-46cc-bcb3-70bf167cde2a' AND category_id = '3b616449-7d0c-40fc-9917-70a20836f3b8';


  DELETE FROM public.product_categories
  WHERE product_id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17' AND category_id = 'c718ab5d-ade3-42fb-91fb-2a05c1a3e322';


  -- Deduplicate product_categories
  DELETE FROM public.product_categories a
  USING public.product_categories b
  WHERE a.ctid < b.ctid
    AND a.product_id = b.product_id
    AND a.category_id = b.category_id;


  -- Synchronize products.category_id for any products where category_id IS NULL
  UPDATE public.products p
  SET category_id = sub.chosen_cat, updated_at = NOW()
  FROM (
    SELECT DISTINCT ON (product_id) product_id, category_id AS chosen_cat
    FROM public.product_categories
    ORDER BY product_id, category_id
  ) sub
  WHERE p.id = sub.product_id
    AND p.category_id IS NULL
    AND p.name NOT LIKE '%TEST%'
    AND p.name NOT LIKE '%Hml%';

COMMIT;