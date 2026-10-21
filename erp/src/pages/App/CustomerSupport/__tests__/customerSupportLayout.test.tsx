// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '@/AppLayout';

const route = vi.hoisted(() => ({ isCustomerSupport: true }));
vi.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, activeRoleMode: null }) }));
vi.mock('react-toastify', () => ({ ToastContainer: () => null }));
vi.mock('@/components/layout', () => ({
  AppHeader: () => null, MobileNav: () => null, SupabaseAnomalyBanner: () => null, ActiveRoleBanner: () => null,
  useGlobalAppEvents: () => ({ isAgentOpen: false, isAssistanceModalOpen: false }),
  useLayoutRoutes: () => ({ ...route, isMobileAppView: false, isTemplateEditor: false,
    mainContentClassName: route.isCustomerSupport ? 'p-0 overflow-hidden flex flex-col' : 'p-3' }),
}));
vi.mock('@/components/shared/FloatingActionsHub', () => ({ default: () => null }));
vi.mock('@/components/shared/AIChatAssistant', () => ({ default: () => null }));
vi.mock('@/pages/App/SalesOrder/modals/AssistanceOrderModal', () => ({ default: () => null }));

beforeEach(() => { route.isCustomerSupport = true; });
afterEach(cleanup);

describe('Altura do layout da Central', () => {
  it('limita a Central ao viewport e permite encolher o conteúdo para rolagem interna', () => {
    const { container } = render(<MemoryRouter><AppLayout /></MemoryRouter>);
    const main = container.querySelector('main')!;
    expect(main.parentElement?.classList.contains('h-dvh')).toBe(true);
    expect(main.parentElement?.classList.contains('overflow-hidden')).toBe(true);
    expect(main.classList.contains('min-h-0')).toBe(true);
  });

  it('preserva o crescimento normal das outras páginas', () => {
    route.isCustomerSupport = false;
    const { container } = render(<MemoryRouter><AppLayout /></MemoryRouter>);
    const main = container.querySelector('main')!;
    expect(main.parentElement?.classList.contains('min-h-screen')).toBe(true);
    expect(main.parentElement?.classList.contains('h-dvh')).toBe(false);
    expect(main.classList.contains('min-h-0')).toBe(false);
  });
});
