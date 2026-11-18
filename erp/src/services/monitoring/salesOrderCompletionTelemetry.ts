import erpPackage from '../../../package.json';
import { supabaseMonitor } from './queryGuard';
import type {
  InteractionNetworkClass,
  InteractionTimingAction,
  InteractionTimingResult,
  InteractionViewportClass,
  MarketingPostTimingAction,
} from './types';

const APP_VERSION = /^[A-Za-z0-9._+-]{1,40}$/.test(erpPackage.version)
  ? erpPackage.version
  : 'unknown';

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string };
};

const getNetworkClass = (): InteractionNetworkClass => {
  if (typeof navigator === 'undefined') return 'unknown';
  if (!navigator.onLine) return 'offline';

  const effectiveType = (navigator as NavigatorWithConnection).connection?.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || effectiveType === '4g') {
    return effectiveType;
  }
  return 'unknown';
};

const getViewportClass = (): InteractionViewportClass => {
  if (typeof window === 'undefined') return 'unknown';
  if (window.innerWidth < 640) return 'phone';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
};

export const recordMarketingPostTiming = (
  action: MarketingPostTimingAction,
  result: InteractionTimingResult,
  durationMs: number,
) => {
  supabaseMonitor.trackInteractionTiming({
    metric_kind: 'product_interaction_timing',
    module: 'Marketing',
    screen: 'Posts',
    action,
    app_version: APP_VERSION,
    network_class: getNetworkClass(),
    viewport_class: getViewportClass(),
    result,
    duration_ms: durationMs,
  });
};

export const recordErpPageWebVital = (action: 'erp_page_lcp' | 'erp_page_inp', durationMs: number) => {
  supabaseMonitor.trackInteractionTiming({
    metric_kind: 'product_interaction_timing',
    module: 'Global',
    screen: 'ERP',
    action,
    app_version: APP_VERSION,
    network_class: getNetworkClass(),
    viewport_class: getViewportClass(),
    result: 'observed',
    duration_ms: durationMs,
  });
};

let webVitalsWindow: Window | null = null;

export const registerErpPageWebVitals = () => {
  if (typeof window === 'undefined' || webVitalsWindow === window) return;
  webVitalsWindow = window;

  void import('web-vitals').then(({ onINP, onLCP }) => {
    onLCP((metric) => recordErpPageWebVital('erp_page_lcp', metric.value));
    onINP((metric) => recordErpPageWebVital('erp_page_inp', metric.value));
  }).catch(() => {
    // Browser support or a delayed chunk must not interrupt the editor.
  });
};

export const recordSalesOrderCompletionTiming = (
  action: InteractionTimingAction,
  result: InteractionTimingResult,
  durationMs: number,
) => {
  supabaseMonitor.trackInteractionTiming({
    metric_kind: 'interaction_timing',
    module: 'Sales',
    screen: 'NewSaleOrder',
    action,
    app_version: APP_VERSION,
    network_class: getNetworkClass(),
    viewport_class: getViewportClass(),
    result,
    duration_ms: durationMs,
  });
};
