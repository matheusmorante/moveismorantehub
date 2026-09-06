const pg = require('pg');

const DATABASE_URL = 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Conectado ao PostgreSQL do Supabase com sucesso.');

  const query = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS public.post_share_tokens (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id    TEXT NOT NULL,
      variation_id  TEXT,
      token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
      active        BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Índices para busca rápida
    CREATE INDEX IF NOT EXISTS post_share_tokens_token_idx
      ON public.post_share_tokens (token)
      WHERE active = true;

    CREATE INDEX IF NOT EXISTS post_share_tokens_product_idx
      ON public.post_share_tokens (product_id)
      WHERE active = true;

    -- Habilitar RLS
    ALTER TABLE public.post_share_tokens ENABLE ROW LEVEL SECURITY;

    -- Política de leitura pública (necessário para a página pública /share/...)
    DROP POLICY IF EXISTS "public_read_post_share_tokens" ON public.post_share_tokens;
    CREATE POLICY "public_read_post_share_tokens"
      ON public.post_share_tokens
      FOR SELECT
      TO anon, authenticated
      USING (active = true);

    -- Política de gerenciamento (leitura/escrita/update para usuários do ERP e anon se necessário)
    DROP POLICY IF EXISTS "allow_all_post_share_tokens" ON public.post_share_tokens;
    CREATE POLICY "allow_all_post_share_tokens"
      ON public.post_share_tokens
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);

    -- Notificar PostgREST para recarregar o cache do schema imediatamente
    NOTIFY pgrst, 'reload schema';
  `;

  await client.query(query);
  console.log('Tabela public.post_share_tokens criada, configurada e schema recarregado com sucesso!');

  // Testar um select rápido para confirmar
  const testRes = await client.query('SELECT count(*) FROM public.post_share_tokens');
  console.log('Count atual de post_share_tokens:', testRes.rows[0].count);

  await client.end();
}

run().catch(err => {
  console.error('Erro ao aplicar migracao de post_share_tokens:', err);
  process.exit(1);
});
