// @vitest-environment happy-dom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { StockOriginBadge, resolveStockOrigin } from './StockOriginBadge';
import type Product from '@/pages/types/product.type';

afterEach(cleanup);

describe('StockOriginBadge - Rótulo de Origem do Estoque', () => {
  describe('Função resolveStockOrigin', () => {
    it('retorna Convencional como padrão quando não há productKind ou quando é normal', () => {
      expect(resolveStockOrigin()).toBe('Convencional');
      expect(resolveStockOrigin({} as Product)).toBe('Convencional');
      expect(resolveStockOrigin({ productKind: 'normal' } as Product)).toBe('Convencional');
    });

    it('retorna Salvados quando productKind é salvado, is_salvado é true ou oportunidade contém salvado', () => {
      expect(resolveStockOrigin({ productKind: 'salvado' } as Product)).toBe('Salvados');
      expect(resolveStockOrigin({ is_salvado: true } as any)).toBe('Salvados');
      expect(resolveStockOrigin({ product_kind: 'salvados' } as any)).toBe('Salvados');
      expect(resolveStockOrigin({ stock_origin: 'salvados' } as any)).toBe('Salvados');
      expect(resolveStockOrigin({ opportunityName: 'Queima dos Salvados' } as Product)).toBe(
        'Salvados'
      );
      expect(resolveStockOrigin(null, null, 'Oportunidade Salvados')).toBe('Salvados');
    });

    it('retorna Usados quando productKind é usado ou oportunidade contém usado', () => {
      expect(resolveStockOrigin({ productKind: 'usado' } as Product)).toBe('Usados');
      expect(resolveStockOrigin({ stock_origin: 'usados' } as any)).toBe('Usados');
      expect(resolveStockOrigin({ opportunityName: 'Móveis Usados Selecionados' } as Product)).toBe(
        'Usados'
      );
    });

    it('prioriza singleVariation se fornecida', () => {
      expect(
        resolveStockOrigin({ productKind: 'normal' } as Product, { productKind: 'salvado' })
      ).toBe('Salvados');
    });
  });

  describe('Renderização do Componente', () => {
    it('renderiza Convencional em azul sem nenhum ícone', () => {
      const { container } = render(
        <StockOriginBadge product={{ productKind: 'normal' } as Product} />
      );

      const badge = screen.getByTestId('stock-origin-badge');
      expect(badge.textContent).toBe('Convencional');
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.className).toContain('text-blue-900');
      expect(badge.className).toContain('border-blue-200');

      // Verifica estritamente que NÃO possui nenhum elemento de ícone (i ou svg)
      expect(container.querySelector('i')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('renderiza Salvados em vermelho quente sem nenhum ícone', () => {
      const { container } = render(
        <StockOriginBadge product={{ productKind: 'salvado' } as Product} />
      );

      const badge = screen.getByTestId('stock-origin-badge');
      expect(badge.textContent).toBe('Salvados');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-900');
      expect(badge.className).toContain('border-red-200');

      expect(container.querySelector('i')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('renderiza Usados em âmbar sem nenhum ícone', () => {
      const { container } = render(
        <StockOriginBadge product={{ productKind: 'usado' } as Product} />
      );

      const badge = screen.getByTestId('stock-origin-badge');
      expect(badge.textContent).toBe('Usados');
      expect(badge.className).toContain('bg-amber-100');
      expect(badge.className).toContain('text-amber-900');
      expect(badge.className).toContain('border-amber-200');

      expect(container.querySelector('i')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('suporta variante de tamanho xs com rounded-full para cabeçalho de cards', () => {
      render(
        <StockOriginBadge product={{ productKind: 'salvado' } as Product} size="xs" />
      );

      const badge = screen.getByTestId('stock-origin-badge');
      expect(badge.className).toContain('rounded-full');
      expect(badge.className).toContain('text-[8px]');
    });
  });
});
