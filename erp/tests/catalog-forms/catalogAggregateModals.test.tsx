import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  uploadToR2: vi.fn(),
  optimizeProductImage: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastLoading: vi.fn(),
  toastDismiss: vi.fn(),
  fromCalls: [] as any[],
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: mocks.signOut,
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: (table: string) => {
      const call: any = { table, action: 'select', payload: undefined, filters: {} };
      const builder: any = {
        select: (fields?: string) => { if (call.action === 'select') call.action = 'select'; call.fields = fields; return builder; },
        insert: (payload: any) => { call.action = 'insert'; call.payload = payload; return builder; },
        update: (payload: any) => { call.action = 'update'; call.payload = payload; return builder; },
        delete: () => { call.action = 'delete'; return builder; },
        eq: (k: string, v: any) => { call.filters[k] = v; return builder; },
        single: () => builder,
        then: (resolve: any, reject: any) => {
          mocks.fromCalls.push(call);
          if (call.action === 'insert' && table === 'attributes') {
            return Promise.resolve({ data: { id: 'attr-123', ...(call.payload?.[0] || {}) }, error: null }).then(resolve, reject);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  },
}));

vi.mock('@/lib/utils/upload-r2', () => ({
  uploadToR2: mocks.uploadToR2,
}));

vi.mock('@/lib/utils/image-optimization', () => ({
  optimizeProductImage: mocks.optimizeProductImage,
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    loading: mocks.toastLoading,
    dismiss: mocks.toastDismiss,
  },
}));

vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));

vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, any>((props, ref) => <input ref={ref} {...props} />),
}));
vi.mock('@/components/ui/label', () => ({ Label: ({ children, ...props }: any) => <label {...props}>{children}</label> }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
vi.mock('@/components/ui/card', () => Object.fromEntries(['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle', 'CardFooter'].map((name) => [name, ({ children }: any) => <div>{children}</div>])));
const DialogContext = React.createContext<{ open: boolean; onOpenChange?: (open: boolean) => void }>({ open: false });

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open = false, onOpenChange }: any) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const currentOpen = isControlled ? open : uncontrolledOpen;
    const handleOpenChange = (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    };
    return (
      <DialogContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
        {children}
      </DialogContext.Provider>
    );
  },
  DialogTrigger: ({ children, asChild }: any) => {
    const ctx = React.useContext(DialogContext);
    return React.cloneElement(children, {
      onClick: (e: any) => {
        children.props?.onClick?.(e);
        ctx.onOpenChange?.(true);
      },
    });
  },
  DialogContent: ({ children, className }: any) => {
    const ctx = React.useContext(DialogContext);
    return ctx.open ? <div role="dialog" className={className}>{children}</div> : null;
  },
  DialogHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }: any) => <div className={className}>{children}</div>,
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    loginWithGoogle: mocks.signInWithOAuth,
    logout: mocks.signOut,
  }),
}));

vi.mock('@/hooks/use-admin-mode', () => ({
  useAdminMode: () => ({
    isAdminMode: true,
    toggleAdminMode: vi.fn(),
  }),
}));

import { UserNav } from '../../../digital-catalog/src/components/layout/user-nav';
import { AttributeManagerModal } from '../../../digital-catalog/src/features/products/components/admin-modal/dialogs/AttributeManagerModal';
import { VariationFormModal } from '../../../digital-catalog/src/features/products/components/admin-modal/dialogs/VariationFormModal';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fromCalls = [];
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.optimizeProductImage.mockResolvedValue(new Blob(['test'], { type: 'image/webp' }));
  mocks.uploadToR2.mockResolvedValue('https://r2.example.com/test.webp');
});

afterEach(() => {
  cleanup();
});

