const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

const sql = `
CREATE OR REPLACE FUNCTION public.sync_order_columns()
RETURNS trigger AS $$
BEGIN
  IF NEW.order_data IS NOT NULL THEN
    NEW.order_number := NEW.id::text;
    NEW.status := COALESCE(NEW.order_data->>'status', NEW.status);
    NEW.customer_id := NEW.order_data->'customerData'->>'id';
    NEW.customer_name := NEW.order_data->'customerData'->>'fullName';
    NEW.seller_name := NEW.order_data->>'seller';
    
    -- Busca automatica do seller_id a partir da tabela profiles pelo nome completo concatenado
    SELECT id INTO NEW.seller_id FROM public.profiles WHERE LOWER(TRIM(first_name || ' ' || COALESCE(last_name, ''))) = LOWER(NEW.order_data->>'seller') LIMIT 1;

    NEW.items := NEW.order_data->'items';
    NEW.total_amount := COALESCE((NEW.order_data->'paymentsSummary'->>'totalOrderValue')::numeric, 0);
    NEW.payment_method := NEW.order_data->'payments'->0->>'method';
    NEW.channel := COALESCE(NEW.order_data->>'channel', NEW.channel);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_columns ON public.orders;

CREATE TRIGGER trg_sync_order_columns
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_columns();

-- Executar a atualizacao retroativa
UPDATE public.orders
SET 
  order_number = id::text,
  status = COALESCE(order_data->>'status', status),
  customer_id = order_data->'customerData'->>'id',
  customer_name = order_data->'customerData'->>'fullName',
  seller_name = order_data->>'seller',
  seller_id = (SELECT id FROM public.profiles WHERE LOWER(TRIM(first_name || ' ' || COALESCE(last_name, ''))) = LOWER(orders.order_data->>'seller') LIMIT 1),
  items = order_data->'items',
  total_amount = COALESCE((order_data->'paymentsSummary'->>'totalOrderValue')::numeric, 0),
  payment_method = order_data->'payments'->0->>'method',
  channel = COALESCE(order_data->>'channel', channel)
WHERE order_data IS NOT NULL;
`;

async function run() {
    console.log("Conectando ao Postgres...");
    await client.connect();
    console.log("Conectado! Executando DDL e DML...");
    await client.query(sql);
    console.log("Executado com sucesso!");
    await client.end();
}

run().catch(err => {
    console.error("Erro na execucao:", err);
    process.exit(1);
});
