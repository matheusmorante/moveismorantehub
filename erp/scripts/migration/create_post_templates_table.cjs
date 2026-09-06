const pg = require('pg');

const DATABASE_URL = 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Conectado ao PostgreSQL do Supabase com sucesso.');

  const query = `
    CREATE TABLE IF NOT EXISTS public.post_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      description TEXT,
      category TEXT,
      aspect_ratio TEXT DEFAULT '4:5',
      formats JSONB DEFAULT '["4:5"]'::jsonb,
      width INTEGER DEFAULT 1080,
      height INTEGER DEFAULT 1350,
      image_prompt TEXT,
      fields JSONB DEFAULT '[]'::jsonb,
      layout JSONB DEFAULT '[]'::jsonb,
      reserved_areas JSONB DEFAULT '[]'::jsonb,
      image_rules JSONB DEFAULT '{}'::jsonb,
      generation_config JSONB DEFAULT '{}'::jsonb,
      assets JSONB DEFAULT '[]'::jsonb,
      extras JSONB DEFAULT '[]'::jsonb,
      status TEXT DEFAULT 'ACTIVE',
      version INTEGER DEFAULT 1,
      deleted BOOLEAN DEFAULT false,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Habilitar RLS
    ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

    -- Politica de permissao total para anon e authenticated (sistema interno ERP)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'post_templates' AND policyname = 'Allow all access to post_templates'
      ) THEN
        CREATE POLICY "Allow all access to post_templates" ON public.post_templates
          FOR ALL
          USING (true)
          WITH CHECK (true);
      END IF;
    END $$;

    -- Notificar PostgREST para recarregar o schema cache
    NOTIFY pgrst, 'reload schema';
  `;

  await client.query(query);
  console.log('Tabela public.post_templates criada e configurada com sucesso!');

  await client.end();
}

run().catch(err => {
  console.error('Erro na migracao:', err);
  process.exit(1);
});