describe('Catalog aggregate forms and modals', () => {
  describe('UserNav auth modal', () => {
    it('blocks email login with invalid fields and does not call supabase signInWithPassword', async () => {
      render(<UserNav />);
      fireEvent.click(screen.getByRole('button', { name: /Logar \/ Cadastrar/i }));

      const emailInput = screen.getByPlaceholderText('seu@email.com');
      const form = emailInput.closest('form')!;

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalled();
      });
      expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    });

    it('submits parsed credentials to supabase signInWithPassword on valid form', async () => {
      mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      render(<UserNav />);
      fireEvent.click(screen.getByRole('button', { name: /Logar \/ Cadastrar/i }));

      const emailInput = screen.getByPlaceholderText('seu@email.com');
      const form = emailInput.closest('form')!;
      const passwordInput = form.querySelector('input[type="password"]')!;

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(mocks.toastError).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mocks.signInWithPassword).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
      });
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Login realizado com sucesso!');
    });
  });

  describe('AttributeManagerModal', () => {
    it('validates and saves new attribute through attributeForm.validateAndRun', async () => {
      const fetchDb = vi.fn().mockResolvedValue(undefined);
      const onCreated = vi.fn();
      render(
        <AttributeManagerModal
          isOpen={true}
          onOpenChange={vi.fn()}
          dbAttributes={[]}
          dbAttributeValues={[]}
          fetchDbAttributes={fetchDb}
          onAttributeCreated={onCreated}
        />
      );

      const nameInput = screen.getByPlaceholderText('Ex: Cor, Tamanho, Voltagem');
      const valueInput = screen.getByPlaceholderText('Ex: Azul, Preto...');

      // Attempt save with empty values
      fireEvent.change(nameInput, { target: { value: 'Cor' } });
      const saveBtn = screen.getByRole('button', { name: 'Criar Atributo' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalledWith('Adicione pelo menos um valor!');
      });

      // Add a value and save
      fireEvent.change(valueInput, { target: { value: 'Azul' } });
      fireEvent.keyDown(valueInput, { key: 'Enter', code: 'Enter' });

      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mocks.fromCalls.some((c) => c.table === 'attributes' && c.action === 'insert')).toBe(true);
      });
      expect(fetchDb).toHaveBeenCalled();
      expect(onCreated).toHaveBeenCalledWith('Cor', 'Azul');
    });

    it('adds value to existing attribute through attributeValueForm.validateAndRun', async () => {
      const fetchDb = vi.fn().mockResolvedValue(undefined);
      render(
        <AttributeManagerModal
          isOpen={true}
          onOpenChange={vi.fn()}
          dbAttributes={[{ id: 'attr-1', name: 'Material' }]}
          dbAttributeValues={[{ id: 'val-1', attribute_id: 'attr-1', value: 'Madeira' }]}
          fetchDbAttributes={fetchDb}
        />
      );

      const addValueInput = screen.getByPlaceholderText('Adicionar novo valor...');
      fireEvent.change(addValueInput, { target: { value: 'Ferro' } });
      const addBtn = screen.getByRole('button', { name: 'Adicionar' });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(mocks.fromCalls.some((c) => c.table === 'attribute_values' && c.action === 'insert')).toBe(true);
      });
      expect(fetchDb).toHaveBeenCalled();
    });
  });

  describe('VariationFormModal', () => {
    it('runs variationForm.validateAndRun and triggers onSave with valid data and auto-generated sku', async () => {
      const onSave = vi.fn();
      const onOpenChange = vi.fn();
      const productFormData: any = {
        name: 'Mesa de Centro',
        slug: 'mesa-de-centro',
        price: '500,00',
        promo_price: '',
        description: '',
        width: '50',
        depth: '50',
        height: '40',
        depth_use_length: false,
        images: [],
        category_ids: [],
        is_salvado: false,
        opportunity_id: null,
      };

      render(
        <VariationFormModal
          isOpen={true}
          onOpenChange={onOpenChange}
          initialVariation={null}
          editingIndex={null}
          productFormData={productFormData}
          dbAttributes={[{ id: 'a1', name: 'Cor' }]}
          dbAttributeValues={[{ id: 'v1', attribute_id: 'a1', value: 'Branco' }]}
          onSave={onSave}
          onOpenFastCreate={vi.fn()}
        />
      );

      // Advance through steps 1 and 2
      fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));
      fireEvent.click(screen.getByRole('button', { name: /Próximo/i }));

      // Step 3: click finish
      fireEvent.click(screen.getByRole('button', { name: /Salvar Variação/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            price: '500,00',
            stock: '999',
          }),
          null
        );
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
