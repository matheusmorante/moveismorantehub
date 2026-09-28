const { Client } = require('../../erp/node_modules/pg');
const crypto = require('crypto');

async function run() {
    const connStr = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
    const setupClient = new Client({ connectionString: connStr });
    await setupClient.connect();

    // Create a standalone schema for testing
    await setupClient.query(`DROP SCHEMA IF EXISTS test_nfe CASCADE`);
    await setupClient.query(`CREATE SCHEMA test_nfe`);
    
    await setupClient.query(`
        CREATE TABLE test_nfe.orders (
            id uuid PRIMARY KEY
        )
    `);

    await setupClient.query(`
        CREATE TABLE test_nfe.nfe_documents (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id uuid REFERENCES test_nfe.orders(id),
            document_type text,
            status text,
            emission_request_id uuid,
            chave_acesso text,
            numero_nfe integer,
            serie text,
            modelo text,
            ambiente integer,
            finalidade integer,
            motivo_status text,
            xml_nfe text,
            created_at timestamptz,
            updated_at timestamptz
        )
    `);

    // RPC modified for the test schema
    await setupClient.query(`
        CREATE OR REPLACE FUNCTION test_nfe.reserve_nfe_outbound_emission(
            p_order_id uuid,
            p_modelo varchar(2),
            p_ambiente integer,
            p_emission_request_id uuid,
            p_chave_acesso varchar(44),
            p_xml_nfe text,
            p_numero_nfe integer,
            p_serie varchar(4)
        ) RETURNS uuid AS $$
        DECLARE
            v_existing_id uuid;
            v_existing_status varchar;
            v_new_id uuid;
        BEGIN
            PERFORM pg_advisory_xact_lock(hashtext('nfe_emit_order_' || p_order_id::text));
            
            SELECT id, status INTO v_existing_id, v_existing_status
            FROM test_nfe.nfe_documents
            WHERE order_id = p_order_id
              AND document_type = 'outbound'
              AND status IN ('pendente', 'processando')
            LIMIT 1;

            IF FOUND THEN
                RAISE EXCEPTION 'ALREADY_ACTIVE:%:%', v_existing_id, v_existing_status;
            END IF;

            IF EXISTS (SELECT 1 FROM test_nfe.nfe_documents WHERE emission_request_id = p_emission_request_id) THEN
                RAISE EXCEPTION 'DUPLICATE_IDEMPOTENCY_KEY';
            END IF;

            INSERT INTO test_nfe.nfe_documents (
                order_id, numero_nfe, serie, chave_acesso,
                modelo, ambiente, status, document_type, finalidade,
                emission_request_id, motivo_status, xml_nfe, created_at, updated_at
            ) VALUES (
                p_order_id, p_numero_nfe, p_serie, p_chave_acesso,
                p_modelo, p_ambiente, 'processando', 'outbound', 1,
                p_emission_request_id, 'Transmissão em andamento', p_xml_nfe, now(), now()
            ) RETURNING id INTO v_new_id;

            RETURN v_new_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    const orderId = crypto.randomUUID();
    await setupClient.query(`INSERT INTO test_nfe.orders (id) VALUES ($1)`, [orderId]);

    const client1 = new Client({ connectionString: connStr });
    const client2 = new Client({ connectionString: connStr });
    await client1.connect();
    await client2.connect();

    console.log('Starting concurrent requests...');
    const reqId1 = crypto.randomUUID();
    const reqId2 = crypto.randomUUID();
    
    // Fire both concurrently
    const p1 = client1.query(`SELECT test_nfe.reserve_nfe_outbound_emission($1, '55', 2, $2, 'chave1', '<xml></xml>', 1, '1')`, [orderId, reqId1]);
    const p2 = client2.query(`SELECT test_nfe.reserve_nfe_outbound_emission($1, '55', 2, $2, 'chave2', '<xml></xml>', 2, '1')`, [orderId, reqId2]);

    let results = [];
    try { await p1; results.push('Client1: SUCCESS'); } catch (e) { results.push('Client1: ' + e.message); }
    try { await p2; results.push('Client2: SUCCESS'); } catch (e) { results.push('Client2: ' + e.message); }

    console.log(results);

    // Now test a legitimate subsequent emission (first one authorized)
    // Manually authorize the first one
    await setupClient.query(`UPDATE test_nfe.nfe_documents SET status = 'autorizada' WHERE order_id = $1`, [orderId]);
    console.log('Authorized first emission.');

    // Third request for same order (e.g. partial billing)
    const reqId3 = crypto.randomUUID();
    try {
        await setupClient.query(`SELECT test_nfe.reserve_nfe_outbound_emission($1, '55', 2, $2, 'chave3', '<xml></xml>', 3, '1')`, [orderId, reqId3]);
        console.log('Client3: SUCCESS (Legitimate partial emission)');
    } catch(e) {
        console.log('Client3: ' + e.message);
    }

    await client1.end();
    await client2.end();
    await setupClient.end();
}

run().catch(console.error);
