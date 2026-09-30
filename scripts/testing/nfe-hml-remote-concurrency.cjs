// Requires an exact owned synthetic, unsigned DB fixture. Never calls SEFAZ.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
async function main() {
  const [documentId, orderId] = process.argv.slice(2);
  assert.match(documentId || '', /^[0-9a-f-]{36}$/i);
  assert.match(orderId || '', /^TEST_AUT_[0-9a-f-]{36}$/i);
  const processResult = spawnSync('npx.cmd', ['--yes','supabase','projects','api-keys',
    '--project-ref','hkoxhourxwlddgsfdgws','--output','json'],
    { shell: true, encoding: 'utf8', windowsHide: true, timeout: 90000 });
  assert.equal(processResult.status, 0, 'CLI access failed');
  const key = JSON.parse(processResult.stdout).find((row) => row.name === 'service_role')?.api_key;
  assert.ok(key, 'Server DB key unavailable');
  const db = createClient('https://hkoxhourxwlddgsfdgws.supabase.co',key,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: doc, error } = await db.from('nfe_documents')
    .select('id,order_id,ambiente,fiscal_ruleset_version,xml_nfe')
    .eq('id',documentId).maybeSingle();
  assert.equal(error, null);
  assert.ok(doc && doc.order_id === orderId && doc.ambiente === 2 &&
    doc.fiscal_ruleset_version === 'HML_TECHNICAL_V1' && !doc.xml_nfe.includes('<Signature'),
    'Not an owned unsigned DB-only fixture');
  for (let round=0; round<4; round++) {
    const tokens = [crypto.randomUUID(),crypto.randomUUID()];
    const results = await Promise.all(tokens.map((token) => db.rpc('claim_hml_nfe_attempt',
      { p_document_id: documentId, p_attempt_token: token })));
    assert.ok(results.every((r) => !r.error), 'Claim RPC failed');
    assert.equal(results.filter((r) => r.data === true).length,1,'Concurrent callers both won');
    const winner = tokens[results.findIndex((r) => r.data === true)];
    const release = await db.rpc('release_hml_nfe_attempt',
      { p_document_id: documentId, p_attempt_token: winner });
    assert.equal(release.error,null,'Lease release failed');
  }
  console.log(JSON.stringify({ testRunId: orderId, concurrentRounds:4,
    callersPerRound:2, soleWinnerEachRound:true, sefazContacted:false }));
}
main().catch(() => { console.error('Controlled concurrent check failed; clean the exact owned fixture.'); process.exitCode=1; });
