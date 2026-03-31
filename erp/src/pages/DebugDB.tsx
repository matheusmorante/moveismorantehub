import React, { useEffect, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export default function DebugDB() {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        async function check() {
            const results: any = {};
            
            // 1. Check Table Structure (if possible)
            try {
                const { data, error } = await supabase.from('orders').select('*').limit(1);
                results.orders_sample = data;
                results.orders_error = error;
                if (data?.[0]) {
                    results.order_data_type = typeof data[0].order_data;
                }
            } catch (e: any) { results.orders_exc = e.message; }

            // 2. Test Contains (Simple Object)
            try {
                const { data, error } = await supabase.from('orders').select('id').contains('order_data', { orderType: 'sale' }).limit(1);
                results.test_contains_simple = { data, error };
            } catch (e: any) { results.test_contains_simple_exc = e.message; }

            // 3. Test Contains (Nested Array - THIS FAILED FOR USER)
            try {
                const id = "16463803735";
                const { data, error } = await supabase.from('orders').select('id').contains('order_data', { items: [{ productId: id }] }).limit(1);
                results.test_contains_array = { data, error };
            } catch (e: any) { results.test_contains_array_exc = e.message; }

            // 4. Test Manual Quoted Contains (My fix)
            try {
                const id = "16463803735";
                const { data, error } = await supabase.from('orders').select('id').filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${id}\\"}]}"`).limit(1);
                results.test_manual_quoted = { data, error };
            } catch (e: any) { results.test_manual_quoted_exc = e.message; }

            // 5. Test Arrow (failed for user too?)
            try {
                const { data, error } = await supabase.from('orders').select('id').filter('order_data->>orderType', 'eq', 'sale').limit(1);
                results.test_arrow = { data, error };
            } catch (e: any) { results.test_arrow_exc = e.message; }

            setStatus(results);
        }
        check();
    }, []);

    return (
        <div style={{ padding: 20, whiteSpace: 'pre-wrap' }}>
            <h1>Database Debug</h1>
            {JSON.stringify(status, null, 2)}
        </div>
    );
}
