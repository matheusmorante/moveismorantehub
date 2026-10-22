import { useLocation } from 'react-router-dom';

export interface LayoutRoutesState {
  isMobileAppView: boolean;
  isTemplateEditor: boolean;
  isCustomerSupport: boolean;
  isProductsPage: boolean;
  isAssistancePage: boolean;
  mainContentClassName: string;
}

export function useLayoutRoutes(): LayoutRoutesState {
  const location = useLocation();

  const isMobileAppView =
    typeof window !== 'undefined' &&
    (window.location.search.includes('auth_email') ||
      window.location.pathname.includes('/mobile') ||
      Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView));

  const isTemplateEditor =
    location.pathname === '/templates/price-label' ||
    ['/templates/posts', '/marketing/posts', '/marketing'].includes(location.pathname);

  const isCustomerSupport = location.pathname.startsWith('/atendimento');

  const isProductsPage = location.pathname === '/products';
  const isAssistancePage = location.pathname === '/assistance-orders';

  let mainContentClassName = 'p-3 sm:p-4 md:p-6 lg:p-6 xl:p-8';
  if (isTemplateEditor || isCustomerSupport) {
    mainContentClassName = 'p-0 overflow-hidden flex flex-col';
  } else if (isMobileAppView) {
    mainContentClassName = 'p-2';
  } else if (isProductsPage || isAssistancePage) {
    mainContentClassName = 'px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 pt-0 pb-6 xl:pb-8';
  }

  return {
    isMobileAppView,
    isTemplateEditor,
    isCustomerSupport,
    isProductsPage,
    isAssistancePage,
    mainContentClassName,
  };
}
