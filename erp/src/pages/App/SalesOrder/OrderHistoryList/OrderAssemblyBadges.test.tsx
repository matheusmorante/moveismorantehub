// @vitest-environment jsdom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { OrderAssemblyBadges } from './OrderAssemblyBadges';
import {
    getOrderAssemblyFlags,
    isHandlingDepotItem,
    isHandlingOutsideItem,
    normalizeHandlingText
} from './orderItemHandlingUtils';
import Order from '../../../types/order.type';

afterEach(cleanup);

describe('Etapa 1.4: Manuseio de itens e montagens [TESTE_AUT]', () => {
    describe('normalizeHandlingText', () => {
        it('deve remover acentos e converter para minúsculas corretamente', () => {
            expect(normalizeHandlingText('Montagem no Depósito')).toBe('montagem no deposito');
            expect(normalizeHandlingText('MONTAGEM NA ENTREGA')).toBe('montagem na entrega');
            expect(normalizeHandlingText('')).toBe('');
        });
    });

    describe('isHandlingDepotItem & isHandlingOutsideItem', () => {
        const mockOptions = [
            { label: 'Montagem no Depósito', includeInAssemblySchedule: true, isAssemblyOutside: false },
            { label: 'Montagem na Entrega', includeInAssemblySchedule: false, isAssemblyOutside: true },
        ];

        it('deve identificar montagem no depósito por texto e por flag de configuração', () => {
            expect(isHandlingDepotItem({ handlingType: 'Montagem no Depósito' }, mockOptions)).toBe(true);
            expect(isHandlingDepotItem({ handlingType: 'montagem para retirada' }, [])).toBe(true);
            expect(isHandlingDepotItem({ handlingType: 'Sem montagem' }, mockOptions)).toBe(false);
        });

        it('deve identificar montagem fora/na entrega por texto e por flag de configuração', () => {
            expect(isHandlingOutsideItem({ handlingType: 'Montagem na Entrega' }, mockOptions)).toBe(true);
            expect(isHandlingOutsideItem({ handlingType: 'montagem no endereco' }, [])).toBe(true);
            expect(isHandlingOutsideItem({ handlingType: 'Sem montagem' }, mockOptions)).toBe(false);
        });
    });

    describe('getOrderAssemblyFlags', () => {
        it('deve retornar false para devoluções mesmo se contiverem texto de montagem', () => {
            const returnOrder = {
                orderType: 'return',
                items: [{ handlingType: 'Montagem no Depósito' }],
            } as any as Order;

            const flags = getOrderAssemblyFlags(returnOrder, {});
            expect(flags.hasAssemblyDepot).toBe(false);
            expect(flags.hasAssemblyOutside).toBe(false);
        });

        it('deve detectar flags de montagem no pedido tanto em items quanto a nível de pedido', () => {
            const orderWithItems = {
                orderType: 'sale',
                items: [
                    { id: '1', handlingType: 'Montagem no Depósito' },
                    { id: '2', handlingType: 'Montagem na Entrega' },
                ],
            } as any as Order;

            const flags = getOrderAssemblyFlags(orderWithItems, {});
            expect(flags.hasAssemblyDepot).toBe(true);
            expect(flags.hasAssemblyOutside).toBe(true);
        });

        it('deve detectar flag a nível de cabeçalho do pedido ou shipping', () => {
            const orderHeader = {
                orderType: 'sale',
                handlingType: 'Montagem fora',
                items: [],
            } as any as Order;

            const flags = getOrderAssemblyFlags(orderHeader, {});
            expect(flags.hasAssemblyDepot).toBe(false);
            expect(flags.hasAssemblyOutside).toBe(true);
        });
    });

    describe('OrderAssemblyBadges Component', () => {
        it('não renderiza nada se não houver montagem no depósito nem fora', () => {
            const { container } = render(
                <OrderAssemblyBadges hasAssemblyDepot={false} hasAssemblyOutside={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('renderiza badge amarelo/âmbar para montagem no depósito com ícone Drill', () => {
            const { container } = render(
                <OrderAssemblyBadges hasAssemblyDepot={true} hasAssemblyOutside={false} />
            );

            const badge = screen.getByTitle('Montagem no Depósito (antes da entrega/retirada)');
            expect(badge).toBeDefined();
            expect(badge.className).toContain('bg-amber-500');
            expect(container.querySelector('svg')).toBeDefined();
        });

        it('renderiza badge vermelho para montagem fora com ícone Drill', () => {
            const { container } = render(
                <OrderAssemblyBadges hasAssemblyDepot={false} hasAssemblyOutside={true} />
            );

            const badge = screen.getByTitle('Montagem Fora (na casa do cliente)');
            expect(badge).toBeDefined();
            expect(badge.className).toContain('bg-red-600');
            expect(container.querySelector('svg')).toBeDefined();
        });

        it('renderiza ambos os badges se ambas as condições forem verdadeiras', () => {
            render(
                <OrderAssemblyBadges hasAssemblyDepot={true} hasAssemblyOutside={true} />
            );

            expect(screen.getByTitle('Montagem no Depósito (antes da entrega/retirada)')).toBeDefined();
            expect(screen.getByTitle('Montagem Fora (na casa do cliente)')).toBeDefined();
        });
    });
});
