import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

function flattenStyle(style: unknown) {
  return Array.isArray(style)
    ? Object.assign({}, ...style.filter((entry) => entry && typeof entry === 'object'))
    : style && typeof style === 'object'
      ? style
      : {};
}

function nativeElement(tag: string) {
  return ({
    children,
    style,
    accessibilityLabel,
    activeOpacity: _activeOpacity,
    onPress: _onPress,
    ...props
  }: any) => {
    const flattened = flattenStyle(style) as Record<string, unknown>;
    return React.createElement(
      tag,
      {
        'aria-label': accessibilityLabel,
        'data-bg': flattened.backgroundColor,
        'data-border': flattened.borderColor,
        ...props,
      },
      children
    );
  };
}

vi.mock('react-native', () => ({
  View: nativeElement('div'),
  Text: ({ children }: any) => React.createElement('span', null, children),
  TouchableOpacity: nativeElement('button'),
  StyleSheet: {
    absoluteFill: { position: 'absolute' },
    create: (styles: any) => styles,
  },
  Animated: {
    Value: vi.fn(function () {
      return { interpolate: vi.fn(() => 0) };
    }),
    timing: vi.fn(() => ({ start: vi.fn() })),
    loop: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    View: ({ children }: any) =>
      React.createElement('div', { 'data-motion-band': 'true' }, children),
  },
}));

vi.mock('lucide-react-native', () => {
  const icon = (name: string) =>
    ({ size, color }: { size?: number; color?: string }) =>
      React.createElement('i', {
        'data-icon': name,
        'data-size': size,
        'data-color': color,
      });

  return {
    AlertTriangle: icon('AlertTriangle'),
    Calendar: icon('Calendar'),
    CalendarCheck: icon('CalendarCheck'),
    Check: icon('Check'),
    CheckCircle2: icon('CheckCircle2'),
    Clock: icon('Clock'),
    Link2: icon('Link2'),
    MapPin: icon('MapPin'),
    Megaphone: icon('Megaphone'),
    PackageCheck: icon('PackageCheck'),
    PackageMinus: icon('PackageMinus'),
    PackagePlus: icon('PackagePlus'),
    PackageX: icon('PackageX'),
    RotateCcw: icon('RotateCcw'),
    Tag: icon('Tag'),
    Truck: icon('Truck'),
    Wrench: icon('Wrench'),
    X: icon('X'),
    XCircle: icon('XCircle'),
  };
});

vi.mock('react-native-svg', () => ({
  default: ({ children, width, height, viewBox }: any) =>
    React.createElement('svg', {
      children,
      'data-icon': 'ReturnIcon',
      'data-size': width || height,
      viewBox,
    }),
  Path: ({ d, stroke }: any) => React.createElement('path', { d, stroke }),
}));

vi.mock('../../../../components/shared/MobileDrill', () => ({
  MobileDrill: () => React.createElement('i', { 'data-icon': 'MobileDrill' }),
}));

vi.mock('../../../../components/shared/PickupIcon', () => ({
  default: ({ size }: { size?: number }) =>
    React.createElement('i', { 'data-icon': 'PickupIcon', 'data-size': size }),
}));

import { OrderCardDeliveryFooter } from '../../../../components/cards/OrderCardDeliveryFooter';
import { OrderCardBadges } from './OrderCardBadges';
import { OrderCardFiscalBadges } from './OrderCardFiscalBadges';

const renderMarkup = (element: React.ReactElement) => renderToStaticMarkup(element);

const baseBadgeProps = {
  orderType: 'return',
  isAssistance: false,
  isReturn: true,
  pickup: false,
  isDraft: false,
  cancelled: false,
  isStockChecked: false,
  stockProcessed: true,
  stockReversed: false,
  isPaidTraffic: false,
  hasAssemblyOutside: false,
  hasAssemblyDepot: false,
  pendingScheduling: false,
  statusConfig: { bg: '#059669', border: '#047857', icon: 'fulfilled' as const },
  statusLabel: 'Devolvido',
};

