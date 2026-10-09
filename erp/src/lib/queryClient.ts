import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto de dados frescos em memória
      gcTime: 5 * 60 * 1000, // 5 minutos mantidos no cache após ficarem inativos
      refetchOnWindowFocus: false, // Não refazer requisições ao focar na janela/aba (economiza Egress)
      retry: 1, // Limita novas tentativas em caso de erro
    },
  },
});
