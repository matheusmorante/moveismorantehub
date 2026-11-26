const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Checking columns for table: products...');
    try {
        // We can't query information_schema directly with anon key usually if RLS is on,
        // but we can try to select one row and see the keys.
        const { data, error } = await supabase.from('products').select('*').limit(1);

        if (error) {
            console.error('Error fetching product:', error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log('Columns found:', Object.keys(data[0]).join(', '));
        } else {
            console.log('No data found in products table to check columns.');
            // Try a metadata query if possible (likely to fail with anon key)
            const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'products' });
            if (colError) {
                console.log('Could not get columns via RPC.');
            } else {
                console.log('RPC columns:', cols);
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkColumns();
