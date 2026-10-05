const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {securityExitCode} = require('../security.cjs');
test('a missing or failed scanner never reports success',()=>{
  assert.equal(securityExitCode({status:null,error:new Error('TEST_AUT_MISSING_BINARY')}),1);
  assert.equal(securityExitCode({status:1}),1);
  assert.equal(securityExitCode({status:0}),0);
});
test('both secret scanners redact values',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../security.cjs'),'utf8');
  assert.match(source,/\['git','--redact'/);
  assert.match(source,/\['dir','--redact'/);
  assert.match(source,/\.gitleaks\.history\.toml/);
  assert.match(source,/--log-opts=--all/);
});
