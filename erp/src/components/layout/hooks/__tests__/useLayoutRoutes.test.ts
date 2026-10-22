// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useLayoutRoutes } from '../useLayoutRoutes';

describe('useLayoutRoutes Hook', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as any).ReactNativeWebView;
  });

  afterEach(() => {
    delete (window as any).ReactNativeWebView;
  });

  it('deve identificar rota de Central de Atendimento (/atendimento) com layout full-bleed p-0', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ['/atendimento'] }, children);

    const { result } = renderHook(() => useLayoutRoutes(), { wrapper });

    expect(result.current.isCustomerSupport).toBe(true);
    expect(result.current.isTemplateEditor).toBe(false);
    expect(result.current.isProductsPage).toBe(false);
    expect(result.current.mainContentClassName).toBe('p-0 overflow-hidden flex flex-col');
  });

  it('deve identificar subrota de Central de Atendimento (/atendimento/chat-123)', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ['/atendimento/chat-123'] }, children);

    const { result } = renderHook(() => useLayoutRoutes(), { wrapper });

    expect(result.current.isCustomerSupport).toBe(true);
    expect(result.current.mainContentClassName).toBe('p-0 overflow-hidden flex flex-col');
  });

  it('deve identificar editor de templates (/templates/price-label)', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ['/templates/price-label'] }, children);

    const { result } = renderHook(() => useLayoutRoutes(), { wrapper });

    expect(result.current.isTemplateEditor).toBe(true);
    expect(result.current.isCustomerSupport).toBe(false);
    expect(result.current.mainContentClassName).toBe('p-0 overflow-hidden flex flex-col');
  });

  it('deve identificar páginas de produtos com padding específico', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ['/products'] }, children);

    const { result } = renderHook(() => useLayoutRoutes(), { wrapper });

    expect(result.current.isProductsPage).toBe(true);
    expect(result.current.mainContentClassName).toBe(
      'px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 pt-0 pb-6 xl:pb-8'
    );
  });

  it('deve identificar módulo de assistência com pt-0 para equilibrar espaçamentos do cabeçalho', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ['/assistance-orders'] }, children);

    const { result } = renderHook(() => useLayoutRoutes(), { wrapper });

    expect(result.current.isAssistancePage).toBe(true);
    expect(result.current.mainContentClassName).toBe(
      'px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 pt-0 pb-6 xl:pb-8'
    );
  });

  it('deve retornar padding padrão para rotas comuns do sistema', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] }, children);

    const { result } = renderHook(() => useLayoutRoutes(), { wrapper });

    expect(result.current.isCustomerSupport).toBe(false);
    expect(result.current.isTemplateEditor).toBe(false);
    expect(result.current.isProductsPage).toBe(false);
    expect(result.current.mainContentClassName).toBe('p-3 sm:p-4 md:p-6 lg:p-6 xl:p-8');
  });

  it('deve detectar visualização de App Mobile através do bridge ReactNativeWebView', () => {
    (window as any).ReactNativeWebView = {};

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] }, children);

    const { result } = renderHook(() => useLayoutRoutes(), { wrapper });

    expect(result.current.isMobileAppView).toBe(true);
    expect(result.current.mainContentClassName).toBe('p-2');
  });
});
