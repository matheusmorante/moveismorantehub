const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function invokeEdgeFunction() {
  console.log('Invocando Edge Function publicada sefaz-inbound-sync...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.functions.invoke('sefaz-inbound-sync', {
    body: { environment: 'production' }
  });

  console.log('Error:', error);
  console.log('Data:', data);
}

invokeEdgeFunction();
