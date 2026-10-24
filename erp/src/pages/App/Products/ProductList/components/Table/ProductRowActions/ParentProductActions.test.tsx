// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { ParentProductActions } from './ParentProductActions';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'manager' } }),
}));

vi.mock('@/pages/utils/accessRoles', () => ({
  canPrintProductIdentificationLabels: () => false,
  getProductIdentificationLabelActionAvailability: ({
    canPrint,
    hasSingleVariation,
    isDraft,
    isMerged,
  }: {
    canPrint: boolean;
    hasSingleVariation: boolean;
    isDraft: boolean;
    isMerged: boolean;
  }) => {
    const canOpenMenu = canPrint && hasSingleVariation && !isDraft;
    return { canOpenMenu, canPrintLabel: canOpenMenu && !isMerged };
  },
  isProductIdentificationLabelOnlyProfile: () => false,
}));

vi.mock('@/components/shared/DropdownPortal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="dropdown-portal">{children}</div> : null,
  DropdownPortal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="dropdown-portal">{children}</div> : null,
}));

afterEach(cleanup);

const baseProduct: Product = {
  id: 'prod-uuid-1',
  code: 'PRD-001',
  name: 'Mesa de Jantar Madeira',
  unitPrice: 1500,
  unit: 'UN',
  categoryIds: ['cat-1'],
  description: 'Mesa 6 lugares',
  active: true,
  itemType: 'product',
  isDraft: false,
  isParent: true,
};

