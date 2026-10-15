BEGIN;

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"92","Largura":"120","Profundidade":"41","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Modelo":"Grécia","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '92'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '41'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '72e47b08-965a-4db7-ac1c-7e9743586ef1';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"182","Largura":"71","Profundidade":"39","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Demóbile","Modelo":"Grife"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '182'),
        width = COALESCE(NULLIF(width, '0'), '71'),
        depth = COALESCE(NULLIF(depth, '0'), '39'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'c19d34fc-191d-4e23-aae5-7af7321fc5ed';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Correr","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Marca":"Made Marcs","Modelo":"Atlanta","Altura":"218","Largura":"206","Profundidade":"51","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '218'),
        width = COALESCE(NULLIF(width, '0'), '206'),
        depth = COALESCE(NULLIF(depth, '0'), '51'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Made Marcs' ELSE brand END,
        updated_at = NOW()
      WHERE id = '475b8290-6320-4d1d-8bd6-3bdda428d06a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"115","Largura":"155","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"100% MDF","Quantidade de gavetas":"5 gavetas","Modelo":"França","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '115'),
        width = COALESCE(NULLIF(width, '0'), '155'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '798c86ef-417a-44b1-85f5-6d54f3d739f7';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"203","Largura":"178","Profundidade":"47","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Verona"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '203'),
        width = COALESCE(NULLIF(width, '0'), '178'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'cde26f3b-960e-4bc7-8a90-574978db8cab';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"218","Largura":"210","Profundidade":"52","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Demóbile","Modelo":"Moema"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '218'),
        width = COALESCE(NULLIF(width, '0'), '210'),
        depth = COALESCE(NULLIF(depth, '0'), '52'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'b8afe24e-9f26-4ab5-ac57-9dfb1fc58641';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Marca":"Henn","Modelo":"Aconchego","Altura":"103","Largura":"126.5","Profundidade":"51","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '103'),
        width = COALESCE(NULLIF(width, '0'), '126.5'),
        depth = COALESCE(NULLIF(depth, '0'), '51'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Henn' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'ca82da46-22b2-4f7d-a54f-43a05b574172';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"218","Largura":"210","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP/Madeira Maciça","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Sonata","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '218'),
        width = COALESCE(NULLIF(width, '0'), '210'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = '06ad2d9e-4763-4703-aa87-5e7ebf3aed25';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"182.5","Largura":"161.7","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Pequim","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '182.5'),
        width = COALESCE(NULLIF(width, '0'), '161.7'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'ed1c4afb-a5e6-48b7-a39e-89d8cbe15bd2';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Marca":"Evidência","Modelo":"New Mônaco","Altura":"183","Largura":"183","Profundidade":"40","Quantidade de gavetas":"12 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '183'),
        width = COALESCE(NULLIF(width, '0'), '183'),
        depth = COALESCE(NULLIF(depth, '0'), '40'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'c30fb474-b911-4908-a125-a5a4ca878f6a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"Faimec","Modelo":"Salvador","Altura":"218","Largura":"208","Profundidade":"45","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '218'),
        width = COALESCE(NULLIF(width, '0'), '208'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '9d200152-002d-4b1a-aeed-10e2b2e0b121';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"100% MDF","Quantidade de gavetas":"2 gavetas","Marca":"Doripel","Modelo":"New Xangai","Altura":"200","Largura":"180","Profundidade":"47","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '180'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
        updated_at = NOW()
      WHERE id = '2137aa68-63fc-4590-86d7-05549c1e78e9';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"182.25","Largura":"81.4","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"3 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Modelo":"Moscou","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '182.25'),
        width = COALESCE(NULLIF(width, '0'), '81.4'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = '77725a3f-d9f6-4761-b201-007728772a00';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Marca":"Faimec","Modelo":"Portugal","Altura":"223","Largura":"85","Profundidade":"48","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Possui espelho":"Não","Material do cabideiro":"Alumínio","Material dos puxadores":"Plástico / ABS"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '223'),
        width = COALESCE(NULLIF(width, '0'), '85'),
        depth = COALESCE(NULLIF(depth, '0'), '48'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '1ccb82a9-d395-4c79-8b1a-4773c0262444';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"222","Largura":"150","Profundidade":"48","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Faimec","Modelo":"Flórida","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '222'),
        width = COALESCE(NULLIF(width, '0'), '150'),
        depth = COALESCE(NULLIF(depth, '0'), '48'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '296e2933-e6f1-454d-a9d8-49e4f01793d5';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"THB","Modelo":"Splendore Glass","Altura":"206","Largura":"181","Profundidade":"49","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '206'),
        width = COALESCE(NULLIF(width, '0'), '181'),
        depth = COALESCE(NULLIF(depth, '0'), '49'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'THB' ELSE brand END,
        updated_at = NOW()
      WHERE id = '0bba8b5a-581f-4531-9b76-7c2e214bddf2';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"92.5","Largura":"93.8","Profundidade":"44.8","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Lille","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '92.5'),
        width = COALESCE(NULLIF(width, '0'), '93.8'),
        depth = COALESCE(NULLIF(depth, '0'), '44.8'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'b52f7fa5-a823-4a0a-8926-d683d7eb4aae';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Marca":"Notável Móveis","Modelo":"NT 5015","Altura":"187","Largura":"161","Profundidade":"44","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '187'),
        width = COALESCE(NULLIF(width, '0'), '161'),
        depth = COALESCE(NULLIF(depth, '0'), '44'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'e5a0823a-91f5-401f-9f9e-98305260df7c';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"182","Largura":"135","Profundidade":"38","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Móveis Morante","Modelo":"Capri","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '182'),
        width = COALESCE(NULLIF(width, '0'), '135'),
        depth = COALESCE(NULLIF(depth, '0'), '38'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Morante' ELSE brand END,
        updated_at = NOW()
      WHERE id = '631e81eb-acaa-4b00-8b93-a76dca51f6f4';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"230","Largura":"270","Profundidade":"56","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Bianchi","Modelo":"Siena","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '230'),
        width = COALESCE(NULLIF(width, '0'), '270'),
        depth = COALESCE(NULLIF(depth, '0'), '56'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Bianchi' ELSE brand END,
        updated_at = NOW()
      WHERE id = '6b63baaa-2472-44e7-8d56-9a6cfcf80bc5';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"90","Largura":"89","Profundidade":"40","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP/Madeira Maciça","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Malta","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '90'),
        width = COALESCE(NULLIF(width, '0'), '89'),
        depth = COALESCE(NULLIF(depth, '0'), '40'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '74d22668-4f18-4dc2-aa8a-e0be1644cceb';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"181","Largura":"82","Profundidade":"40","Tipo de portas":"Bater","Quantidade de portas":"3 portas","Material da estrutura":"MDP/Madeira Maciça","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Chile","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '181'),
        width = COALESCE(NULLIF(width, '0'), '82'),
        depth = COALESCE(NULLIF(depth, '0'), '40'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '1b0f56ea-cff0-4809-b294-a2b07bfe0d32';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"216","Largura":"207","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Flórida","Possui espelho":"Não","Peso":"134","Espessura do MDF/MDP":"15 mm","Material do cabideiro":"Alumínio","Material dos puxadores":"MDF","Acabamento":"Pintura UV"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '216'),
        width = COALESCE(NULLIF(width, '0'), '207'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '0c02d580-ca8d-43b7-9f4d-40763d960a68';
    

        UPDATE public.product_variations
        SET 
          attributes = '{"Cor":"Freijó/Grafite"}'::jsonb,
          updated_at = NOW()
        WHERE id = '93048b8b-41dc-47ef-9af1-f633b4d98919';
      

        UPDATE public.product_variations
        SET 
          attributes = '{"Cor":"Freijó/Off White"}'::jsonb,
          updated_at = NOW()
        WHERE id = '6be30515-9326-41f9-b029-344c8611ccf2';
      

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Moval","Altura":"108","Largura":"147","Profundidade":"47","Material da estrutura":"MDP","Quantidade de gavetas":"8 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Geórgia","Quantidade de portas":"0 portas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '108'),
        width = COALESCE(NULLIF(width, '0'), '147'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
        updated_at = NOW()
      WHERE id = '4b064f92-bf4b-4348-bf02-deaa35884a4e';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"200","Largura":"237","Profundidade":"47","Quantidade de portas":"8 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Marca":"Maxel","Modelo":"Paris","Tipo de portas":"Bater","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '237'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
        updated_at = NOW()
      WHERE id = '5f44c0e1-1596-4f27-adc8-9f0afce089f7';
    
COMMIT;