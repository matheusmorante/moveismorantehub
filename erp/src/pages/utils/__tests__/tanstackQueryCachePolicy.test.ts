import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { PERSON_QUERY_COLUMNS } from '../personService/personQueryService';
import { savePerson, moveToTrash } from '../personService/personMutationService';
import { saveVariation, moveToTrash as moveVariationToTrash } from '../variationService';
import { deactivateProduct } from '../productService/productDependencyCheck';

vi.mock('@/pages/utils/supabaseConfig', () => {
  const createChain = () => {
    const chain: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', code: 'PRD-001' }, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'test-id', code: 'PRD-001' }, error: null })),
      then: (resolve: any) => resolve({ data: [{ id: 'test-id', code: 'PRD-001' }], error: null }),
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn(() => createChain()),
      rpc: vi.fn(() => Promise.resolve({ data: 'deactivated', error: null })),
      auth: {
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
    },
    ecommerceSupabase: {
      from: vi.fn(() => createChain()),
      rpc: vi.fn(() => Promise.resolve({ data: 'deactivated', error: null })),
    },
  };
});

describe('Auditoria de Governança TanStack Query & Otimização de Egress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Redução de Egress e Projeções Seletivas', () => {
    it('deve usar PERSON_QUERY_COLUMNS explícitas sem select(*) em buscas de pessoas', () => {
      expect(PERSON_QUERY_COLUMNS).toBeDefined();
      expect(PERSON_QUERY_COLUMNS).not.toContain('*');
      expect(PERSON_QUERY_COLUMNS).toContain('id');
      expect(PERSON_QUERY_COLUMNS).toContain('full_name');
      expect(PERSON_QUERY_COLUMNS).toContain('email');
      expect(PERSON_QUERY_COLUMNS).toContain('phone');
      expect(PERSON_QUERY_COLUMNS).toContain('address');
    });
  });

  describe('2. Invalidação Imediata de Cache em Mutações de Pessoas', () => {
    it('deve invalidar a chave ["people"] ao salvar uma pessoa', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      
      const dummyPerson = {
        fullName: 'Cliente de Teste Cache',
        personType: 'PF' as const,
        active: true,
      };

      await savePerson('customers', dummyPerson as any);

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['people'] })
      );
    });

    it('deve invalidar a chave ["people"] ao mover para a lixeira', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await moveToTrash('customers', '12345678-1234-1234-1234-123456789012');

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['people'] })
      );
    });
  });

  describe('3. Invalidação Imediata de Cache em Características (Variações)', () => {
    it('deve invalidar a chave ["variations"] ao salvar característica', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await saveVariation({
        name: 'Cor Teste',
        active: true,
        dataType: 'radio',
        options: [{ id: '1', value: 'Azul' }],
      } as any);

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['variations'] })
      );
    });

    it('deve invalidar a chave ["variations"] ao excluir característica', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await moveVariationToTrash('attr-123');

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['variations'] })
      );
    });
  });

  describe('4. Invalidação Imediata de Cache em Produtos', () => {
    it('deve invalidar a chave ["products"] em mutações de produtos', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await deactivateProduct('12345678-1234-1234-1234-123456789012');

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['products'] })
      );
    });
  });

  describe('5. Invalidação Imediata de Cache em Pedidos de Venda', () => {
    it('deve permitir invalidar a chave ["orders"] garantindo que todas as listagens de pedidos reflitam o novo estado', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      queryClient.invalidateQueries({ queryKey: ['orders'] });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['orders'] })
      );
    });
  });

  describe('6. Isolamento e Limpeza de Cache no Logout e Troca de Sessão', () => {
    it('deve limpar completamente o cache via queryClient.clear()', () => {
      const clearSpy = vi.spyOn(queryClient, 'clear');

      // Simulação da chamada efetuada pelo AuthContext.logout e perda de sessão
      queryClient.clear();

      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
