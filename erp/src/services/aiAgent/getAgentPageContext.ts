import type { AgentPageContext } from './geminiAgentTypes';

export function getAgentPageContext(path: string): AgentPageContext & { currentPath: string } {
  let currentModule = 'Geral';
  if (path.startsWith('/finance')) currentModule = 'Financeiro';
  else if (path.startsWith('/estoque') || path.startsWith('/inventory'))
    currentModule = 'Estoque';
  else if (path.startsWith('/orders') || path.startsWith('/pedidos'))
    currentModule = 'Vendas & Pedidos';
  else if (path.startsWith('/purchases') || path.startsWith('/compras'))
    currentModule = 'Compras';
  else if (path.startsWith('/customers') || path.startsWith('/clientes'))
    currentModule = 'Clientes';
  else if (path.startsWith('/deliveries') || path.startsWith('/logistica'))
    currentModule = 'Logística & Entregas';
  else if (path.startsWith('/catalog')) currentModule = 'Catálogo Digital';
  else if (path === '/' || path === '/dashboard') currentModule = 'Dashboard';

  const segments = path.split('/').filter(Boolean);
  const pageName = segments.length > 1 ? segments.slice(1).join('/') : segments[0] || 'Início';

  return {
    currentModule,
    currentPage: pageName,
    currentPath: path,
  };
}
