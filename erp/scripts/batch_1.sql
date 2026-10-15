BEGIN;

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Moval","Altura":"182","Largura":"100","Profundidade":"38","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Modelo":"Dubai","Quantidade de gavetas":"0 gavetas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '182'),
        width = COALESCE(NULLIF(width, '0'), '100'),
        depth = COALESCE(NULLIF(depth, '0'), '38'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
        updated_at = NOW()
      WHERE id = '5511f886-6626-45c8-8c9b-3d6b55305c19';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":"Freijó Matt/Areia","Peso":"66","Marca":"Cadorin","Altura":"194","Largura":"180","Acabamento":"Pintura UV","Profundidade":"53","Tipo de portas":"Bater","Tipo de puxador":"Perfil","Material da estrutura":"MDP","Tipo/material da corrediça":"Corrediça metálica simples","Peso suportado por prateleira":5,"Modelo":"Dália New","Quantidade de portas":"6 portas","Quantidade de gavetas":"1 gaveta"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '194'),
        width = COALESCE(NULLIF(width, '0'), '180'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
        updated_at = NOW()
      WHERE id = '00c3f0d7-8ccd-4808-8802-79055e967332';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Marca":"Atualle","Modelo":"São Paulo","Altura":"226","Largura":"218.5","Profundidade":"47","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '226'),
        width = COALESCE(NULLIF(width, '0'), '218.5'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Atualle' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'defacf2b-29de-4f9d-b6a8-c390f0230876';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Marca":"Cadorin","Modelo":"Laura","Altura":"88.5","Largura":"120","Profundidade":"51","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '88.5'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '51'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'd21b9a4b-c8e4-4c62-a0e7-a2cf4e172e7c';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"Doripel","Modelo":"Montevideu","Altura":"175","Largura":"137","Profundidade":"38","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '175'),
        width = COALESCE(NULLIF(width, '0'), '137'),
        depth = COALESCE(NULLIF(depth, '0'), '38'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'aa7cb89d-a3b3-4899-9c63-910926a5177c';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"Luciane","Modelo":"Isis","Altura":"84","Largura":"120","Profundidade":"53","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '84'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Luciane' ELSE brand END,
        updated_at = NOW()
      WHERE id = '5e67172a-2909-4b8f-bbe5-37b6fff5d0d1';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Darmovel","Altura":"81.5","Largura":"120","Profundidade":"51","Tipo de portas":"Bater","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Pop","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '81.5'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '51'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
        updated_at = NOW()
      WHERE id = '3e1797d3-80f8-4423-a18a-07ce7b010baa';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"5 gavetas","Marca":"Evidência","Modelo":"CP25","Altura":"93","Largura":"123","Profundidade":"40","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '93'),
        width = COALESCE(NULLIF(width, '0'), '123'),
        depth = COALESCE(NULLIF(depth, '0'), '40'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
        updated_at = NOW()
      WHERE id = '4f0c805a-cbc9-49e0-8be2-7ae2d7c10b76';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Marca":"Notável Móveis","Modelo":"NT 3075","Altura":"122","Largura":"67","Profundidade":"42","Quantidade de gavetas":"0 gavetas"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '122'),
        width = COALESCE(NULLIF(width, '0'), '67'),
        depth = COALESCE(NULLIF(depth, '0'), '42'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = '5f3d2a9b-710d-4f00-a978-53ad533293bc';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Marca":"Notável Móveis","Modelo":"NT 3110","Altura":"87.3","Largura":"75.4","Profundidade":"52","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '87.3'),
        width = COALESCE(NULLIF(width, '0'), '75.4'),
        depth = COALESCE(NULLIF(depth, '0'), '52'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'adce8049-ba7e-4da7-a5dd-5a66369ed5c9';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Castro","Altura":"200","Largura":"159.4","Profundidade":"54.3","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Rudá"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '159.4'),
        depth = COALESCE(NULLIF(depth, '0'), '54.3'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'ddb06fbb-0524-4c37-8882-68a0b4d46d45';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"218","Largura":"208","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Faimec","Modelo":"Fortaleza","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '218'),
        width = COALESCE(NULLIF(width, '0'), '208'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '33a234cf-3003-4614-9106-b0f4ffcb169b';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"213","Largura":"263","Profundidade":"53","Tipo de portas":"Bater","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"3 gavetas","Marca":"Atualle","Modelo":"Tunísia","Quantidade de portas":"11 portas","Tipo/material da corrediça":"Corrediça metálica simples","Peso":"131.9","Espessura do MDF/MDP":"15 mm"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '213'),
        width = COALESCE(NULLIF(width, '0'), '263'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Atualle' ELSE brand END,
        updated_at = NOW()
      WHERE id = '9193bcb1-ff4e-47ed-b8d6-60aca392b9e2';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"6 gavetas","Marca":"Demóbile","Modelo":"Cádis","Altura":"217","Largura":"200","Profundidade":"47","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '217'),
        width = COALESCE(NULLIF(width, '0'), '200'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
        updated_at = NOW()
      WHERE id = '293f82ef-0ea1-459f-8060-2a8e5cbe6a27';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":"Preto","Marca":"Maxel","Altura":"200","Modelo":"Paris","Largura":"237","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Material da estrutura":"MDP","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '237'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'c0cda89f-8971-4146-bce7-0c4ead887f24';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"78.5","Largura":"160","Profundidade":"50.5","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Darmovel","Modelo":"Darmovel 1,60m","Quantidade de portas":"3 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '78.5'),
        width = COALESCE(NULLIF(width, '0'), '160'),
        depth = COALESCE(NULLIF(depth, '0'), '50.5'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
        updated_at = NOW()
      WHERE id = '0dce5b6f-d093-466f-8ada-c8d005bccf39';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Moval","Altura":"105","Largura":"147","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Texas","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '105'),
        width = COALESCE(NULLIF(width, '0'), '147'),
        depth = COALESCE(NULLIF(depth, '0'), '47'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'bb8ec31b-92a3-4116-9fb6-5d6520f5e0ae';
    

        DELETE FROM public.product_categories 
        WHERE product_id = '72020dcc-fb0a-4982-a12d-a8d2fc434df4' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

        INSERT INTO public.product_categories (product_id, category_id)
        SELECT '72020dcc-fb0a-4982-a12d-a8d2fc434df4'::uuid, 'b3a1a235-fd4c-4706-a058-6f8200b3731a'::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM public.product_categories 
          WHERE product_id = '72020dcc-fb0a-4982-a12d-a8d2fc434df4' AND category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a'
        );
      

      UPDATE public.products
      SET 
        category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a',
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":"Freijó","Peso":"80.8","Altura":"200","Largura":"186","Profundidade":"53","Marca":"Cadorin","Modelo":"Grazi","Material da estrutura":"MDP","Tipo de portas":"Bater + Basculante","Quantidade de portas":"8 portas","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não","Espessura do MDF/MDP":"15 mm","Material dos puxadores":"Plástico / ABS","Pés reguláveis":"Sim"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '200'),
        width = COALESCE(NULLIF(width, '0'), '186'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
        updated_at = NOW()
      WHERE id = '72020dcc-fb0a-4982-a12d-a8d2fc434df4';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"210","Largura":"180","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Faimec","Modelo":"Fênix","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '210'),
        width = COALESCE(NULLIF(width, '0'), '180'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
        updated_at = NOW()
      WHERE id = '6e4001b4-a3a4-4bed-bf6a-ab2e763714ab';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"JK","Altura":"196","Largura":"239","Profundidade":"53","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Material da estrutura":"MDP","Modelo":"JK 3 Peças","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '196'),
        width = COALESCE(NULLIF(width, '0'), '239'),
        depth = COALESCE(NULLIF(depth, '0'), '53'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'JK' ELSE brand END,
        updated_at = NOW()
      WHERE id = '6cfb0413-a223-4585-9dab-c2024d26e93b';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Altura":"115.2","Largura":"120","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"Curitiba","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '115.2'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'f7f78130-c551-478d-afb6-c1713b2afb3a';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"JK","Altura":"81","Largura":"119","Profundidade":"52","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"JK 1ª Linha","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '81'),
        width = COALESCE(NULLIF(width, '0'), '119'),
        depth = COALESCE(NULLIF(depth, '0'), '52'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'JK' ELSE brand END,
        updated_at = NOW()
      WHERE id = '087bb01e-812c-4040-b743-2aebc77f46e6';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Móveis Sul","Altura":"87","Largura":"120","Profundidade":"50","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Florença","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '87'),
        width = COALESCE(NULLIF(width, '0'), '120'),
        depth = COALESCE(NULLIF(depth, '0'), '50'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Sul' ELSE brand END,
        updated_at = NOW()
      WHERE id = 'f56e238f-a86c-4f5e-853b-7d63c5c963b8';
    

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
      WHERE id = '5d61e058-002e-49d7-9b3d-e4bae4d03d5e';
    

      UPDATE public.products
      SET 
        
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '{"Cor":null,"Marca":"Mopar","Altura":"230","Largura":"160","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Turim","Possui espelho":"Não"}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '230'),
        width = COALESCE(NULLIF(width, '0'), '160'),
        depth = COALESCE(NULLIF(depth, '0'), '45'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
        updated_at = NOW()
      WHERE id = '48eb76af-d842-4b91-a40c-35e41c7e6a7b';
    
COMMIT;