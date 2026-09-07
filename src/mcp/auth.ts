import { McpClientAuth, McpClientId } from './types/mcp.js';

export class McpAuthError extends Error {
  public readonly statusCode: number;
  public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN';

  constructor(message: string, code: 'UNAUTHORIZED' | 'FORBIDDEN' = 'UNAUTHORIZED') {
    super(message);
    this.name = 'McpAuthError';
    this.code = code;
    this.statusCode = code === 'UNAUTHORIZED' ? 401 : 403;
  }
}

/**
 * Obtém os tokens configurados no ambiente.
 * Nenhum token pode ser vazio ou conter credenciais de banco/usuário comum.
 */
export function getRegisteredTokens(): Map<string, { clientId: McpClientId; clientName: string }> {
  const tokenMap = new Map<string, { clientId: McpClientId; clientName: string }>();

  const masterToken = process.env.MORANTEHUB_MCP_ACCESS_TOKEN?.trim();
  const chatgptToken = process.env.MCP_CHATGPT_TOKEN?.trim();
  const antigravityToken = process.env.MCP_ANTIGRAVITY_TOKEN?.trim();

  if (masterToken && masterToken.length >= 16) {
    tokenMap.set(masterToken, { clientId: 'internal', clientName: 'MoranteHub Master Admin' });
  }

  if (chatgptToken && chatgptToken.length >= 16) {
    tokenMap.set(chatgptToken, { clientId: 'chatgpt', clientName: 'OpenAI ChatGPT' });
  }

  if (antigravityToken && antigravityToken.length >= 16) {
    tokenMap.set(antigravityToken, { clientId: 'antigravity', clientName: 'Google Antigravity IDE' });
  }

  return tokenMap;
}

export function getAllowedClients(): Set<string> {
  const customAllowed = process.env.MCP_ALLOWED_CLIENTS?.trim();
  if (customAllowed) {
    return new Set(customAllowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  }
  return new Set(['chatgpt', 'antigravity', 'internal']);
}

/**
 * Valida a autenticação do cliente MCP.
 * Aceita Bearer token no cabeçalho Authorization ou query/raw token.
 */
export function validateMcpAuth(rawHeaderOrToken?: string, requestedClientId?: string): McpClientAuth {
  if (!rawHeaderOrToken || typeof rawHeaderOrToken !== 'string') {
    throw new McpAuthError('Acesso não autorizado: Token de autenticação Bearer ausente.', 'UNAUTHORIZED');
  }

  let token = rawHeaderOrToken.trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token) {
    throw new McpAuthError('Acesso não autorizado: Token Bearer vazio.', 'UNAUTHORIZED');
  }

  const registeredTokens = getRegisteredTokens();

  // Se nenhum token foi configurado no ambiente, emite erro seguro
  if (registeredTokens.size === 0) {
    throw new McpAuthError('Servidor MCP não configurado com credenciais de acesso válidas.', 'UNAUTHORIZED');
  }

  const clientInfo = registeredTokens.get(token);
  if (!clientInfo) {
    throw new McpAuthError('Acesso não autorizado: Credencial de acesso MCP inválida ou revogada.', 'UNAUTHORIZED');
  }

  const allowedClients = getAllowedClients();
  if (!allowedClients.has(clientInfo.clientId.toLowerCase())) {
    throw new McpAuthError(`Acesso proibido: O cliente "${clientInfo.clientId}" está desabilitado na allowlist.`, 'FORBIDDEN');
  }

  return {
    clientId: clientInfo.clientId,
    clientName: clientInfo.clientName,
    authenticated: true,
    tokenType: 'bearer',
  };
}
