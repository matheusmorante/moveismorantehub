BEGIN;

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"186","Largura":"99.8","Profundidade":"41.3","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"Coimbra","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '186'),
        width = COALESCE(NULLIF(width, '0'), '99.8'),
        depth = COALESCE(NULLIF(depth, '0'), '41.3'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'c6301350-a004-436d-af20-01d47a5d53b0';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Darmovel","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Material da estrutura":"MDP","Modelo":"Pop / Gênova","Altura":"55","Largura":"120","Profundidade":"32","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '55'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '32'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
        updated_at = NOW()
      WHERE id = '4b8db5d2-5eff-44f7-a3ca-ff64aa6f9e71';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Altura":"210","Largura":"180","Profundidade":"45","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Cor":null,"Marca":"Faimec","Modelo":"Siena","Material da estrutura":"MDP"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '210'),
        width = COALESCE(NULLIF(width, '0'), '180'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '37bfc8f5-39c8-4dc1-a5fa-3fef3b879fad';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Móveis Sul","Altura":"220","Largura":"320","Profundidade":"53","Tipo de portas":"Bater + Basculante","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Florença","Quantidade de portas":"14 portas","Material dos puxadores":"Alumínio / Metal","Pés reguláveis":"Sim","Acabamento":"Pintura UV"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '220'),
        width = COALESCE(NULLIF(width, '0'), '320'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Sul' ELSE brand END,
        updated_at = NOW()
      WHERE id = '8ce4da89-ef4a-4a70-b71a-2a53266a53f1';
    

        UPDATE public.product_variations
        SET 
          attributes = '{"0":{"name":"Cor","value":"Canary/Off White","showName":true},"Cor":"Canary/Off White"}'::jsonb,
          updated_at = NOW()
        WHERE id = '9826e7ca-e2b8-422a-b73d-3961d061d729';
      

        UPDATE public.product_variations
        SET 
          attributes = '{"0":{"name":"Cor","value":"Angelin/Cinza","showName":true},"Cor":"Angelin/Cinza"}'::jsonb,
          updated_at = NOW()
        WHERE id = 'd5919f46-45aa-4337-9a75-9fb0fd400678';
      

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"108.5","Largura":"108","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Notável Móveis","Modelo":"4","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '108.5'),
        width = COALESCE(NULLIF(width, '0'), '108'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'de0fcded-8739-48a3-9ee9-d15f45d575dc';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"210","Largura":"198","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Londres","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '210'),
        width = COALESCE(NULLIF(width, '0'), '198'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = '44133b5f-2d30-41b3-8b7a-73758d1691d0';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"235","Largura":"230","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"2030","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '235'),
        width = COALESCE(NULLIF(width, '0'), '230'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = '96c68260-b578-442e-94f1-494b09bea8c4';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":"Branco","Marca":"Doripel","Altura":"175","Modelo":"Sidney","Largura":"137","Profundidade":"38","Material da estrutura":"MDP","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Guia plástica","Possui espelho":"Não","Peso":"62","Material do cabideiro":"Madeira","Material dos puxadores":"Plástico / ABS"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '175'),
        width = COALESCE(NULLIF(width, '0'), '137'),
        depth = COALESCE(NULLIF(depth, '0'), '38'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'a83d234b-9682-434e-bac3-3c9808d168b2';
    

        UPDATE public.product_variations
        SET 
          attributes = '{"0":{"name":"Cor","value":"Preto"},"Cor":"Preto"}'::jsonb,
          updated_at = NOW()
        WHERE id = 'f6ee0b3a-8fd4-41b2-a827-6cc051890b1f';
      

        UPDATE public.product_variations
        SET 
          attributes = '{"0":{"name":"Cor","value":"Branco"},"Cor":"Branco"}'::jsonb,
          updated_at = NOW()
        WHERE id = 'd6743a5d-def5-4e12-bc3e-a58b7bdf5fc4';
      

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Móveis Sul","Altura":"190","Largura":"123","Profundidade":"50","Tipo de portas":"Bater","Material da estrutura":"MDP","Modelo":"Sophia","Quantidade de portas":"4 portas","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '190'),
        width = COALESCE(NULLIF(width, '0'), '123'),
        depth = COALESCE(NULLIF(depth, '0'), '50'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Sul' ELSE brand END,
        updated_at = NOW()
      WHERE id = '999e41ef-8d32-4cc9-8cb4-e36cbc9e52fa';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Moval","Altura":"230","Largura":"176","Profundidade":"52","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Califórnia","Quantidade de gavetas":"3 gavetas"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '230'),
        width = COALESCE(NULLIF(width, '0'), '176'),
        depth = COALESCE(NULLIF(depth, '0'), '52'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'da424efe-36d5-4124-8f4b-a4a86f80698e';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Maxel","Modelo":"San Marino","Altura":"200","Largura":"157","Profundidade":"47","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '157'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'd9fc6812-6487-4bb0-b062-5106da8ac7d5';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"235","Largura":"275","Profundidade":"63.5","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"100% MDF","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Móveis Europa","Modelo":"Vitória","Quantidade de gavetas":"6 gavetas","Peso":"255","Material do cabideiro":"Alumínio"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '235'),
        width = COALESCE(NULLIF(width, '0'), '275'),
        depth = COALESCE(NULLIF(depth, '0'), '63.5'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Europa' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'a889a36b-8aa5-4b28-9063-462d8c10dd63';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"120","Largura":"136","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Faimec","Modelo":"Vegas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '120'),
        width = COALESCE(NULLIF(width, '0'), '136'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '75d0d942-7441-4b60-b898-cc17f971aefa';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Darmovel","Altura":"81.5","Largura":"120","Profundidade":"51","Tipo de portas":"Bater","Material da estrutura":"MDP","Modelo":"Pop","Quantidade de portas":"2 portas","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '81.5'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '51'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'bb75757c-19ce-44b1-8af5-705746fb1cb9';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"JK","Tipo de portas":"Bater","Quantidade de portas":"9 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Modelo":"JK Modulada","Altura":"200","Largura":"200","Profundidade":"52.5","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '200'),
        depth = COALESCE(NULLIF(depth, '0'), '52.5'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'JK' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'b4dc0852-40c5-414f-ac66-4adf5f650795';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"200","Largura":"206","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Doripel","Modelo":"Las Vegas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '206'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'c4b13f75-9c37-45a2-b674-4a582b65948c';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"108","Largura":"132.4","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"5 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Texas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '108'),
        width = COALESCE(NULLIF(width, '0'), '132.4'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '3c42542e-8623-4055-aae4-9091dcf7b356';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"235","Largura":"226","Profundidade":"56","Possui espelho":"Sim","Tipo de portas":"Correr","Material da estrutura":"100% MDF","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Móveis Europa","Modelo":"Bragança","Quantidade de portas":"3 portas","Material do cabideiro":"Alumínio"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '235'),
        width = COALESCE(NULLIF(width, '0'), '226'),
        depth = COALESCE(NULLIF(depth, '0'), '56'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Europa' ELSE brand END,
        updated_at = NOW()
      WHERE id = '0d5ec9bf-db88-4e26-8198-7d4f2e13ef3a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"212.4","Largura":"229.5","Profundidade":"52.5","Tipo de portas":"Bater","Quantidade de portas":"9 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"Catarina"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '212.4'),
        width = COALESCE(NULLIF(width, '0'), '229.5'),
        depth = COALESCE(NULLIF(depth, '0'), '52.5'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = '3f279613-d469-4348-b433-5db0ff3852cd';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Largura":"200","Profundidade":"53","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Indekes","Modelo":"Star","Altura":"217","Quantidade de portas":"10 portas","Peso":"151.8"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '217'),
        width = COALESCE(NULLIF(width, '0'), '200'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Indekes' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'afd21b58-8f80-4869-9997-8fae7a1aa5fc';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"194","Largura":"189","Profundidade":"53","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Cadorin","Modelo":"Curitiba"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '194'),
        width = COALESCE(NULLIF(width, '0'), '189'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'fc1b3360-91f4-4b66-a85e-582bafcc408d';
    

        DELETE FROM public.product_categories 
        WHERE product_id = '12d381a7-236f-46cc-bcb3-70bf167cde2a' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

        INSERT INTO public.product_categories (product_id, category_id)
        SELECT '12d381a7-236f-46cc-bcb3-70bf167cde2a'::uuid, 'b3a1a235-fd4c-4706-a058-6f8200b3731a'::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM public.product_categories 
          WHERE product_id = '12d381a7-236f-46cc-bcb3-70bf167cde2a' AND category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a'
        );
      

      UPDATE public.products
      SET 
        category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a',
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater + Basculante","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"MGM","Modelo":"Divina","Altura":"223.5","Largura":"270","Profundidade":"52","Quantidade de portas":"12 portas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '223.5'),
        width = COALESCE(NULLIF(width, '0'), '270'),
        depth = COALESCE(NULLIF(depth, '0'), '52'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'MGM' ELSE brand END,
        updated_at = NOW()
      WHERE id = '12d381a7-236f-46cc-bcb3-70bf167cde2a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"45","Largura":"120","Profundidade":"205","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Faimec","Modelo":"Curitiba","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '45'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '205'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '1ec6b9fb-60a2-49eb-b63b-71e99975aeda';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"97.3","Largura":"110.4","Profundidade":"46.8","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP/Vidro","Quantidade de gavetas":"5 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Aramóveis","Modelo":"5","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '97.3'),
        width = COALESCE(NULLIF(width, '0'), '110.4'),
        depth = COALESCE(NULLIF(depth, '0'), '46.8'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = '849625c4-2015-4574-a28e-d61d6fd83786';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"230.5","Largura":"262","Profundidade":"54","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Henn","Modelo":"Americano","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '230.5'),
        width = COALESCE(NULLIF(width, '0'), '262'),
        depth = COALESCE(NULLIF(depth, '0'), '54'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Henn' ELSE brand END,
        updated_at = NOW()
      WHERE id = '07bcb313-6650-4bc5-9d60-6e513c08da31';
    
COMMIT;