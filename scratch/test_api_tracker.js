const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function test() {
  console.log('1. Testando SELECT em api_configurations...');
  const { data: configs, error: errConfig } = await supabase.from('api_configurations').select('*');
  console.log('Configs:', configs ? configs.length : null, 'Error:', errConfig);

  console.log('2. Testando SELECT em api_usage_daily...');
  const { data: daily, error: errDaily } = await supabase.from('api_usage_daily').select('*');
  console.log('Daily rows:', daily, 'Error:', errDaily);

  console.log('3. Testando SELECT em api_usage_logs...');
  const { data: logs, error: errLogs } = await supabase.from('api_usage_logs').select('*').limit(5);
  console.log('Logs count:', logs ? logs.length : null, 'Error:', errLogs);

  console.log('4. Testando chamada RPC record_api_usage_atomic...');
  const { data: rpcData, error: errRpc } = await supabase.rpc('record_api_usage_atomic', {
    p_provider: 'google',
    p_service: 'google_routes',
    p_operation: 'directions_route',
    p_units: 1,
    p_status: 'SUCCESS',
    p_http_status: 200,
    p_module_source: 'test_script',
    p_environment: 'development',
    p_cost_estimated: 0,
    p_cache_hit: false,
    p_response_time_ms: 120,
    p_request_id: 'test_req_' + Date.now(),
    p_error_message: null
  });
  console.log('RPC Data:', rpcData, 'Error:', errRpc);
}

test();
