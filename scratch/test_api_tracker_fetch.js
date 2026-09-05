const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const headers = {
  'apikey': DEFAULT_SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${DEFAULT_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function test() {
  console.log('--- 1. Registrando chamadas para Google Routes e Google Places ---');

  const services = [
    { service: 'google_routes', operation: 'compute_routes_v2', units: 1 },
    { service: 'google_routes', operation: 'compute_routes_v2', units: 1 },
    { service: 'google_places', operation: 'autocomplete', units: 1 },
    { service: 'google_geocoding', operation: 'geocode', units: 1 },
    { service: 'google_route_optimization', operation: 'optimize_route', units: 1 }
  ];

  for (const s of services) {
    const res = await fetch(`${DEFAULT_SUPABASE_URL}/rest/v1/rpc/record_api_usage_atomic`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_provider: 'google',
        p_service: s.service,
        p_operation: s.operation,
        p_units: s.units,
        p_status: 'SUCCESS',
        p_http_status: 200,
        p_module_source: 'test_real',
        p_environment: 'development',
        p_cost_estimated: 0.02,
        p_cache_hit: false,
        p_response_time_ms: 85,
        p_request_id: 'real_test_' + Math.random().toString(36).slice(2),
        p_error_message: null
      })
    });
    console.log(`Registrado ${s.service}: status ${res.status}`);
  }

  console.log('\n--- 2. Consultando api_usage_daily ---');
  const resDaily = await fetch(`${DEFAULT_SUPABASE_URL}/rest/v1/api_usage_daily?select=*`, { headers });
  const dailyData = await resDaily.json();
  console.log('Linhas em api_usage_daily:', dailyData);
}

test();
