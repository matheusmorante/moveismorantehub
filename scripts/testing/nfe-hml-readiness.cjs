const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '..', '.env.local');
const fail = (code) => {
  process.stderr.write(`FAIL ${code}\n`);
  process.exitCode = 1;
};

function readEnvironment(value) {
  if (value === '2') return 2;
  try {
    const parsed = JSON.parse(value || 'null');
    if (parsed && typeof parsed === 'object') {
      for (const key of ['tpAmb', 'tp_amb', 'environment']) {
        if (Number(parsed[key]) === 2) return 2;
        if (Number(parsed[key]) === 1) return 1;
      }
    }
  } catch {
    // Treat unknown formats as unsafe; never infer homologation.
  }
  return undefined;
}

function inspectReadiness(env) {
  const supabase = Boolean((env.SUPABASE_URL || env.VITE_SUPABASE_URL) && env.SUPABASE_SECRET_KEY);
  const certificate = Boolean(env.NFE_CERTIFICATE_BASE64);
  const certificatePassword = Boolean(env.NFE_CERTIFICATE_PASSWORD);
  const responsibleTech = Boolean((env.NFE_RESP_TECH_CNPJ || env.NFE_RESPONSIBLE_TECH_CNPJ) &&
    (env.NFE_RESP_TECH_CONTACT || env.NFE_RESPONSIBLE_TECH_CONTACT) &&
    (env.NFE_RESP_TECH_EMAIL || env.NFE_RESPONSIBLE_TECH_EMAIL) &&
    (env.NFE_RESP_TECH_PHONE || env.NFE_RESPONSIBLE_TECH_PHONE));
  const csrtHomologacao = Boolean(env.NFE_CSRT_HOMOLOGACAO);
  const idCsrtHomologacao = Boolean(env.NFE_ID_CSRT_HOMOLOGACAO);
  const tpAmb = readEnvironment(env.NFE_ENVIRONMENT);
  const productionEnabled = String(env.NFE_PRODUCTION_ENABLED || '').trim().toLowerCase() === 'true';
  const operatorEmail = Boolean(env.NFE_HML_TEST_OPERATOR_EMAIL);
  const operatorPassword = Boolean(env.NFE_HML_TEST_OPERATOR_PASSWORD);
  // Actual authentication is verified by the runner, never inferred from a secret key.
  const operatorConfigured = operatorEmail && operatorPassword && Boolean(env.VITE_SUPABASE_ANON_KEY);
  const readiness = {
    supabase,
    certificate,
    certificatePassword,
    responsibleTech,
    csrtHomologacao,
    idCsrtHomologacao,
    sefazHomologacao: true,
    tpAmb: tpAmb === undefined ? 'unknown' : tpAmb,
    productionEnabled,
    operatorEmail,
    operatorPassword,
  };

  const missing = [
    ['supabase', 'PRECHECK_SUPABASE'],
    ['certificate', 'PRECHECK_CERTIFICATE'],
    ['certificatePassword', 'PRECHECK_CERTIFICATE_PASSWORD'],
    ['responsibleTech', 'PRECHECK_RESPONSIBLE_TECH'],
    ['csrtHomologacao', 'PRECHECK_CSRT'],
    ['idCsrtHomologacao', 'PRECHECK_ID_CSRT'],
  ].find(([key]) => !readiness[key]);
  const failure = missing?.[1] || (tpAmb !== 2 ? 'PRECHECK_TPAMB' :
    productionEnabled ? 'PRECHECK_PRODUCTION_DISABLED' :
      !operatorConfigured ? 'PRECHECK_OPERATOR_AUTH' : undefined);
  return { readiness, failure };
}

function main() {
  if (!fs.existsSync(envPath)) return fail('PRECHECK_VERCEL_ENV');
  const { readiness, failure } = inspectReadiness(dotenv.parse(fs.readFileSync(envPath)));
  for (const [key, value] of Object.entries(readiness))
    process.stdout.write(`${key}=${value}\n`);
  if (failure) return fail(failure);
  process.stdout.write('Readiness local aprovada.\n');
}

if (require.main === module) main();
module.exports = { inspectReadiness };
