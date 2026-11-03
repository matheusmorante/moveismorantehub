import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

export interface AgentCredential {
  deviceId: string;
  token: string;
  apiBaseUrl: string;
}

interface StoredCredential {
  deviceId: string;
  encryptedToken: string;
  apiBaseUrl: string;
}

const CREDENTIAL_DIR = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'MoranteHub');
const CREDENTIAL_FILE = path.join(CREDENTIAL_DIR, 'print-agent-pairing.json');
let credentialCache: AgentCredential | null | undefined;

const runDpapi = (script: string, input: string): Promise<string> => new Promise((resolve, reject) => {
  if (process.platform !== 'win32') return reject(new Error('O pareamento seguro requer Windows.'));
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
  child.once('error', () => reject(new Error('Não foi possível proteger a chave da estação.')));
  child.once('close', (code) => {
    if (code !== 0) return reject(new Error(stderr.trim() || 'Não foi possível proteger a chave da estação.'));
    resolve(stdout.trim());
  });
  child.stdin.end(input, 'utf8');
});

const protectToken = (token: string) => runDpapi(
  "$plain = [Console]::In.ReadToEnd(); $secure = ConvertTo-SecureString -String $plain -AsPlainText -Force; $secure | ConvertFrom-SecureString",
  token
);

const unprotectToken = (encrypted: string) => runDpapi(
  "$encrypted = [Console]::In.ReadToEnd(); $secure = ConvertTo-SecureString -String $encrypted; $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }",
  encrypted
);

const isAllowedApiBase = (value: string): boolean => {
  try {
    const url = new URL(value);
    const allowedHost = url.hostname === 'morantehub.vercel.app' || url.hostname === 'morantehub.com' ||
      url.hostname.endsWith('.morantehub.com') ||
      (['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5173');
    return allowedHost && ['http:', 'https:'].includes(url.protocol) && url.pathname.replace(/\/$/, '') === '/api' &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
};

export const saveAgentCredential = async (credential: AgentCredential): Promise<void> => {
  if (!/^[0-9a-f-]{36}$/i.test(credential.deviceId) || !/^[0-9a-f]{64}$/i.test(credential.token) || !isAllowedApiBase(credential.apiBaseUrl)) {
    throw new Error('Dados de pareamento inválidos.');
  }
  const encryptedToken = await protectToken(credential.token);
  fs.mkdirSync(CREDENTIAL_DIR, { recursive: true });
  const stored: StoredCredential = {
    deviceId: credential.deviceId,
    encryptedToken,
    apiBaseUrl: credential.apiBaseUrl.replace(/\/$/, ''),
  };
  fs.writeFileSync(CREDENTIAL_FILE, JSON.stringify(stored), { encoding: 'utf8', mode: 0o600 });
  credentialCache = { ...credential };
};

export const loadAgentCredential = async (): Promise<AgentCredential | null> => {
  if (credentialCache !== undefined) return credentialCache ? { ...credentialCache } : null;
  try {
    if (!fs.existsSync(CREDENTIAL_FILE)) {
      credentialCache = null;
      return null;
    }
    const stored = JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf8')) as StoredCredential;
    if (!stored.deviceId || !stored.encryptedToken || !isAllowedApiBase(stored.apiBaseUrl)) {
      credentialCache = null;
      return null;
    }
    const token = await unprotectToken(stored.encryptedToken);
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      credentialCache = null;
      return null;
    }
    credentialCache = { deviceId: stored.deviceId, apiBaseUrl: stored.apiBaseUrl, token };
    return { ...credentialCache };
  } catch {
    credentialCache = null;
    return null;
  }
};

export const clearAgentCredential = (): void => {
  credentialCache = null;
  try { if (fs.existsSync(CREDENTIAL_FILE)) fs.unlinkSync(CREDENTIAL_FILE); } catch { /* Próxima inicialização pode tentar novamente. */ }
};
