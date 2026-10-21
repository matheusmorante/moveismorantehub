import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const cliEntry = join(process.env.APPDATA || '', 'npm/node_modules/vercel/dist/vc.js');
const observations: { path: string; method: string; status: number; platformError?: string; requestId?: string }[] = [];
let origin: string;

beforeAll(() => {
  const rawTarget = process.env.SUPPORT_DEPLOYMENT_URL;
  if (!rawTarget) throw new Error('Informe explicitamente a implantação da Central.');
  const target = new URL(rawTarget);
  const allowed = /^morantehub-[a-z0-9]+-matheusmorantes-projects\.vercel\.app$/.test(target.hostname)
    || ['morantehub.com', 'morantehub.vercel.app'].includes(target.hostname);
  if (!allowed || target.protocol !== 'https:' || target.pathname !== '/' || target.search || target.hash
    || target.username || target.password || target.port) throw new Error('Destino fora do projeto autorizado.');
  const link = JSON.parse(readFileSync(join(workspaceRoot, '.vercel/project.json'), 'utf8'));
  if (link.projectId !== 'prj_cj2JEx1xLPgqhFUH9FiMcPq58YrQ' || link.orgId !== 'team_dgKjq9dB1Rwj8tUl7ZNAlZ69') {
    throw new Error('Vínculo Vercel divergente.');
  }
  if (!existsSync(cliEntry)) throw new Error('CLI autenticada da Vercel não encontrada.');
  origin = target.origin;
});

// CLI authentication remains inside Vercel; no token or response headers enter evidence.
async function inspect(path: string, method: 'GET' | 'POST', invalidSignature = false) {
  if (['morantehub.com', 'morantehub.vercel.app'].includes(new URL(origin).hostname)) {
    // The CLI resolves deployment permalinks, not custom aliases. Public domains
    // use ordinary HTTP; an unexpected protection/redirect remains a test failure.
    const headers: Record<string, string> = {};
    if (method === 'POST') headers['Content-Type'] = 'application/json';
    if (invalidSignature) headers['X-Hub-Signature-256'] = 'sha256=' + '0'.repeat(64);
    const response = await fetch(new URL(path, origin), { method, headers,
      ...(method === 'POST' && { body: '{}' }), redirect: 'manual', signal: AbortSignal.timeout(25_000) });
    return observe(path, method, response.status, await response.text());
  }
  const args = [cliEntry, 'curl', path, '--deployment', origin, '--scope', 'team_dgKjq9dB1Rwj8tUl7ZNAlZ69', '--',
    '--silent', '--show-error', '--connect-timeout', '10', '--max-time', '25', '--request', method,
    '--write-out', '\n__SUPPORT_STATUS__:%{http_code}'];
  if (method === 'POST') args.push('--header', 'Content-Type: application/json', '--data-binary', '{}');
  if (invalidSignature) args.push('--header', 'X-Hub-Signature-256: sha256=' + '0'.repeat(64));
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(process.execPath, args, { cwd: workspaceRoot, encoding: 'utf8',
      timeout: 60_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true }));
  } catch (error) {
    const failure = error as { code?: string | number; stderr?: string };
    const stderr = failure.stderr || '';
    const reason = /path.*(?:start|relative|http)|absolute.*url|url.*instead|path must/i.test(stderr) ? 'formato do caminho'
      : /unknown|unexpected|invalid.*option/i.test(stderr) ? 'opção da CLI'
        : /log.?in|authentication|not authenticated/i.test(stderr) ? 'autenticação da CLI'
          : /TRUSTED_SOURCES_ENVIRONMENT_MISMATCH/.test(stderr) ? 'Trusted Sources'
            : /project|deployment.*not found/i.test(stderr) ? 'projeto/implantação' : 'execução da CLI';
    throw new Error(`Consulta da implantação falhou: ${reason}; código ${String(failure.code || 'indisponível')}.`);
  }
  const marker = stdout.lastIndexOf('\n__SUPPORT_STATUS__:');
  const status = Number(stdout.slice(marker + '\n__SUPPORT_STATUS__:'.length, marker + '\n__SUPPORT_STATUS__:'.length + 3));
  if (marker < 0 || !Number.isInteger(status) || status < 100 || status > 599) throw new Error('Resposta HTTP não identificada.');
  return observe(path, method, status, stdout.slice(0, marker));
}

function observe(path: string, method: string, status: number, body: string) {
  const platformError = body.match(/\b(?:FUNCTION_INVOCATION_FAILED|FUNCTION_INVOCATION_TIMEOUT|FUNCTION_NOT_FOUND)\b/)?.[0];
  const requestId = body.match(/\b[a-z]{3}\d::[a-zA-Z0-9-]+\b/)?.[0];
  observations.push({ path, method, status, ...(platformError && { platformError }), ...(requestId && { requestId }) });
  return { status, body };
}

afterAll(() => {
  const output = process.env.SUPPORT_DEPLOYMENT_PROOF_OUTPUT;
  if (output && origin) writeFileSync(output, JSON.stringify({ origin, checkedAt: new Date().toISOString(),
    observations, validBusinessCommandsSubmitted: false, validWebhooksSubmitted: false,
    metaDispatchRequested: false, credentialsRecorded: false }, null, 2) + '\n', 'utf8');
});

describe.sequential('Página e guardas da implantação da Central', () => {
  it('entrega o HTML compilado da aplicação na rota da Inbox', async () => {
    const result = await inspect('/atendimento', 'GET');
    expect(result.status).toBe(200);
    expect(result.body.includes('<div id="root">')).toBe(true);
    expect(/<script[^>]+src="\/assets\//.test(result.body)).toBe(true);
    expect(result.body.includes('/src/index.tsx')).toBe(false);
  });
  it.each(['/api/whatsapp-media?id=12345', '/api/whatsapp-webhook?operation=media&id=12345'])(
    'recusa mídia sem sessão de aplicação em %s', async (path) => {
      const result = await inspect(path, 'GET');
      expect(result.status).toBe(401);
      expect(result.body.includes('Entre novamente para consultar a mídia.')).toBe(true);
    });
  it.each(['/api/whatsapp-dispatch', '/api/whatsapp-webhook?operation=dispatch'])(
    'mantém despacho bloqueado em %s', async (path) => {
      const result = await inspect(path, 'POST');
      expect(result.status).toBe(403);
      expect(result.body.includes('BLOCKED_FREE_TIER_PROTECTION')).toBe(true);
    });
  it.each([false, true])('recusa webhook sem assinatura válida (assinatura forjada: %s)', async (invalidSignature) => {
    const result = await inspect('/api/whatsapp-webhook', 'POST', invalidSignature);
    expect(result.status).toBe(401);
    expect(result.body.includes('Invalid signature')).toBe(true);
  });
});
