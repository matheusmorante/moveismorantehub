// Regex cobrindo formato canônico padrão de 36 caracteres hexadecimais com hífens (v1 a v7)
const GENERIC_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verifica se um valor é um UUID canônico válido de 36 caracteres com hífens.
 * Evita passar strings compostas (como `produtoId_sku` ou `inbound_chave`)
 * para colunas ou parâmetros Postgres do tipo UUID.
 */
export const isValidUuid = (value?: string | null): value is string => {
    if (!value || typeof value !== 'string') return false;
    return GENERIC_UUID_REGEX.test(value);
};
