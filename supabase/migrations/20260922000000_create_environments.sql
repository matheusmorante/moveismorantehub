-- 1. Create environments table
CREATE TABLE IF NOT EXISTS public.environments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create environment_categories table
CREATE TABLE IF NOT EXISTS public.environment_categories (
    environment_id UUID REFERENCES public.environments(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (environment_id, category_id)
);

-- 3. Migrar dados legados de categorias raízes para environments
DO $$
DECLARE
    env_record RECORD;
    new_env_id UUID;
BEGIN
    FOR env_record IN
        SELECT c.*
        FROM public.categories c
        WHERE NOT EXISTS (
            SELECT 1 FROM public.category_relationships cr WHERE cr.child_id = c.id
        )
    LOOP
        -- Cria o environment com as infos da raiz
        INSERT INTO public.environments (id, name, slug, created_at)
        VALUES (env_record.id, env_record.name, env_record.slug, env_record.created_at)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO new_env_id;

        IF new_env_id IS NULL THEN
            new_env_id := env_record.id;
        END IF;

        -- Copia as ligações de category_relationships para environment_categories
        INSERT INTO public.environment_categories (environment_id, category_id)
        SELECT parent_id, child_id
        FROM public.category_relationships
        WHERE parent_id = env_record.id
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
