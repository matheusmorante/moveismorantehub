// O projeto Vercel do ERP usa `erp/` como diretório raiz. O pacote local
// `morante-hub-root` mantém a implementação única do endpoint e suas
// dependências disponíveis durante o empacotamento serverless.
export { default } from 'morante-hub-root/api/mcp.js';
