import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApiUsageLogs() {
  const { data: logs, error: lErr } = await supabase.from('api_usage_logs').select('*').limit(5);
  console.log('api_usage_logs:', lErr ? lErr.message : logs);

  const { data: daily, error: dErr } = await supabase.from('api_usage_daily').select('*').limit(5);
  console.log('api_usage_daily:', dErr ? dErr.message : daily);
}

checkApiUsageLogs();
