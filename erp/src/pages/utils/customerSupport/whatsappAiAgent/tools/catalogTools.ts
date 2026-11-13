/**
 * Ferramentas de Catálogo do Atendimento Comercial no WhatsApp.
 * Fachada consolidada que expõe os módulos especializados:
 * - Busca de produtos e cartões nativos do WhatsApp (productSearchTool.ts)
 * - Ficha técnica e detalhes de variações (productDetailsTool.ts)
 * - Listagem de categorias e ambientes (categoryListTool.ts)
 */

export { handleBuscarProdutos } from './productSearchTool.js';
export { handleObterDetalhesProduto } from './productDetailsTool.js';
export { handleListarCategoriasECaracteristicasProduto } from './categoryListTool.js';
