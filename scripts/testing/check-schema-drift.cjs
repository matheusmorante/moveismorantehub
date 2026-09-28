const fs = require('node:fs');
const path = require('node:path');
const { verifyLocalSupabase } = require('./supabase-local-preflight.cjs');

const ROOT = path.resolve(__dirname, '../..');
const manifestPath = path.join(ROOT, 'supabase/tests/certification/schema.expected.json');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

async function main() {
  const local = await verifyLocalSupabase({ projectDir: process.env.SUPABASE_TEST_PROJECT_DIR || ROOT });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.status !== 'complete' || !manifest.schemaSnapshot) {
    throw new Error('Manifesto esperado incompleto; schema drift não pode ser classificado. Nenhuma comparação foi declarada aprovada.');
  }
  let Client;
  try { ({ Client } = require(require.resolve('pg', { paths: [path.join(ROOT, 'supabase/tests')] }))); }
  catch { throw new Error('Dependência `pg` do workspace supabase/tests não encontrada.'); }
  const db = new Client({ connectionString: local.dbUrl });
  try {
    await db.connect();
    const query = await db.query(`
      SELECT jsonb_build_object(
        'relations', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rlsEnabled',c.relrowsecurity,'rlsForced',c.relforcerowsecurity) ORDER BY n.nspname,c.relname),'[]'::jsonb) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p','v','m','f')),
        'columns', (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.table_schema,c.table_name,c.ordinal_position),'[]'::jsonb) FROM information_schema.columns c WHERE c.table_schema IN ('public','storage')),
        'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',t.relname,'name',con.conname,'type',con.contype,'definition',pg_get_constraintdef(con.oid,true)) ORDER BY n.nspname,t.relname,con.conname),'[]'::jsonb) FROM pg_constraint con JOIN pg_class t ON t.oid=con.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('public','storage')),
        'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',indexname,'definition',indexdef) ORDER BY schemaname,tablename,indexname),'[]'::jsonb) FROM pg_indexes WHERE schemaname IN ('public','storage')),
        'functions', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'identity',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid)) ORDER BY n.nspname,p.oid::regprocedure::text),'[]'::jsonb) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
        'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',t.relname,'name',tr.tgname,'definition',pg_get_triggerdef(tr.oid,true)) ORDER BY n.nspname,t.relname,tr.tgname),'[]'::jsonb) FROM pg_trigger tr JOIN pg_class t ON t.oid=tr.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE NOT tr.tgisinternal AND n.nspname IN ('public','storage')),
        'policies', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check) ORDER BY schemaname,tablename,policyname),'[]'::jsonb) FROM pg_policies WHERE schemaname IN ('public','storage')),
        'tableGrants', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',table_schema,'table',table_name,'grantee',grantee,'privilege',privilege_type,'grantable',is_grantable) ORDER BY table_schema,table_name,grantee,privilege_type),'[]'::jsonb) FROM information_schema.role_table_grants WHERE table_schema IN ('public','storage')),
        'routineGrants', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',routine_schema,'routine',routine_name,'grantee',grantee,'privilege',privilege_type,'grantable',is_grantable) ORDER BY routine_schema,routine_name,grantee,privilege_type),'[]'::jsonb) FROM information_schema.routine_privileges WHERE routine_schema IN ('public','storage')),
        'sequenceGrants', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',sequence_schema,'sequence',sequence_name,'grantee',grantee,'privilege',privilege_type,'grantable',is_grantable) ORDER BY sequence_schema,sequence_name,grantee,privilege_type),'[]'::jsonb) FROM information_schema.sequence_privileges WHERE sequence_schema IN ('public','storage')),
        'userTypes', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',t.typname,'kind',t.typtype,'definition',pg_catalog.format_type(t.oid,NULL)) ORDER BY n.nspname,t.typname),'[]'::jsonb) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN ('public','storage') AND t.typtype IN ('e','d','c')),
        'storageBuckets', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'public',public,'fileSizeLimit',file_size_limit,'allowedMimeTypes',allowed_mime_types) ORDER BY id),'[]'::jsonb) FROM storage.buckets)
      ) AS snapshot
    `);
    const actual = stable(query.rows[0].snapshot);
    const expected = stable(manifest.schemaSnapshot);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Schema drift bloqueador: snapshot local difere do manifesto versionado.');
    console.log(`Schema drift aprovado contra manifesto versionado (${local.projectId}).`);
  } finally {
    await db.end();
  }
}

main().catch(error => {
  console.error(`Schema drift não aprovado: ${error.message}`);
  process.exitCode = 1;
});
