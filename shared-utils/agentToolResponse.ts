export interface AgentToolResult {
  success?: boolean;
  code?: string;
  error?: string;
  erro?: string;
  message?: string;
  [key: string]: unknown;
}

const SAFE_TO_PRESERVE_CODES = new Set([
  'PERMISSION_DENIED',
  'PRODUCT_NOT_FOUND',
  'OPERATION_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'CUSTOMER_NOT_FOUND',
  'AMBIGUOUS_IDENTIFIER',
  'INVALID_IDENTIFIER',
  'INVALID_ARGUMENT',
  'INVALID_OPERATION_ID',
  'INVALID_ORDER_ID',
  'INVALID_PRODUCT_ID',
  'INVALID_AMOUNT',
  'INVALID_DESCRIPTION',
  'INVALID_DUE_DATE',
  'INVALID_DATE_RANGE',
  'SEARCH_TOO_BROAD',
]);

/** Removes database/provider details before a tool result is sent back to an LLM. */
export const sanitizeAgentToolResponseForModel = <
  T extends {
    success?: boolean;
    code?: string;
    error?: string;
    erro?: string;
    message?: string;
  },
>(
  result: T
): AgentToolResult => {
  if (result.success !== false) return result;

  const code = String(result.code || '');
  if (
    SAFE_TO_PRESERVE_CODES.has(code) ||
    /^(?:INVALID_|MISSING_|NO_CHANGES$|[A-Z_]+_REQUIRED$)/.test(code)
  ) {
    if (code === 'PERMISSION_DENIED') {
      return {
        success: false,
        code,
        message: 'Não tenho autorização para consultar esses dados.',
      };
    }
    return result;
  }

  const looksTechnical =
    /(?:DATABASE|EXECUTION|FETCH|QUERY|TOOL_CALL|TEMPORARY|SUMMARY|SEARCH|DETAILS|CATEGORIES|TRANSACTIONS|PAYABLES|RECEIVABLES|UPDATE|DELETE|CREATE|UPSERT|ERROR|FAILED)/i.test(code) ||
    Boolean(result.error || result.erro);
  if (!looksTechnical) return result;

  return {
    success: false,
    code: 'TEMPORARY_FAILURE',
    message: 'Não consegui consultar essas informações agora. Tente novamente mais tarde ou peça ajuda à equipe.',
  };
};
