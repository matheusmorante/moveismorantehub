import { describe, it, expect, beforeEach } from 'vitest';
import { validateMcpAuth, McpAuthError, getRegisteredTokens } from '../auth.js';

describe('MCP Authentication & Privacy Rules', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MORANTEHUB_MCP_ACCESS_TOKEN: 'morante_master_token_test_12345678',
      MCP_CHATGPT_TOKEN: 'chatgpt_token_test_12345678',
      MCP_ANTIGRAVITY_TOKEN: 'antigravity_token_test_12345678',
      MCP_ALLOWED_CLIENTS: 'chatgpt,antigravity,internal',
    };
  });

  it('1. Rejeita requisições sem token com 401 Unauthorized', () => {
    expect(() => validateMcpAuth(undefined)).toThrowError(McpAuthError);
    try {
      validateMcpAuth(undefined);
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    }
  });

  it('2. Rejeita tokens vazios ou com formato inválido com 401', () => {
    expect(() => validateMcpAuth('Bearer ')).toThrowError(McpAuthError);
    expect(() => validateMcpAuth('')).toThrowError(McpAuthError);
    expect(() => validateMcpAuth('token_invalido_aleatorio')).toThrowError(McpAuthError);
  });

  it('3. Autentica corretamente com token mestre', () => {
    const auth = validateMcpAuth('Bearer morante_master_token_test_12345678');
    expect(auth.authenticated).toBe(true);
    expect(auth.clientId).toBe('internal');
  });

  it('4. Autentica token do ChatGPT e identifica clientId chatgpt', () => {
    const auth = validateMcpAuth('chatgpt_token_test_12345678');
    expect(auth.authenticated).toBe(true);
    expect(auth.clientId).toBe('chatgpt');
    expect(auth.clientName).toContain('ChatGPT');
  });

  it('5. Autentica token do Antigravity e identifica clientId antigravity', () => {
    const auth = validateMcpAuth('Bearer antigravity_token_test_12345678');
    expect(auth.authenticated).toBe(true);
    expect(auth.clientId).toBe('antigravity');
    expect(auth.clientName).toContain('Antigravity');
  });

  it('6. Rejeita clientes desabilitados na allowlist com 403 Forbidden', () => {
    process.env.MCP_ALLOWED_CLIENTS = 'antigravity,internal'; // Desabilita ChatGPT
    expect(() => validateMcpAuth('chatgpt_token_test_12345678')).toThrowError(McpAuthError);
    try {
      validateMcpAuth('chatgpt_token_test_12345678');
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('7. Revogação granular de token: remover do ambiente invalida imediatamente', () => {
    delete process.env.MCP_CHATGPT_TOKEN;
    expect(() => validateMcpAuth('chatgpt_token_test_12345678')).toThrowError(McpAuthError);
  });
});
