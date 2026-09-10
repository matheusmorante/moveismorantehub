-- Reconciliação pontual dos 36 inventory_moves identificados na auditoria.
-- Execute somente após 20260910110000. A operação é atômica e auditável.

BEGIN;

CREATE TABLE IF NOT EXISTS public.catalog_identity_repair_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repaired_at timestamptz NOT NULL DEFAULT now(),
  inventory_move_id uuid NOT NULL,
  old_product_id text,
  old_variation_id text,
  new_product_id text NOT NULL,
  new_variation_id text NOT NULL,
  reason text NOT NULL
);

-- A tabela é persistente porque o editor SQL pode separar comandos em conexões
-- diferentes; uma tabela TEMP desapareceria antes dos próximos comandos.
CREATE TABLE IF NOT EXISTS public.catalog_variation_repair_map (
  old_variation_id text PRIMARY KEY,
  new_variation_id uuid NOT NULL,
  reason text NOT NULL
);

TRUNCATE TABLE public.catalog_variation_repair_map;

-- Cria somente as três variações que não existiam mais. O SKU fica nulo para
-- não inventar código comercial nem colidir com SKUs atuais; pode ser definido
-- depois no cadastro.
DO $$
DECLARE
  v_spain uuid;
  v_florida_off_white uuid;
  v_florida_grafite uuid;
BEGIN
  SELECT id INTO v_spain
  FROM public.product_variations
  WHERE product_id = '26e7bbd1-369c-4e94-8d50-ae527f7c46e4'::uuid
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_spain IS NULL THEN
    INSERT INTO public.product_variations (product_id, name, sku, status, attributes)
    VALUES (
      '26e7bbd1-369c-4e94-8d50-ae527f7c46e4'::uuid,
      'Guarda Roupa Espanha 2 Portas de Correr Mopar',
      NULL,
      'hidden',
      '{}'::jsonb
    ) RETURNING id INTO v_spain;
  END IF;

  SELECT id INTO v_florida_off_white
  FROM public.product_variations
  WHERE product_id = '0c02d580-ca8d-43b7-9f4d-40763d960a68'::uuid
    AND name = 'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Freijó/Off White'
  LIMIT 1;

  IF v_florida_off_white IS NULL THEN
    INSERT INTO public.product_variations (product_id, name, sku, status, attributes)
    VALUES (
      '0c02d580-ca8d-43b7-9f4d-40763d960a68'::uuid,
      'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Freijó/Off White',
      NULL,
      'hidden',
      '{}'::jsonb
    ) RETURNING id INTO v_florida_off_white;
  END IF;

  SELECT id INTO v_florida_grafite
  FROM public.product_variations
  WHERE product_id = '0c02d580-ca8d-43b7-9f4d-40763d960a68'::uuid
    AND name = 'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Freijó/Grafite'
  LIMIT 1;

  IF v_florida_grafite IS NULL THEN
    INSERT INTO public.product_variations (product_id, name, sku, status, attributes)
    VALUES (
      '0c02d580-ca8d-43b7-9f4d-40763d960a68'::uuid,
      'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Freijó/Grafite',
      NULL,
      'hidden',
      '{}'::jsonb
    ) RETURNING id INTO v_florida_grafite;
  END IF;

  INSERT INTO public.catalog_variation_repair_map (old_variation_id, new_variation_id, reason)
  VALUES
    ('26e7bbd1-369c-4e94-8d50-ae527f7c46e4_000202-01', v_spain, 'Variação padrão Espanha recriada'),
    ('12c2793a-bf59-42b3-9c96-092cef647ef1', v_florida_off_white, 'Snapshot histórico Freijó/Off White'),
    ('8ae40fcd-b372-4a7d-af31-fd0c9984001d', v_florida_grafite, 'Snapshot histórico Freijó/Grafite');
END;
$$;

