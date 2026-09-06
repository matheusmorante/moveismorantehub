import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRpc() {
  const { data, error } = await supabase.rpc('record_api_usage_atomic', {
    p_provider: 'gemini',
    p_service: 'gemini_flash',
    p_operation: 'test_check',
    p_units: 0,
    p_status: 'SUCCESS',
    p_http_status: 200,
    p_module_source: 'inspection',
    p_environment: 'development',
    p_cost_estimated: 0,
    p_cache_hit: true
  });

  if (error) {
    console.log('Erro na função RPC record_api_usage_atomic:', error);
  } else {
    console.log('Função RPC record_api_usage_atomic existe e retornou:', data);
  }
}

inspectRpc();
