-- Internal product examples for the 21 NCMs already enabled in the store.
-- Sources: RFB TIPI (updated through ADE 1/2026), Chapter 94 and headings 68.10/73.24.
-- RFB COSIT 98.279/2020 / SEFAZ-SP RC 28973/2023 distinguish rigid box beds from elastic sommiers.
-- This data-only change preserves official descriptions, validity, activation, products and fiscal snapshots.

DO $$
DECLARE
  invalid_codes text;
BEGIN
  PERFORM code FROM public.ncms
  WHERE code IN ('68109900', '73241000', '94016100', '94016900', '94017100', '94017900', '94018000', '94031000', '94032010', '94032090', '94033000', '94034000', '94035000', '94036000', '94037000', '94039100', '94039900', '94041000', '94042100', '94042900', '94049000')
  FOR SHARE;

  SELECT string_agg(expected.code, ', ' ORDER BY expected.code)
  INTO invalid_codes
  FROM (
    VALUES
      ('68109900', '-- Outras'),
      ('73241000', '- Pias e lavatórios, de aço inoxidável'),
      ('94016100', '-- Estofados'),
      ('94016900', '-- Outros'),
      ('94017100', '-- Estofados'),
      ('94017900', '-- Outros'),
      ('94018000', '- Outros assentos'),
      ('94031000', '- Móveis de metal, do tipo utilizado em escritórios'),
      ('94032010', 'Do tipo utilizado em cozinhas'),
      ('94032090', 'Outros'),
      ('94033000', '- Móveis de madeira, do tipo utilizado em escritórios'),
      ('94034000', '- Móveis de madeira, do tipo utilizado em cozinhas'),
      ('94035000', '- Móveis de madeira, do tipo utilizado em quartos de dormir'),
      ('94036000', '- Outros móveis de madeira'),
      ('94037000', '- Móveis de plástico'),
      ('94039100', '-- De madeira'),
      ('94039900', '-- Outras'),
      ('94041000', '- Suportes para camas (somiês)'),
      ('94042100', '-- De borracha alveolar ou de plástico alveolar, mesmo recobertos'),
      ('94042900', '-- De outras matérias'),
      ('94049000', '- Outros')
  ) AS expected(code, official_description)
  LEFT JOIN public.ncms actual
    ON actual.code = expected.code
   AND actual.official_description = expected.official_description
   AND actual.active IS TRUE
   AND actual.is_active IS TRUE
   AND (actual.start_date IS NULL OR actual.start_date <= current_date)
   AND (actual.end_date IS NULL OR actual.end_date >= current_date)
  WHERE actual.code IS NULL;

  IF invalid_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Expected enabled and current NCM rows are missing or changed: %', invalid_codes;
  END IF;
END;
$$;

