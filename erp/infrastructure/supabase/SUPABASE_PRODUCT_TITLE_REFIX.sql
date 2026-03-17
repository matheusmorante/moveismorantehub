-- ==========================================
-- 🛠️ CORREÇÃO DE ESQUEMA: PRODUTOS (TÍTULO DINÂMICO & SEO)
-- Garante que todos os campos necessários existam para evitar "resets" na edição.
-- ==========================================

DO $$ 
BEGIN 
    -- 1. Campos de Montagem de Título Automático
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='product_type_name') THEN 
        ALTER TABLE public.products ADD COLUMN product_type_name TEXT; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='environment') THEN 
        ALTER TABLE public.products ADD COLUMN environment TEXT; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='line') THEN 
        ALTER TABLE public.products ADD COLUMN line TEXT; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='has_no_line') THEN 
        ALTER TABLE public.products ADD COLUMN has_no_line BOOLEAN DEFAULT FALSE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='include_environment') THEN 
        ALTER TABLE public.products ADD COLUMN include_environment BOOLEAN DEFAULT TRUE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='include_line') THEN 
        ALTER TABLE public.products ADD COLUMN include_line BOOLEAN DEFAULT TRUE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='include_brand') THEN 
        ALTER TABLE public.products ADD COLUMN include_brand BOOLEAN DEFAULT TRUE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='include_type') THEN 
        ALTER TABLE public.products ADD COLUMN include_type BOOLEAN DEFAULT TRUE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='include_supplier_ref') THEN 
        ALTER TABLE public.products ADD COLUMN include_supplier_ref BOOLEAN DEFAULT FALSE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='title_complement') THEN 
        ALTER TABLE public.products ADD COLUMN title_complement TEXT; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='include_complement') THEN 
        ALTER TABLE public.products ADD COLUMN include_complement BOOLEAN DEFAULT TRUE; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='title_order') THEN 
        ALTER TABLE public.products ADD COLUMN title_order JSONB; 
    END IF;

    -- 2. Campos de SEO e Catalogo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='slug') THEN 
        ALTER TABLE public.products ADD COLUMN slug TEXT; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='meta_title') THEN 
        ALTER TABLE public.products ADD COLUMN meta_title TEXT; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='meta_description') THEN 
        ALTER TABLE public.products ADD COLUMN meta_description TEXT; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='seo_description') THEN 
        ALTER TABLE public.products ADD COLUMN seo_description TEXT; 
    END IF;

    -- 3. Campos de Dimensões e Inteligência (Garantia)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='width') THEN 
        ALTER TABLE public.products ADD COLUMN width NUMERIC; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='height') THEN 
        ALTER TABLE public.products ADD COLUMN height NUMERIC; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='depth') THEN 
        ALTER TABLE public.products ADD COLUMN depth NUMERIC; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='product_type_id') THEN 
        -- Fallback seguro se product_types não existir, removemos a FK.
        ALTER TABLE public.products ADD COLUMN product_type_id BIGINT; 
    END IF;

END $$;
