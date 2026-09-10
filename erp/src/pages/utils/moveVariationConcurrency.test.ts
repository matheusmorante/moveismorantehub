import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Auditoria E2E e Concorrência de Mover Variação via RPC Postgres', () => {

    it('1. Concorrência Real: move 2 variações simultâneas para o mesmo Pai B sem colisão de SKU', async () => {
        const testCodeB = `TB${Date.now().toString().slice(-4)}`;
        const parentBId = crypto.randomUUID();
        const parentAId = crypto.randomUUID();

        // Inserir pai B e pai A de teste com slug obrigatorio
        const { error: errP } = await supabase.from('products').insert([
            { id: parentBId, name: 'Pai B Teste Concorrencia', slug: `pai-b-${Date.now()}-1`, code: testCodeB, description: 'Desc', active: true, deleted: false, price: 100, unit_price: 100, cost_price: 50 },
            { id: parentAId, name: 'Pai A Teste Origem', slug: `pai-a-${Date.now()}-2`, code: `TA${Date.now().toString().slice(-4)}`, description: 'Desc', active: true, deleted: false, price: 100, unit_price: 100, cost_price: 50 }
        ]);
        expect(errP).toBeNull();

        // Criar 2 variações existentes no Pai B: -01 e -02
        const varB1Id = crypto.randomUUID();
        const varB2Id = crypto.randomUUID();
        const { error: errVB } = await supabase.from('product_variations').insert([
            { id: varB1Id, product_id: parentBId, sku: `${testCodeB}-01`, name: 'Pai B Var 01', attributes: { "Cor": "Azul" } },
            { id: varB2Id, product_id: parentBId, sku: `${testCodeB}-02`, name: 'Pai B Var 02', attributes: { "Cor": "Verde" } }
        ]);
        expect(errVB).toBeNull();

        // Criar 2 variações a serem movidas (VAR-X e VAR-Y) do Pai A
        const varXId = crypto.randomUUID();
        const varYId = crypto.randomUUID();
        const { error: errVX } = await supabase.from('product_variations').insert([
            { id: varXId, product_id: parentAId, sku: `ORIG-01-${Date.now()}`, name: 'Var X', attributes: { "Tam": "P" } },
            { id: varYId, product_id: parentAId, sku: `ORIG-02-${Date.now()}`, name: 'Var Y', attributes: { "Tam": "M" } }
        ]);
        expect(errVX).toBeNull();

        // Executar 2 requisições concorrentes idênticas via RPC para mover VAR-X e VAR-Y ao mesmo tempo para Pai B
        const [resX, resY] = await Promise.all([
            supabase.rpc('move_variation_to_parent', {
                p_variation_id: varXId,
                p_target_parent_id: parentBId,
                p_attributes: [{ name: 'Tam', value: 'P' }],
                p_name: 'Pai B Var X',
                p_images: [],
                p_source_parent_id: parentAId
            }),
            supabase.rpc('move_variation_to_parent', {
                p_variation_id: varYId,
                p_target_parent_id: parentBId,
                p_attributes: [{ name: 'Tam', value: 'M' }],
                p_name: 'Pai B Var Y',
                p_images: [],
                p_source_parent_id: parentAId
            })
        ]);

        expect(resX.error).toBeNull();
        expect(resY.error).toBeNull();

        // Buscar estado real do banco de dados
        const { data: updatedX } = await supabase.from('product_variations').select('id, product_id, sku').eq('id', varXId).single();
        const { data: updatedY } = await supabase.from('product_variations').select('id, product_id, sku').eq('id', varYId).single();

        expect(updatedX.product_id).toBe(parentBId);
        expect(updatedY.product_id).toBe(parentBId);

        // Garantir que os SKUs gerados sejam distintos e sequenciais (-03 e -04)
        const skus = [updatedX.sku, updatedY.sku].sort();
        expect(skus).toEqual([`${testCodeB}-03`, `${testCodeB}-04`]);
        expect(updatedX.sku).not.toBe(updatedY.sku);

        // Preservação do UUID
        expect(updatedX.id).toBe(varXId);
        expect(updatedY.id).toBe(varYId);

        // Cleanup
        await supabase.from('product_variations').delete().in('id', [varB1Id, varB2Id, varXId, varYId]);
        await supabase.from('products').delete().in('id', [parentAId, parentBId]);
    });

    it('2. Concorrência sobre a mesma variação (VAR-Z → Pai B vs VAR-Z → Pai C)', async () => {
        const testCodeB = `TB${Date.now().toString().slice(-4)}`;
        const testCodeC = `TC${Date.now().toString().slice(-4)}`;
        const parentBId = crypto.randomUUID();
        const parentCId = crypto.randomUUID();
        const varZId = crypto.randomUUID();

        const { error: errP } = await supabase.from('products').insert([
            { id: parentBId, name: 'Pai B Concorrencia Mesma Var', slug: `pai-b-${Date.now()}-3`, code: testCodeB, description: 'Desc', active: true, deleted: false, price: 100, unit_price: 100, cost_price: 50 },
            { id: parentCId, name: 'Pai C Concorrencia Mesma Var', slug: `pai-c-${Date.now()}-4`, code: testCodeC, description: 'Desc', active: true, deleted: false, price: 100, unit_price: 100, cost_price: 50 }
        ]);
        expect(errP).toBeNull();

        const { error: errV } = await supabase.from('product_variations').insert([
            { id: varZId, product_id: parentBId, sku: `${testCodeB}-01`, name: 'Var Z', attributes: { "Cor": "Preto" } }
        ]);
        expect(errV).toBeNull();

        // Duas requisições simultâneas tentando mover a mesma variação para alvos diferentes
        await Promise.allSettled([
            supabase.rpc('move_variation_to_parent', {
                p_variation_id: varZId,
                p_target_parent_id: parentBId,
                p_name: 'Pai B Var Z'
            }),
            supabase.rpc('move_variation_to_parent', {
                p_variation_id: varZId,
                p_target_parent_id: parentCId,
                p_name: 'Pai C Var Z'
            })
        ]);

        // Apenas uma das operações deve ser o estado final consistente
        const { data: finalVar } = await supabase.from('product_variations').select('id, product_id').eq('id', varZId).single();
        expect(finalVar).not.toBeNull();
        expect(finalVar.id).toBe(varZId); // UUID intocado
        expect([parentBId, parentCId]).toContain(finalVar.product_id); // Pertence a um dos dois pais válidos

        // Cleanup
        await supabase.from('product_variations').delete().eq('id', varZId);
        await supabase.from('products').delete().in('id', [parentBId, parentCId]);
    });

    it('3. Teste de Rollback em Falha Transacional (Pai Destino Inexistente)', async () => {
        const parentAId = crypto.randomUUID();
        const varId = crypto.randomUUID();
        const originalSku = `ORIG-${Date.now()}`;

        const { error: errP } = await supabase.from('products').insert([
            { id: parentAId, name: 'Pai Origem Rollback', slug: `pai-a-${Date.now()}-5`, code: 'ORIG', description: 'Desc', active: true, deleted: false, price: 100, unit_price: 100, cost_price: 50 }
        ]);
        expect(errP).toBeNull();

        const { error: errV } = await supabase.from('product_variations').insert([
            { id: varId, product_id: parentAId, sku: originalSku, name: 'Var Rollback' }
        ]);
        expect(errV).toBeNull();

        // Invocar com um pai destino inexistente para provocar erro e forçar o ROLLBACK no Postgres
        const invalidTargetId = crypto.randomUUID();
        const { error } = await supabase.rpc('move_variation_to_parent', {
            p_variation_id: varId,
            p_target_parent_id: invalidTargetId,
            p_name: 'Tentativa Invalida'
        });

        expect(error).not.toBeNull();

        // Consultar banco diretamente para verificar ausência de alterações parciais
        const { data: checkVar } = await supabase.from('product_variations').select('id, product_id, sku').eq('id', varId).single();
        expect(checkVar).not.toBeNull();
        expect(checkVar.product_id).toBe(parentAId);
        expect(checkVar.sku).toBe(originalSku);
        expect(checkVar.id).toBe(varId);

        // Cleanup
        await supabase.from('product_variations').delete().eq('id', varId);
        await supabase.from('products').delete().eq('id', parentAId);
    });

});
