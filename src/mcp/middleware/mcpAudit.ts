import { McpAuditLog, McpClientId } from '../types/mcp.js';

const auditHistory: McpAuditLog[] = [];
const MAX_AUDIT_LOGS = 1000;

export function recordAuditLog(log: Omit<McpAuditLog, 'id' | 'timestamp'>): McpAuditLog {
  const fullLog: McpAuditLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...log,
  };

  auditHistory.unshift(fullLog);
  if (auditHistory.length > MAX_AUDIT_LOGS) {
    auditHistory.pop();
  }

  // Sanitização estrita: Garante que nenhum segredo seja impresso
  const safeLog = {
    time: fullLog.timestamp,
    client: fullLog.clientId,
    tool: fullLog.tool,
    status: fullLog.status,
    duration: `${fullLog.durationMs}ms`,
    product: fullLog.productId || undefined,
    campaign: fullLog.campaign || undefined,
    error: fullLog.errorMessage || undefined,
  };

  if (process.env.NODE_ENV !== 'test') {
    if (fullLog.status === 'SUCCESS') {
      console.log(`[MCP AUDIT]`, JSON.stringify(safeLog));
    } else {
      console.warn(`[MCP AUDIT WARNING]`, JSON.stringify(safeLog));
    }
  }

  return fullLog;
}

export function getAuditLogs(limit = 50, clientId?: McpClientId): McpAuditLog[] {
  let filtered = auditHistory;
  if (clientId) {
    filtered = filtered.filter(item => item.clientId === clientId);
  }
  return filtered.slice(0, Math.min(limit, 100));
}

export function clearAuditHistory(): void {
  auditHistory.length = 0;
}
