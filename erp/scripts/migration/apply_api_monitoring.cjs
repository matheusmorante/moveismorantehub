const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    console.log('Conectando ao PostgreSQL do Supabase...');
    await client.connect();
    console.log('Conectado com sucesso!');

    const sqlPath = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20260904160000_create_api_usage_monitoring.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Adiciona grants e policies para anon e authenticated garantindo que nada bloqueie a leitura/gravação
    sql += `
        GRANT EXECUTE ON FUNCTION public.record_api_usage_atomic TO anon, authenticated, service_role;

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'api_configurations' AND policyname = 'Permitir leitura de api_configurations para anon'
            ) THEN
                CREATE POLICY "Permitir leitura de api_configurations para anon"
                    ON public.api_configurations FOR SELECT
                    TO anon
                    USING (true);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'api_usage_daily' AND policyname = 'Permitir acesso a api_usage_daily para anon'
            ) THEN
                CREATE POLICY "Permitir acesso a api_usage_daily para anon"
                    ON public.api_usage_daily FOR ALL
                    TO anon
                    USING (true)
                    WITH CHECK (true);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'api_usage_logs' AND policyname = 'Permitir acesso a api_usage_logs para anon'
            ) THEN
                CREATE POLICY "Permitir acesso a api_usage_logs para anon"
                    ON public.api_usage_logs FOR ALL
                    TO anon
                    USING (true)
                    WITH CHECK (true);
            END IF;
        END $$;
    `;

    console.log('Executando migration de monitoramento de APIs...');
    await client.query(sql);
    console.log('Migration executada com sucesso!');

    // Verifica tabelas criadas
    const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('api_configurations', 'api_usage_daily', 'api_usage_logs');
    `);
    console.log('Tabelas encontradas:', res.rows.map(r => r.table_name));

    // Verifica seeds
    const seedCheck = await client.query(`SELECT count(*) FROM public.api_configurations;`);
    console.log('Total de configurações de API cadastradas:', seedCheck.rows[0].count);

    await client.end();
}

run().catch(err => {
    console.error('Erro na execução:', err);
    process.exit(1);
});
