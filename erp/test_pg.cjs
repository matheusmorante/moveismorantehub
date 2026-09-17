const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: process.env.VITE_SUPABASE_URL.replace('https://', 'postgres://postgres:postgres@').replace('.supabase.co', ':5432/postgres'), // local connection string if possible, or just query it via a function
    });
    // Wait, the VITE_SUPABASE_URL is hkoxhourxwlddgsfdgws.supabase.co
    // I can't connect directly without the database password, which I don't have.
}

run();