INSERT INTO public.catalog_variation_repair_map (old_variation_id, new_variation_id, reason)
VALUES
  ('acd1d298-aad0-46bf-913b-18bb4541c750_000201-01', '7e0d9383-476e-4661-8668-26955140d7b0', 'Única variação atual do produto'),
  ('60992dff-3d24-4a3b-a325-16b52e47f5c1_000001-01', 'de119336-299f-4dec-9f04-6421baa8acec', 'Única variação atual do produto'),
  ('77044a13-9ca2-4ac3-9a22-79fc8ca75cf8_000001-01', 'd2a8171e-11f8-46c8-ba91-a5a0d0a0479c', 'Única variação atual do produto'),
  ('78900c7a-0f8e-4f35-a3ce-894737f489bf_000001-01', '99c88c10-1ebc-438c-944e-b8da5b01e093', 'SKU histórico corresponde à variação atual'),
  ('a7702fbe-0f84-4f37-903a-bdffe69cf4dc_000122-01', 'a8425c12-8f90-427e-bc4c-46913adbeedd', 'Única variação atual do produto'),
  ('f931046e-25a6-4e1a-837e-0a2de1ba6005', '3b150e64-c70f-4ab4-bea8-066597808e22', 'Snapshot histórico Branco'),
  ('f7ea103d-ad87-400c-9cc6-017049ed5d5e', 'c402e91b-b8d9-4486-a0e8-f4d03f799e09', 'Única variação atual do produto'),
  ('c7048af5-882a-40ef-a778-2153ea75c0c7', 'cd34a65b-3004-4358-ae0a-f468820cde3a', 'Snapshot histórico Freijó/Grafite'),
  ('e14d2929-9364-4a9b-a93f-35185365088e', 'c86e2a20-5ff4-4c2e-8e8d-2adc303ecc8f', 'Snapshot histórico Freijó/Off White'),
  ('39a726e4-c75e-4350-81bb-8ef08c0c7516', '296d1d4f-3212-46b3-812d-825a33ed53d0', 'Snapshot histórico Freijó/Grafite'),
  ('8d93ccd8-585f-4958-aacd-403d99c23a3e', '23d75d71-151f-4484-9830-4208b4cd5749', 'Snapshot histórico Branco'),
  ('d374e7b7-aa20-4ac8-8c65-7a6cea32e1ed', '57fd6b3e-80c9-418b-9433-fdf3782b2ce9', 'Snapshot histórico Freijó/Off White'),
  ('cfe1b776-57ea-48c1-9c9f-0d2f297c989e', '3a87e12a-cf54-4101-9c4e-68d1cf6a3729', 'Snapshot histórico Branco'),
  ('d4899fde-77fd-4bb8-ae89-9436f30f4805', '28babdcd-5798-46b4-9ba9-db21a7a78375', 'Snapshot histórico Freijó/Grafite'),
  ('dc6075bb-a4ae-47a1-b5cd-8113776c895d', '44165681-c17d-405c-9744-f917e427a866', 'Snapshot histórico Freijó/Off White'),
  ('646c3d7b-ff4f-4862-8897-0488a1199fc6', '98d1cb49-1ffa-41b1-aed3-2bc4df986162', 'Snapshot histórico Freijó/Grafite'),
  ('66b2f662-d2bb-4f8b-ba48-4b1dfa347d0f', '98d1cb49-1ffa-41b1-aed3-2bc4df986162', 'Snapshot histórico Freijó/Grafite'),
  ('74a6c706-b389-421b-839a-da07b13ba7ca', '9cbed28f-2e89-4b4c-ad72-364ca08a8318', 'Snapshot histórico Branco'),
  ('7bd9dfaa-d08d-4de4-a3ab-e1f8611a6b77', 'd84aa3a6-5385-4525-aa98-bccfb2f06fc3', 'Snapshot histórico Freijó/Off White'),
  ('fd900c82-4663-4c7e-9edb-2715be3344e4', '9cbed28f-2e89-4b4c-ad72-364ca08a8318', 'Snapshot histórico Branco'),
  ('a346e033-626c-42c7-a73f-940c468f8809', '641cc66d-328b-4627-85a2-a4dcb45a0d53', 'Única variação atual do produto');

-- Falhar antes de alterar algo se um destino não existir ou pertencer a outro pai.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.catalog_variation_repair_map AS map
    LEFT JOIN public.product_variations AS variation_record ON variation_record.id = map.new_variation_id
    WHERE variation_record.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Reconciliação cancelada: variação de destino ausente.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_moves AS move
    JOIN public.catalog_variation_repair_map AS map ON map.old_variation_id = move.variation_id::text
    JOIN public.product_variations AS variation_record ON variation_record.id = map.new_variation_id
    WHERE variation_record.product_id::text <> move.product_id
  ) THEN
    RAISE EXCEPTION 'Reconciliação cancelada: destino não pertence ao produto pai da movimentação.';
  END IF;
END;
$$;

INSERT INTO public.catalog_identity_repair_log (
  inventory_move_id, old_product_id, old_variation_id,
  new_product_id, new_variation_id, reason
)
SELECT
  move.id, move.product_id, move.variation_id::text,
  move.product_id, map.new_variation_id::text, map.reason
FROM public.inventory_moves AS move
JOIN public.catalog_variation_repair_map AS map ON map.old_variation_id = move.variation_id::text
JOIN public.inventory_move_identity_audit AS audit ON audit.id = move.id
WHERE audit.identity_status = 'orphan_variation_id';

UPDATE public.inventory_moves AS move
SET variation_id = map.new_variation_id::text
FROM public.catalog_variation_repair_map AS map,
     public.inventory_move_identity_audit AS audit
WHERE audit.id = move.id
  AND map.old_variation_id = move.variation_id::text
  AND audit.identity_status = 'orphan_variation_id';

-- Os quatro pares cruzados têm variação existente: o pai é derivado dela.
INSERT INTO public.catalog_identity_repair_log (
  inventory_move_id, old_product_id, old_variation_id,
  new_product_id, new_variation_id, reason
)
SELECT
  move.id, move.product_id, move.variation_id::text,
  variation_record.product_id::text, variation_record.id::text,
  'Pai corrigido a partir da variação existente'
FROM public.inventory_moves AS move
JOIN public.inventory_move_identity_audit AS audit ON audit.id = move.id
JOIN public.product_variations AS variation_record ON variation_record.id::text = move.variation_id::text
WHERE audit.identity_status = 'product_variation_mismatch';

UPDATE public.inventory_moves AS move
SET product_id = variation_record.product_id::text
FROM public.inventory_move_identity_audit AS audit,
     public.product_variations AS variation_record
WHERE audit.id = move.id
  AND variation_record.id::text = move.variation_id::text
  AND audit.identity_status = 'product_variation_mismatch';

-- Bloqueador: não conclui se ainda existir qualquer órfão ou par cruzado.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.inventory_move_identity_audit
    WHERE identity_status IN ('orphan_variation_id', 'product_variation_mismatch')
  ) THEN
    RAISE EXCEPTION 'Reconciliação incompleta: ainda há inconsistências de identidade.';
  END IF;
END;
$$;

COMMIT;
