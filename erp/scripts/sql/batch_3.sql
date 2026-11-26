BEGIN;

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"182","Largura":"108","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Modelo":"Tóquio","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '182'),
        width = COALESCE(NULLIF(width, '0'), '108'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'd2417fef-5ee1-453f-9e02-48e93a37681f';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"230","Largura":"175","Profundidade":"51","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Viena","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '230'),
        width = COALESCE(NULLIF(width, '0'), '175'),
        depth = COALESCE(NULLIF(depth, '0'), '51'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '274ef28d-65c3-4bca-a5c6-6dd78f10456f';
    

        UPDATE public.products 
        SET category_id = 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'
        WHERE id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17';

        DELETE FROM public.product_categories 
        WHERE product_id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

        INSERT INTO public.product_categories (product_id, category_id)
        SELECT 'a846c89e-1b6d-4f41-8142-34a97b0c9d17'::uuid, 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM public.product_categories 
          WHERE product_id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17' AND category_id = 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'
        );
      

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"205","Largura":"120","Profundidade":"45","Quantidade de portas":"4 portas","Material da estrutura":"MDP/Metal","Quantidade de gavetas":"2 gavetas","Marca":"Faimec","Modelo":"Siena","Tipo de portas":"Bater","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '205'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '08112768-4ccf-4a95-b69b-b311498cc626';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"97","Largura":"108","Profundidade":"45.3","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"8 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Moval","Modelo":"Lara","Quantidade de portas":"0 portas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '97'),
        width = COALESCE(NULLIF(width, '0'), '108'),
        depth = COALESCE(NULLIF(depth, '0'), '45.3'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
        updated_at = NOW()
      WHERE id = '4ab2308b-20f9-42f6-a025-901b4b649ced';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Moval","Altura":"100","Largura":"97","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Vênus","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '100'),
        width = COALESCE(NULLIF(width, '0'), '97'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'd1515942-aa91-43e8-8606-fac37af6135c';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"83","Largura":"80","Profundidade":"52","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Marca":"Notável Móveis","Modelo":"Apolo","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '83'),
        width = COALESCE(NULLIF(width, '0'), '80'),
        depth = COALESCE(NULLIF(depth, '0'), '52'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'a5c6dd78-f819-4f48-b0d4-381d74111e9a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"204","Largura":"112","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Monza","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '204'),
        width = COALESCE(NULLIF(width, '0'), '112'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Moval","Altura":"78","Largura":"119","Profundidade":"51.5","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Econômico","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '78'),
        width = COALESCE(NULLIF(width, '0'), '119'),
        depth = COALESCE(NULLIF(depth, '0'), '51.5'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
        updated_at = NOW()
      WHERE id = '6dd07ec2-87bc-4497-90a7-59093d1ca220';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":"Preto","Peso":76.5,"Marca":"Evidência","Altura":"181","Modelo":"Isabela","Largura":"150","Profundidade":"40","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"9 gavetas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '181'),
        width = COALESCE(NULLIF(width, '0'), '150'),
        depth = COALESCE(NULLIF(depth, '0'), '40'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
        updated_at = NOW()
      WHERE id = '54d30bc1-06d2-4c4a-b926-3a1f4665ce63';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Darmovel","Altura":"196","Largura":"120","Profundidade":"42","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Lorena"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '196'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '42'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
        updated_at = NOW()
      WHERE id = '53b681e2-b5f7-4011-a2d7-79fd3ac978f9';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"200","Largura":"160","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Curitiba","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '160'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'acd1d298-aad0-46bf-913b-18bb4541c750';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"217","Largura":"200","Profundidade":"47","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Demóbile","Modelo":"Cadis"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '217'),
        width = COALESCE(NULLIF(width, '0'), '200'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'a9408296-e1f9-462c-b4b0-f96ff1e5dc4d';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"80","Largura":"157","Profundidade":"50","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Móveis Morante","Modelo":"1ª Linha","Tipo de portas":"Bater","Quantidade de portas":"3 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '80'),
        width = COALESCE(NULLIF(width, '0'), '157'),
        depth = COALESCE(NULLIF(depth, '0'), '50'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Morante' ELSE brand END,
        updated_at = NOW()
      WHERE id = '1e66d8e5-b521-498e-bd98-99e82f90a6b6';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"175","Largura":"90","Profundidade":"34","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Marca":"Doripel","Modelo":"Dueto","Quantidade de gavetas":"0 gavetas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '175'),
        width = COALESCE(NULLIF(width, '0'), '90'),
        depth = COALESCE(NULLIF(depth, '0'), '34'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
        updated_at = NOW()
      WHERE id = '45570901-f295-46b2-984d-96af85e0079a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"221","Largura":"140","Profundidade":"52","Tipo de portas":"Correr","Quantidade de portas":"2 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Espanha","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '221'),
        width = COALESCE(NULLIF(width, '0'), '140'),
        depth = COALESCE(NULLIF(depth, '0'), '52'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '26e7bbd1-369c-4e94-8d50-ae527f7c46e4';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"231.8","Largura":"267","Profundidade":"51","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Móveis Morante","Modelo":"Florence","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '231.8'),
        width = COALESCE(NULLIF(width, '0'), '267'),
        depth = COALESCE(NULLIF(depth, '0'), '51'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Morante' ELSE brand END,
        updated_at = NOW()
      WHERE id = '69d2f7c6-9ec0-473f-ae73-36b774b3dda8';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"200","Largura":"237","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Material da estrutura":"MDF/Madeira Maciça","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Maxel","Modelo":"Genebra","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '237'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'd8c72a0d-6cef-4043-93e4-dc00e6d5368a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"235","Largura":"238","Profundidade":"47","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Damulti","Modelo":"Serena"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '235'),
        width = COALESCE(NULLIF(width, '0'), '238'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Damulti' ELSE brand END,
        updated_at = NOW()
      WHERE id = '24a68db0-4ac0-4c67-95a9-034721380c47';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"217","Largura":"270","Profundidade":"53","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Indekes","Modelo":"Star","Quantidade de portas":"12 portas","Peso":"140.6","Material dos pés":"Plástico / ABS"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '217'),
        width = COALESCE(NULLIF(width, '0'), '270'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Indekes' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'ad84c244-3090-4bf8-b7d3-4a7493d77fa2';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"190","Largura":"120","Profundidade":"42","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Qmovi","Modelo":"Q Encanto Slim","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '190'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '42'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Qmovi' ELSE brand END,
        updated_at = NOW()
      WHERE id = '77b05ad0-ca46-43eb-8c2a-b728b126c921';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"180","Largura":"150","Profundidade":"40","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"9 gavetas","Marca":"Evidência","Modelo":"Bergamo","Tipo/material da corrediça":"Guia plástica","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '180'),
        width = COALESCE(NULLIF(width, '0'), '150'),
        depth = COALESCE(NULLIF(depth, '0'), '40'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
        updated_at = NOW()
      WHERE id = '4bd6ef9b-66be-4ed4-beeb-40986f18c799';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"101","Largura":"125","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Demóbile","Modelo":"Flora","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '101'),
        width = COALESCE(NULLIF(width, '0'), '125'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
        updated_at = NOW()
      WHERE id = '9c10a576-f840-4e8c-8369-5ac71c98f599';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"240.5","Largura":"273","Profundidade":"63","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/Vidro","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Gelius","Modelo":"Absolut","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '240.5'),
        width = COALESCE(NULLIF(width, '0'), '273'),
        depth = COALESCE(NULLIF(depth, '0'), '63'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Gelius' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'ae5b20d5-6d41-43ec-93ff-23af2183c7f6';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"210","Largura":"180","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Marca":"Faimec","Modelo":"Siena","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '210'),
        width = COALESCE(NULLIF(width, '0'), '180'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'e7108621-e13d-47ea-a58d-f8b6c2f7f5af';
    
COMMIT;