describe('ParentProductActions - Lixeira vs Descarte de Rascunho', () => {
  it('preserva mover e mesclar quando o perfil pode editar, mas não imprimir etiqueta de identificação', () => {
    const singleVariation = {
      ...baseProduct,
      id: 'variation-uuid-1',
      supplierId: 'supplier-1',
      attributes: [{ name: 'Cor', value: 'Natural' }],
    };

    render(
      <ParentProductActions
        product={baseProduct}
        singleVariation={singleVariation}
        isDraft={false}
        canDeleteProducts={false}
        onEdit={vi.fn()}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
        onOpenSalesModal={vi.fn()}
        onOpenLabelModal={vi.fn()}
        onMoveToAnotherFamily={vi.fn()}
        onMergeWithAnotherVariation={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));

    expect(
      screen.queryByRole('menuitem', { name: /Imprimir Etiqueta de Identificação/i })
    ).toBeNull();
    expect(
      screen.getByRole('menuitem', { name: /Mover para outro produto pai/i })
    ).toBeDefined();
    expect(
      screen.getByRole('menuitem', { name: /Mesclar com outra variação/i })
    ).toBeDefined();
  });

  it('para rascunhos (isDraft=true), exibe "Descartar Rascunho" e NÃO exibe "Mover para lixeira"', () => {
    const draftProduct: Product = {
      ...baseProduct,
      isDraft: true,
    };
    const onDelete = vi.fn();
    const onMoveToTrash = vi.fn();

    render(
      <ParentProductActions
        product={draftProduct}
        isDraft={true}
        canDeleteProducts={true}
        onEdit={vi.fn()}
        onRestore={vi.fn()}
        onDelete={onDelete}
        onMoveToTrash={onMoveToTrash}
        onOpenSalesModal={vi.fn()}
        onOpenLabelModal={vi.fn()}
      />
    );

    // Abre o menu de 3 pontinhos
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));

    // Deve exibir Descartar Rascunho
    const discardBtn = screen.getByRole('menuitem', { name: /Descartar Rascunho/i });
    expect(discardBtn).toBeDefined();

    // NÃO deve exibir Mover para lixeira
    expect(screen.queryByRole('menuitem', { name: /Mover para lixeira/i })).toBeNull();

    // Clica em descartar
    fireEvent.click(discardBtn);
    expect(onDelete).toHaveBeenCalledWith('prod-uuid-1');
    expect(onMoveToTrash).not.toHaveBeenCalled();
  });

  it('para produto cadastrado (!isDraft) elegível (can_trash=true), exibe "Mover para lixeira" habilitado e chama onMoveToTrash', () => {
    const eligibleProduct: Product = {
      ...baseProduct,
      isDraft: false,
      can_trash: true,
    };
    const onMoveToTrash = vi.fn();
    const onDelete = vi.fn();

    render(
      <ParentProductActions
        product={eligibleProduct}
        isDraft={false}
        canDeleteProducts={true}
        onEdit={vi.fn()}
        onRestore={vi.fn()}
        onDelete={onDelete}
        onMoveToTrash={onMoveToTrash}
        onOpenSalesModal={vi.fn()}
        onOpenLabelModal={vi.fn()}
      />
    );

    // Abre o menu de 3 pontinhos
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));

    // Não deve exibir Descartar Rascunho
    expect(screen.queryByRole('menuitem', { name: /Descartar Rascunho/i })).toBeNull();

    // Deve exibir Mover para lixeira habilitado
    const trashBtn = screen.getByRole('menuitem', {
      name: /Mover para lixeira/i,
    }) as HTMLButtonElement;
    expect(trashBtn).toBeDefined();
    expect(trashBtn.disabled).toBe(false);
    expect(trashBtn.getAttribute('aria-disabled')).toBe('false');
    expect(trashBtn.getAttribute('title')).toBe('Mover produto e variações para a lixeira');

    // Clica em mover para lixeira
    fireEvent.click(trashBtn);
    expect(onMoveToTrash).toHaveBeenCalledWith(eligibleProduct);
  });

  it('para produto cadastrado com impedimento (can_trash=false), exibe botão desabilitado com o motivo no title/aria-label e impede clique', () => {
    const blockedProduct: Product = {
      ...baseProduct,
      isDraft: false,
      can_trash: false,
      trash_block_reason: 'Produto possui variações vinculadas a vendas',
    };
    const onMoveToTrash = vi.fn();

    render(
      <ParentProductActions
        product={blockedProduct}
        isDraft={false}
        canDeleteProducts={true}
        onEdit={vi.fn()}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
        onMoveToTrash={onMoveToTrash}
        onOpenSalesModal={vi.fn()}
        onOpenLabelModal={vi.fn()}
      />
    );

    // Abre o menu de 3 pontinhos
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));

    const trashBtn = screen.getByRole('menuitem', {
      name: /Mover para lixeira/i,
    }) as HTMLButtonElement;
    expect(trashBtn).toBeDefined();
    expect(trashBtn.disabled).toBe(true);
    expect(trashBtn.getAttribute('aria-disabled')).toBe('true');
    expect(trashBtn.getAttribute('title')).toBe('Produto possui variações vinculadas a vendas');
    expect(trashBtn.getAttribute('aria-label')).toBe(
      'Mover para lixeira: Produto possui variações vinculadas a vendas'
    );

    // Clique não deve disparar callback
    fireEvent.click(trashBtn);
    expect(onMoveToTrash).not.toHaveBeenCalled();
  });

  it('mantém o botão desabilitado quando a elegibilidade ainda não foi avaliada (can_trash=undefined)', () => {
    const pendingProduct: Product = {
      ...baseProduct,
      isDraft: false,
      can_trash: undefined,
    };
    const onMoveToTrash = vi.fn();

    render(
      <ParentProductActions
        product={pendingProduct}
        isDraft={false}
        canDeleteProducts={true}
        onEdit={vi.fn()}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
        onMoveToTrash={onMoveToTrash}
        onOpenSalesModal={vi.fn()}
        onOpenLabelModal={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));

    const trashBtn = screen.getByRole('menuitem', {
      name: /Mover para lixeira/i,
    }) as HTMLButtonElement;
    expect(trashBtn.disabled).toBe(true);
    expect(trashBtn.getAttribute('title')).toContain('Verificando elegibilidade');

    fireEvent.click(trashBtn);
    expect(onMoveToTrash).not.toHaveBeenCalled();
  });

  it('no modo lixeira (showTrash=true), renderiza botão de restauração e dispara onRestore', () => {
    const onRestore = vi.fn();

    render(
      <ParentProductActions
        product={baseProduct}
        showTrash={true}
        isDraft={false}
        canDeleteProducts={true}
        onEdit={vi.fn()}
        onRestore={onRestore}
        onDelete={vi.fn()}
        onOpenSalesModal={vi.fn()}
        onOpenLabelModal={vi.fn()}
      />
    );

    const restoreBtn = screen.getByRole('button', { name: 'Restaurar produto' });
    expect(restoreBtn).toBeDefined();

    fireEvent.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledWith('prod-uuid-1');
  });
});
