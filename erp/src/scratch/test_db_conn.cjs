const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT current_database(), current_user, version()');
    console.log('SUCCESS:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

run();
