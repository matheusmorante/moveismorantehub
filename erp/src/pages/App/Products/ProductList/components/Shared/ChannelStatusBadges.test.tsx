// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChannelStatusBadges } from './ChannelStatusBadges';
import { validateErpActivationRequirements } from '../../hooks/activation/useProductsActivationValidation';
import type Product from '@/pages/types/product.type';

afterEach(cleanup);

describe('ChannelStatusBadges - Regra de Origem de Estoque Salvados', () => {
  describe('Produto Pai com Origem Salvados', () => {
    it('renderiza o produto pai salvado como desativado no ERP com estilo acinzentado e sem botão interativo', () => {
      const handleToggleActive = vi.fn();

      const { container } = render(
        <ChannelStatusBadges
          active={false}
          isParent={true}
          isNonConventional={true}
          onToggleActive={handleToggleActive}
        />
      );

      // Deve mostrar o texto Desativado
      expect(screen.getByText('Desativado')).toBeDefined();

      // No pai, não deve existir botão para o ERP (é uma tag de visualização estática)
      const erpButtons = screen.queryAllByRole('button', { name: /status erp/i });
      expect(erpButtons.length).toBe(0);

      // O container do badge deve ter as classes de desativado (opacidade baixa e acinzentado)
      const badgeDiv = container.querySelector('.opacity-50');
      expect(badgeDiv).not.toBeNull();
      expect(badgeDiv?.className).toContain('grayscale');

      // O atributo title ou aria-label deve conter a explicação exigida
      const labelElement = container.querySelector('[title*="apenas no catálogo digital"]');
      expect(labelElement).not.toBeNull();
      expect(labelElement?.getAttribute('title')).toContain(
        'Produtos de origem de estoque diferente de Convencional não podem ser ativados no ERP, apenas no catálogo digital.'
      );
    });
  });

  describe('Variação com Origem Salvados', () => {
    it('renderiza botão ERP desabilitado, impede clique e mantém Catálogo Digital ativo e clicável', () => {
      const handleToggleActive = vi.fn();
      const handleToggleCatalog = vi.fn();

      render(
        <ChannelStatusBadges
          active={false}
          catalogStatus="published"
          isParent={false}
          isNonConventional={true}
          onToggleActive={handleToggleActive}
          onToggleCatalog={handleToggleCatalog}
        />
      );

      // 1. Botão ERP deve estar desabilitado
      const erpButton = screen.getByRole('button', {
        name: /Status ERP: Desativado/i,
      }) as HTMLButtonElement;

      expect(erpButton).toBeDefined();
      expect(erpButton.disabled).toBe(true);
      expect(erpButton.className).toContain('opacity-50');
      expect(erpButton.className).toContain('cursor-not-allowed');
      expect(erpButton.className).toContain('grayscale');
      expect(erpButton.getAttribute('title')).toContain(
        'Produtos de origem de estoque diferente de Convencional não podem ser ativados no ERP, apenas no catálogo digital.'
      );

      // 2. Clique no botão ERP não deve disparar o callback
      fireEvent.click(erpButton);
      expect(handleToggleActive).not.toHaveBeenCalled();

      // 3. Botão do Catálogo Digital deve continuar ativo e clicável normalmente
      const catalogButton = screen.getByRole('button', {
        name: /Status Catálogo: Publicado/i,
      }) as HTMLButtonElement;

      expect(catalogButton).toBeDefined();
      expect(catalogButton.disabled).toBe(false);

      // 4. Clique no botão do Catálogo dispara o callback com sucesso
      fireEvent.click(catalogButton);
      expect(handleToggleCatalog).toHaveBeenCalledTimes(1);
    });
  });

  describe('Produto Convencional (Origem Diferente de Salvados)', () => {
    it('permite alternar ativação do ERP e do Catálogo normalmente', () => {
      const handleToggleActive = vi.fn();
      const handleToggleCatalog = vi.fn();

      render(
        <ChannelStatusBadges
          active={false}
          catalogStatus="hidden"
          isParent={false}
          isNonConventional={false}
          onToggleActive={handleToggleActive}
          onToggleCatalog={handleToggleCatalog}
        />
      );

      const erpButton = screen.getByRole('button', {
        name: /Status ERP: Desativado/i,
      }) as HTMLButtonElement;

      expect(erpButton.disabled).toBe(false);
      fireEvent.click(erpButton);
      expect(handleToggleActive).toHaveBeenCalledTimes(1);

      const catalogButton = screen.getByRole('button', {
        name: /Status Catálogo: Oculto/i,
      }) as HTMLButtonElement;

      expect(catalogButton.disabled).toBe(false);
      fireEvent.click(catalogButton);
      expect(handleToggleCatalog).toHaveBeenCalledTimes(1);
    });
  });

  describe('Defesa em Profundidade: Tentativa direta de chamar ativação/hook', () => {
    it('bloqueia ativação de produto salvado mesmo sem passar pelo botão da interface', () => {
      const salvadoProduct: Product = {
        id: 'prod-salvado-1',
        name: 'Mesa Salvados',
        description: '',
        categoryIds: ['cat-1'],
        unitPrice: 150,
        unit: 'UN',
        active: false,
        isDraft: false,
        productKind: 'salvado',
      };

      const result = validateErpActivationRequirements(
        salvadoProduct.id!,
        [salvadoProduct],
        [salvadoProduct]
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(
        'Produtos de origem de estoque Salvados não podem ser ativados no ERP, apenas no catálogo digital.'
      );
    });

    it('bloqueia ativação de variação filha cujo produto pai é Salvados', () => {
      const salvadoParent: Product = {
        id: 'parent-salvado-1',
        name: 'Guarda-Roupa Salvados',
        description: '',
        categoryIds: ['cat-1'],
        unitPrice: 500,
        unit: 'UN',
        active: false,
        isDraft: false,
        productKind: 'salvado',
        variations: [
          {
            id: 'var-1',
            sku: 'VAR-01',
            name: 'Variação Branca',
            stock: 2,
            unitPrice: 500,
            active: false,
            attributes: [],
          },
        ],
      };

      const result = validateErpActivationRequirements('var-1', [salvadoParent], [salvadoParent]);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(
        'Produtos de origem de estoque Salvados não podem ser ativados no ERP, apenas no catálogo digital.'
      );
    });
  });
});
