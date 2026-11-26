import { createClient } from '@supabase/supabase-js';
const url='https://wzpdfmihnwcrgkyagwkd.supabase.co';
const key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase=createClient(url, key);
(async () => {
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    console.log('ORDER_COUNT:' + count);
    process.exit(0);
})();
