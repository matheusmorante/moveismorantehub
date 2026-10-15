-- Migration: 20261015180000_audit_puxadores_from_descriptions.sql
-- Description: Auditoria e atualização de Tipo de puxador e Material dos puxadores com base exclusivamente nas descrições dos produtos.

DO $$
BEGIN
  UPDATE public.products p
  SET 
    technical_specs = 
      CASE 
        WHEN t.tipo IS NOT NULL AND t.material IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              COALESCE(p.technical_specs, '{"technicalValues": {}}'::jsonb),
              '{technicalValues,Tipo de puxador}',
              to_jsonb(t.tipo)
            ),
            '{technicalValues,Material dos puxadores}',
            to_jsonb(t.material)
          )
        WHEN t.tipo IS NOT NULL AND t.material IS NULL THEN
          jsonb_set(
            (COALESCE(p.technical_specs, '{"technicalValues": {}}'::jsonb) #- '{technicalValues,Material dos puxadores}'),
            '{technicalValues,Tipo de puxador}',
            to_jsonb(t.tipo)
          )
        WHEN t.tipo IS NULL AND t.material IS NOT NULL THEN
          jsonb_set(
            (COALESCE(p.technical_specs, '{"technicalValues": {}}'::jsonb) #- '{technicalValues,Tipo de puxador}'),
            '{technicalValues,Material dos puxadores}',
            to_jsonb(t.material)
          )
        ELSE
          (COALESCE(p.technical_specs, '{"technicalValues": {}}'::jsonb) #- '{technicalValues,Tipo de puxador}') #- '{technicalValues,Material dos puxadores}'
      END,
    updated_at = NOW()
  FROM (
    VALUES
    ('7684bd97-c434-450f-b21a-6800e8ed7440'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('6e512bcc-c058-4684-8dfc-805d15f0d0c8'::uuid, 'Passante'::text, NULL::text),
    ('b379df0a-99af-46b3-a9aa-7b2ea140324a'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('4ad056b6-80bc-4f4c-97ab-3bdf0a53a2ea'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('5b6938c7-92aa-46fc-b6d9-a1ce636983d4'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('de1d1ab3-5cde-4e0d-991b-e324c1fd4eb3'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('37bf3a6d-79c3-4846-a473-588a18d2f493'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('09a9df2e-e5c1-49c0-ba55-a8b59e01f350'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('37e653c7-530a-47f0-8cd7-ce3d53e6c04f'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('7cde3b0c-ca66-4735-899f-50b68cec4d69'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('3e1797d3-80f8-4423-a18a-07ce7b010baa'::uuid, NULL::text, 'MDF'::text),
    ('f56e238f-a86c-4f5e-853b-7d63c5c963b8'::uuid, 'Cava'::text, 'MDF'::text),
    ('1e66d8e5-b521-498e-bd98-99e82f90a6b6'::uuid, 'Perfilado'::text, NULL::text),
    ('4b0aaab1-c3df-4613-a60f-c24bd0499433'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('71855ebb-bf72-4340-9e9e-3111de70af1a'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('de0fcded-8739-48a3-9ee9-d15f45d575dc'::uuid, NULL::text, 'MDF'::text),
    ('9c10a576-f840-4e8c-8369-5ac71c98f599'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('f7f78130-c551-478d-afb6-c1713b2afb3a'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('849625c4-2015-4574-a28e-d61d6fd83786'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('4b064f92-bf4b-4348-bf02-deaa35884a4e'::uuid, 'Cava'::text, NULL::text),
    ('b52f7fa5-a823-4a0a-8926-d683d7eb4aae'::uuid, NULL::text, 'MDF'::text),
    ('74d22668-4f18-4dc2-aa8a-e0be1644cceb'::uuid, NULL::text, 'Madeira Maciça'::text),
    ('75d0d942-7441-4b60-b898-cc17f971aefa'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('d1515942-aa91-43e8-8606-fac37af6135c'::uuid, NULL::text, 'MDF'::text),
    ('fded5e7f-934e-4f51-8506-1103b82308f9'::uuid, 'Cava'::text, NULL::text),
    ('bb8ec31b-92a3-4116-9fb6-5d6520f5e0ae'::uuid, 'Cava'::text, NULL::text),
    ('3c42542e-8623-4055-aae4-9091dcf7b356'::uuid, NULL::text, 'MDF'::text),
    ('6fe72583-1217-4c49-8949-139883b1c57b'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('00c3f0d7-8ccd-4808-8802-79055e967332'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('72020dcc-fb0a-4982-a12d-a8d2fc434df4'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('53b681e2-b5f7-4011-a2d7-79fd3ac978f9'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('fc1b3360-91f4-4b66-a85e-582bafcc408d'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('6cfb0413-a223-4585-9dab-c2024d26e93b'::uuid, 'Perfilado'::text, NULL::text),
    ('8ce4da89-ef4a-4a70-b71a-2a53266a53f1'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('5d61e058-002e-49d7-9b3d-e4bae4d03d5e'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('9193bcb1-ff4e-47ed-b8d6-60aca392b9e2'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('999e41ef-8d32-4cc9-8cb4-e36cbc9e52fa'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('6d773652-aa81-4b69-b057-85fc10dc5022'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('11e8c6a5-1aea-4757-bbb5-272086e33d48'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('7c13e343-a15b-451f-9fbc-1f49bf22d864'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('296e2933-e6f1-454d-a9d8-49e4f01793d5'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('acd1d298-aad0-46bf-913b-18bb4541c750'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('48eb76af-d842-4b91-a40c-35e41c7e6a7b'::uuid, NULL::text, 'MDF'::text),
    ('ed1c4afb-a5e6-48b7-a39e-89d8cbe15bd2'::uuid, NULL::text, 'MDF'::text),
    ('a9408296-e1f9-462c-b4b0-f96ff1e5dc4d'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('33a234cf-3003-4614-9106-b0f4ffcb169b'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('d8c72a0d-6cef-4043-93e4-dc00e6d5368a'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('c0cda89f-8971-4146-bce7-0c4ead887f24'::uuid, NULL::text, 'MDF'::text),
    ('24a68db0-4ac0-4c67-95a9-034721380c47'::uuid, NULL::text, 'MDF'::text),
    ('69d2f7c6-9ec0-473f-ae73-36b774b3dda8'::uuid, 'Perfilado'::text, 'MDF'::text),
    ('6b63baaa-2472-44e7-8d56-9a6cfcf80bc5'::uuid, NULL::text, 'Madeira'::text),
    ('c6301350-a004-436d-af20-01d47a5d53b0'::uuid, NULL::text, 'MDF'::text),
    ('204bb4ab-9e0f-4c05-af1a-7ed23162a368'::uuid, NULL::text, 'MDF'::text),
    ('5f44c0e1-1596-4f27-adc8-9f0afce089f7'::uuid, NULL::text, 'MDF'::text),
    ('96a16c93-d899-49e8-9e4e-aa188d6c2744'::uuid, NULL::text, 'MDF'::text),
    ('a889a36b-8aa5-4b28-9063-462d8c10dd63'::uuid, 'Perfilado'::text, 'Alumínio / Metal'::text),
    ('96c68260-b578-442e-94f1-494b09bea8c4'::uuid, NULL::text, 'MDF'::text),
    ('6c2d8aa7-ea18-4cac-b5ae-f0741e2dc0fd'::uuid, NULL::text, 'MDF'::text),
    ('ae5b20d5-6d41-43ec-93ff-23af2183c7f6'::uuid, NULL::text, 'MDF'::text),
    ('26e7bbd1-369c-4e94-8d50-ae527f7c46e4'::uuid, NULL::text, 'MDF'::text),
    ('0c02d580-ca8d-43b7-9f4d-40763d960a68'::uuid, 'Alça'::text, 'MDF'::text),
    ('a83d234b-9682-434e-bac3-3c9808d168b2'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('631e81eb-acaa-4b00-8b93-a76dca51f6f4'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('cde26f3b-960e-4bc7-8a90-574978db8cab'::uuid, NULL::text, 'MDF'::text),
    ('274ef28d-65c3-4bca-a5c6-6dd78f10456f'::uuid, NULL::text, 'MDF'::text),
    ('7211189f-2ace-40e7-8de4-d27ab11c8969'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('3f279613-d469-4348-b433-5db0ff3852cd'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('afd21b58-8f80-4869-9997-8fae7a1aa5fc'::uuid, 'Perfilado'::text, NULL::text),
    ('bb3cc2fd-18f5-4a1b-8348-9333b7a52a66'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('45570901-f295-46b2-984d-96af85e0079a'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('d9b71892-f4ec-41ab-98e0-2d46c25c4664'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('1627412e-4c7e-481a-b995-9808c3400361'::uuid, NULL::text, 'MDF'::text),
    ('e53189ec-2a90-4c96-bd68-4422ca0d9b76'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('a7a08a27-8da9-4dd3-b60a-f16b15bb6557'::uuid, NULL::text, 'Plástico / ABS'::text),
    ('c0b9d19a-45e1-465b-a074-6c2186957f34'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('c19d34fc-191d-4e23-aae5-7af7321fc5ed'::uuid, NULL::text, 'Alumínio / Metal'::text),
    ('7c45ec72-0601-46e7-b4f2-caa6d3ad7841'::uuid, 'Alça'::text, 'Alumínio / Metal'::text),
    ('40f968c5-8390-48dc-8e06-90cc4c500033'::uuid, NULL::text, 'Madeira'::text)
  ) AS t(id, tipo, material)
  WHERE p.id = t.id
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

END $$;
