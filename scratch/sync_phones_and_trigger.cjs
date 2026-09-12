const path = require('path');
const { Client } = require(path.resolve(__dirname, '../erp/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function runSync() {
  await client.connect();
  console.log('Conectado ao Postgres do Supabase!');

  // 1. Sincroniza telefones existentes da tabela people para a tabela profiles
  console.log('Sincronizando telefones de people -> profiles...');
  const syncProfiles = await client.query(`
    UPDATE public.profiles p
    SET phone = pe.phone
    FROM public.people pe
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(pe.email))
      AND pe.phone IS NOT NULL
      AND TRIM(pe.phone) != ''
      AND (p.phone IS NULL OR TRIM(p.phone) = '');
  `);
  console.log(`Perfis atualizados por email: ${syncProfiles.rowCount}`);

  // Se Rosilene ou Matheus ainda estiverem sem telefone em profiles, garante pelos nomes
  await client.query(`
    UPDATE public.profiles
    SET phone = '(41) 99224-4631'
    WHERE (email ILIKE '%rosilenemorante%' OR full_name ILIKE '%rosilene%')
      AND (phone IS NULL OR TRIM(phone) = '');
  `);

  await client.query(`
    UPDATE public.profiles
    SET phone = '(41) 99749-3547'
    WHERE (email ILIKE '%matheusmorante002%' OR email ILIKE '%matheusmorante001%')
      AND (phone IS NULL OR TRIM(phone) = '');
  `);

  // Sincroniza também por nome se houver correspondência
  await client.query(`
    UPDATE public.profiles p
    SET phone = pe.phone
    FROM public.people pe
    WHERE LOWER(TRIM(p.full_name)) = LOWER(TRIM(pe.full_name))
      AND pe.phone IS NOT NULL
      AND TRIM(pe.phone) != ''
      AND (p.phone IS NULL OR TRIM(p.phone) = '');
  `);

  // 2. Atualiza a trigger handle_new_user para puxar telefone do Google ou de people
  console.log('Atualizando trigger handle_new_user...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    DECLARE
      v_phone text;
      v_name text;
    BEGIN
      -- 1. Tenta extrair telefone dos metadados do Google / Auth
      v_phone := COALESCE(
        new.phone,
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'phone_number',
        new.raw_user_meta_data->>'telephone',
        new.raw_user_meta_data->>'cellphone',
        new.raw_user_meta_data->>'whatsapp'
      );

      -- 2. Tenta extrair nome do Google / Auth
      v_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      );

      -- 3. Se não achou telefone nos metadados do Google, busca na tabela people
      IF v_phone IS NULL OR TRIM(v_phone) = '' THEN
        SELECT pe.phone INTO v_phone
        FROM public.people pe
        WHERE LOWER(TRIM(pe.email)) = LOWER(TRIM(new.email))
          AND pe.phone IS NOT NULL AND TRIM(pe.phone) != ''
        LIMIT 1;
      END IF;

      -- 4. Grava / Atualiza perfil com nome e telefone
      INSERT INTO public.profiles (id, email, full_name, phone, role)
      VALUES (new.id, new.email, v_name, v_phone, 'pending')
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        phone = COALESCE(profiles.phone, EXCLUDED.phone);

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  // 3. Atualiza os pedidos existentes adicionando sellerPhone e sellerData direto no order_data
  console.log('Populando sellerPhone e sellerData nos pedidos...');
  const resOrdersRosilene = await client.query(`
    UPDATE public.orders
    SET order_data = jsonb_set(
      jsonb_set(
        order_data,
        '{sellerPhone}',
        '"41992244631"'
      ),
      '{sellerData}',
      jsonb_build_object('fullName', 'Rosilene Morante', 'phone', '41992244631')
    )
    WHERE order_data->>'seller' ILIKE '%rosilene%'
      OR order_data->>'sellerName' ILIKE '%rosilene%';
  `);
  console.log(`Pedidos da Rosilene atualizados: ${resOrdersRosilene.rowCount}`);

  const resOrdersMatheus = await client.query(`
    UPDATE public.orders
    SET order_data = jsonb_set(
      jsonb_set(
        order_data,
        '{sellerPhone}',
        '"41997493547"'
      ),
      '{sellerData}',
      jsonb_build_object('fullName', 'Matheus Morante', 'phone', '41997493547')
    )
    WHERE order_data->>'seller' ILIKE '%matheus%'
      OR order_data->>'sellerName' ILIKE '%matheus%';
  `);
  console.log(`Pedidos do Matheus atualizados: ${resOrdersMatheus.rowCount}`);

  // 4. Conferir resultado final de profiles
  const finalProfiles = await client.query(`
    SELECT id, email, full_name, phone, role FROM public.profiles
  `);
  console.log('\n--- PERFIS APÓS ATUALIZAÇÃO ---');
  console.log(JSON.stringify(finalProfiles.rows, null, 2));

  await client.end();
  console.log('\nSincronização concluída com sucesso!');
}

runSync().catch(console.error);
