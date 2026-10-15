-- Migration: 20261015160000_add_feet_characteristics.sql
-- Goal: Create 'Possui pés' and 'Quantidade de pés' attributes, define their standard options,
--       expand 'Material dos pés' options, and link them to all relevant categories.

BEGIN;

INSERT INTO public.attributes (id, name, data_type, active, is_globally_required, is_custom)
VALUES 
  ('a1f3e792-0790-4554-b269-e3b0b707896e'::uuid, 'Possui pés', 'radio', true, false, false),
  ('b2f3e792-0790-4554-b269-e3b0b707896e'::uuid, 'Quantidade de pés', 'radio', true, false, false)
ON CONFLICT (name) DO UPDATE SET active = true;

DO $$
DECLARE
  v_possui_pes_id uuid;
  v_qtd_pes_id uuid;
  v_mat_pes_id uuid := '77eb66f8-4452-41e7-8295-acb8bc7ceffe'::uuid;
BEGIN
  SELECT id INTO v_possui_pes_id FROM public.attributes WHERE name = 'Possui pés';
  SELECT id INTO v_qtd_pes_id FROM public.attributes WHERE name = 'Quantidade de pés';

  -- Opções para 'Possui pés'
  INSERT INTO public.attribute_values (attribute_id, value, sort_order)
  VALUES
    (v_possui_pes_id, 'Sim', 1),
    (v_possui_pes_id, 'Não', 2)
  ON CONFLICT (attribute_id, value) DO NOTHING;

  -- Opções para 'Quantidade de pés'
  INSERT INTO public.attribute_values (attribute_id, value, sort_order)
  VALUES
    (v_qtd_pes_id, 'Não possui', 0),
    (v_qtd_pes_id, '0 pés', 0),
    (v_qtd_pes_id, '1 pé', 1),
    (v_qtd_pes_id, '2 pés', 2),
    (v_qtd_pes_id, '3 pés', 3),
    (v_qtd_pes_id, '4 pés', 4),
    (v_qtd_pes_id, '5 pés', 5),
    (v_qtd_pes_id, '6 pés', 6),
    (v_qtd_pes_id, '7 pés', 7),
    (v_qtd_pes_id, '8 pés', 8),
    (v_qtd_pes_id, '9 pés', 9),
    (v_qtd_pes_id, '10 pés', 10),
    (v_qtd_pes_id, '12 pés', 12)
  ON CONFLICT (attribute_id, value) DO NOTHING;

  -- Opções adicionais para 'Material dos pés'
  INSERT INTO public.attribute_values (attribute_id, value, sort_order)
  VALUES
    (v_mat_pes_id, 'Não possui', 0),
    (v_mat_pes_id, 'Não se aplica', 0),
    (v_mat_pes_id, 'Plástico / ABS', 1),
    (v_mat_pes_id, 'Madeira Maciça', 2),
    (v_mat_pes_id, 'Madeira', 3),
    (v_mat_pes_id, 'Metal / Ferro', 4),
    (v_mat_pes_id, 'Alumínio', 5),
    (v_mat_pes_id, 'MDF', 6),
    (v_mat_pes_id, 'Rodízios', 7)
  ON CONFLICT (attribute_id, value) DO NOTHING;

  -- Vincular 'Possui pés' e 'Quantidade de pés' a todas as categorias que possuem 'Material dos pés'
  INSERT INTO public.category_attributes (category_id, attribute_id, is_required)
  SELECT DISTINCT ca.category_id, v_possui_pes_id, false
  FROM public.category_attributes ca
  WHERE ca.attribute_id = v_mat_pes_id
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  INSERT INTO public.category_attributes (category_id, attribute_id, is_required)
  SELECT DISTINCT ca.category_id, v_qtd_pes_id, false
  FROM public.category_attributes ca
  WHERE ca.attribute_id = v_mat_pes_id
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

END $$;

COMMIT;