describe('Order card visual parity with ERP', () => {
  it('uses the ERP return package icon and the inbound movement icon', () => {
    const markup = renderMarkup(<OrderCardBadges {...baseBadgeProps} />);

    expect(markup).toContain('data-icon="ReturnIcon"');
    expect(markup).toContain('viewBox="0 0 64 64"');
    expect(markup).toContain('data-icon="PackagePlus"');
    expect(markup).toContain('data-size="20"');
  });

  it('uses the same pickup asset at the ERP badge size', () => {
    const markup = renderMarkup(
      <OrderCardBadges
        {...baseBadgeProps}
        orderType="sale"
        isReturn={false}
        pickup
      />
    );

    expect(markup).toContain('data-icon="PickupIcon"');
    expect(markup).toContain('data-size="20"');
  });

  it('uses the matching reversed movement icon when stock was reversed', () => {
    const markup = renderMarkup(
      <OrderCardBadges {...baseBadgeProps} stockReversed />
    );

    expect(markup).toContain('data-icon="PackageX"');
  });

  it('matches ERP NF colors and status indicators', () => {
    const markup = renderMarkup(
      <OrderCardFiscalBadges
        fiscalBadgeStatus="issued"
        fiscalHmlBadgeStatus="cancelled"
      />
    );

    expect(markup).toContain('data-bg="#059669"');
    expect(markup).toContain('data-icon="Check"');
    expect(markup).toContain('data-bg="#e11d48"');
    expect(markup).toContain('data-icon="X"');
  });

  it('renders reversed NF in indigo with the counterclockwise indicator', () => {
    const markup = renderMarkup(<OrderCardFiscalBadges fiscalBadgeStatus="reversed" />);

    expect(markup).toContain('data-bg="#4f46e5"');
    expect(markup).toContain('data-icon="RotateCcw"');
  });

  it('uses the authorized fiscal badge style for NFE and NFD', () => {
    const markup = renderMarkup(
      <OrderCardFiscalBadges
        fiscalEstornoStatus="issued"
        fiscalDevolucaoStatus="issued"
        fiscalDevolucaoCount={2}
      />
    );

    expect(markup.match(/data-bg="#059669"/g)).toHaveLength(2);
    expect(markup).toContain('(2)');
    expect(markup.match(/data-icon="Check"/g)).toHaveLength(2);
  });
});

describe('OrderCardDeliveryFooter route status', () => {
  it('shows the moving band only in route and uses orange', () => {
    const markup = renderMarkup(
      <OrderCardDeliveryFooter
        order={{
          status: 'scheduled',
          order_data: {
            shipping: { deliveryMethod: 'delivery' },
            deliveryStatus: 'in_progress',
          },
        }}
      />
    );

    expect(markup).toContain('EM ROTA');
    expect(markup).toContain('data-bg="#f97316"');
    expect(markup).toContain('data-motion-band="true"');
  });

  it('shows blue and a moving band while in service', () => {
    const markup = renderMarkup(
      <OrderCardDeliveryFooter
        order={{
          status: 'scheduled',
          order_data: {
            shipping: { deliveryMethod: 'delivery' },
            deliveryStatus: 'in_service',
          },
        }}
      />
    );

    expect(markup).toContain('EM ATENDIMENTO');
    expect(markup).toContain('data-bg="#2563eb"');
    expect(markup).toContain('data-motion-band="true"');
  });

  it('does not animate arrival or a completed pickup with stale delivery state', () => {
    const arrivalMarkup = renderMarkup(
      <OrderCardDeliveryFooter
        order={{
          status: 'scheduled',
          order_data: {
            shipping: { deliveryMethod: 'delivery' },
            deliveryStatus: 'arrived',
          },
        }}
      />
    );
    const pickupMarkup = renderMarkup(
      <OrderCardDeliveryFooter
        order={{
          status: 'retirado',
          order_type: 'sale',
          order_data: {
            shipping: { deliveryMethod: 'pickup' },
            deliveryStatus: 'in_service',
            deliveryServiceStartedAt: '2026-10-22T12:00:00Z',
          },
        }}
      />
    );

    expect(arrivalMarkup).toContain('CHEGADA NO LOCAL');
    expect(arrivalMarkup).not.toContain('data-motion-band');
    expect(pickupMarkup).toContain('RETIRADO');
    expect(pickupMarkup).not.toContain('data-motion-band');
  });
});