INSERT INTO public.ncm_aliases (ncm_code, term, weight, active)
SELECT proposed.ncm_code, proposed.term, proposed.weight, proposed.active
FROM (
  VALUES
  ('68109900', 'Bancada com cuba moldada de mármore sintético', 5, true),
  ('68109900', 'Pia de cozinha de mármore sintético', 5, true),
  ('68109900', 'Tanque duplo de mármore sintético', 5, true),
  ('68109900', 'Lavatório de marmorite', 5, true),
  ('73241000', 'Pia de inox com cuba dupla', 5, true),
  ('73241000', 'Cuba simples de aço inoxidável', 5, true),
  ('73241000', 'Cuba dupla de aço inoxidável', 5, true),
  ('73241000', 'Lavatório de inox de parede', 5, true),
  ('94016100', 'Banco estofado com armação de madeira', 5, true),
  ('94016100', 'Banqueta estofada com armação de madeira', 5, true),
  ('94016100', 'Divã estofado com armação de madeira', 5, true),
  ('94016100', 'Recamier estofado com armação de madeira', 5, true),
  ('94016100', 'Namoradeira estofada com armação de madeira', 5, true),
  ('94016900', 'Poltrona de madeira sem estofado', 5, true),
  ('94016900', 'Cadeira dobrável de madeira sem estofado', 5, true),
  ('94016900', 'Tamborete de madeira sem estofado', 5, true),
  ('94016900', 'Banco de jardim de madeira sem estofado', 5, true),
  ('94017100', 'Banqueta estofada com armação de metal', 5, true),
  ('94017100', 'Longarina estofada com armação de metal', 5, true),
  ('94017100', 'Divã estofado com armação de metal', 5, true),
  ('94017100', 'Recamier estofado com armação de metal', 5, true),
  ('94017900', 'Poltrona de metal sem estofado', 5, true),
  ('94017900', 'Longarina de metal sem estofado', 5, true),
  ('94017900', 'Cadeira dobrável de metal sem estofado', 5, true),
  ('94017900', 'Tamborete de metal sem estofado', 5, true),
  ('94018000', 'Banco de plástico', 5, true),
  ('94018000', 'Poltrona de plástico', 5, true),
  ('94018000', 'Cadeira infantil de plástico', 5, true),
  ('94018000', 'Tamborete de plástico', 5, true),
  ('94031000', 'Mesa de aço para escritório', 5, true),
  ('94031000', 'Armário de aço para escritório', 5, true),
  ('94031000', 'Gaveteiro de aço para escritório', 5, true),
  ('94031000', 'Balcão de atendimento de metal para escritório', 5, true),
  ('94032010', 'Paneleiro de aço para cozinha', 5, true),
  ('94032010', 'Armário aéreo de aço para cozinha', 5, true),
  ('94032010', 'Gabinete de aço para pia de cozinha', 5, true),
  ('94032010', 'Cozinha compacta de aço', 5, true),
  ('94032010', 'Fruteira de aço para cozinha', 5, true),
  ('94032090', 'Cama de metal', 5, true),
  ('94032090', 'Beliche de metal', 5, true),
  ('94032090', 'Treliche de metal', 5, true),
  ('94032090', 'Mesa de jantar de metal', 5, true),
  ('94032090', 'Mesa lateral de metal', 5, true),
  ('94032090', 'Rack de metal para TV', 5, true),
  ('94032090', 'Sapateira de metal', 5, true),
  ('94032090', 'Armário de metal para banheiro', 5, true),
  ('94033000', 'Armário de madeira para escritório', 5, true),
  ('94033000', 'Gaveteiro de madeira para escritório', 5, true),
  ('94033000', 'Arquivo de madeira para escritório', 5, true),
  ('94033000', 'Mesa de reunião de madeira para escritório', 5, true),
  ('94034000', 'Cozinha compacta de madeira MDF/MDP', 5, true),
  ('94034000', 'Cozinha modulada de madeira MDF/MDP', 5, true),
  ('94034000', 'Paneleiro de madeira para cozinha', 5, true),
  ('94034000', 'Armário aéreo de madeira para cozinha', 5, true),
  ('94034000', 'Fruteira de madeira para cozinha', 5, true),
  ('94034000', 'Torre quente de madeira para cozinha', 5, true),
  ('94035000', 'Beliche de madeira MDF/MDP', 6, true),
  ('94035000', 'Treliche de madeira MDF/MDP', 5, true),
  ('94035000', 'Bicama de madeira MDF/MDP', 5, true),
  ('94035000', 'Berço de madeira MDF/MDP', 5, true),
  ('94035000', 'Minicama de madeira MDF/MDP', 5, true),
  ('94035000', 'Penteadeira de madeira para quarto', 5, true),
  ('94035000', 'Cama de solteiro de madeira', 5, true),
  ('94035000', 'Cama de casal de madeira', 5, true),
  ('94035000', 'Cama auxiliar de madeira', 5, true),
  ('94035000', 'Base box de madeira com estrado rígido', 5, true),
  ('94036000', 'Cristaleira de madeira para sala', 5, true),
  ('94036000', 'Sapateira de madeira MDF/MDP', 5, true),
  ('94036000', 'Gabinete de madeira para banheiro', 5, true),
  ('94036000', 'Bar de madeira para sala', 5, true),
  ('94036000', 'Balcão buffet de madeira para sala', 5, true),
  ('94036000', 'Console de madeira para hall', 5, true),
  ('94037000', 'Estante de plástico', 5, true),
  ('94037000', 'Gaveteiro de plástico', 5, true),
  ('94037000', 'Sapateira de plástico', 5, true),
  ('94037000', 'Armário multiuso de plástico', 5, true),
  ('94039100', 'Porta de madeira própria para armário', 5, true),
  ('94039100', 'Gaveta de madeira própria para cômoda', 5, true),
  ('94039100', 'Prateleira de madeira própria para armário', 5, true),
  ('94039100', 'Lateral de madeira própria para guarda-roupa', 5, true),
  ('94039100', 'Tampo de madeira próprio para mesa', 5, true),
  ('94039900', 'Pé de metal para mesa', 5, true),
  ('94039900', 'Pé de plástico para armário', 5, true),
  ('94039900', 'Porta de metal própria para armário', 5, true),
  ('94039900', 'Gaveta de metal própria para armário', 5, true),
  ('94039900', 'Prateleira de plástico própria para armário', 5, true),
  ('94041000', 'Base box com molas (somiê)', 5, true),
  ('94041000', 'Somiê estofado com molas', 5, true),
  ('94041000', 'Somiê de tela metálica para cama', 5, true),
  ('94041000', 'Suporte elástico de molas para colchão', 5, true),
  ('94042100', 'Colchonete de espuma para dormir', 5, true),
  ('94042100', 'Colchão de espuma para berço', 5, true),
  ('94042100', 'Colchão de espuma viscoelástica', 5, true),
  ('94042100', 'Colchão de espuma de solteiro', 5, true),
  ('94042100', 'Colchão de espuma de casal', 5, true),
  ('94042900', 'Colchão de molas pocket', 5, true),
  ('94042900', 'Colchão de molas de casal', 5, true),
  ('94042900', 'Colchão de molas de solteiro', 5, true),
  ('94042900', 'Colchão com enchimento de algodão', 5, true),
  ('94049000', 'Almofada decorativa com enchimento', 5, true),
  ('94049000', 'Travesseiro de espuma viscoelástica', 5, true),
  ('94049000', 'Travesseiro de penas', 5, true),
  ('94049000', 'Rolo de apoio com enchimento', 5, true),
  ('94049000', 'Coxim de assento sem armação com enchimento', 5, true),
  ('94049000', 'Pufe sem armação com enchimento', 5, true)
) AS proposed(ncm_code, term, weight, active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ncm_aliases existing
  WHERE existing.ncm_code = proposed.ncm_code
    AND lower(btrim(existing.term)) = lower(btrim(proposed.term))
)
ON CONFLICT (ncm_code, term) DO NOTHING;

-- Quilts/duvets have their own current subheading 9404.40, outside the enabled 9404.90 examples.
UPDATE public.ncm_aliases
SET active = false, updated_at = now()
WHERE ncm_code = '94049000'
  AND term IN ('colcha acolchoada', 'edredom', 'edredom de cama', 'manta acolchoada')
  AND active IS TRUE;

-- Keep the new, qualified rigid/elastic box-bed examples instead of this ambiguous legacy term.
UPDATE public.ncm_aliases
SET active = false, updated_at = now()
WHERE ncm_code = '94041000' AND term = 'base box' AND active IS TRUE;

