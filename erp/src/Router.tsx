import React, { lazy, Suspense } from 'react';
import { Routes, Route, BrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PasswordSetupPrompt } from './components/auth/PasswordSetupPrompt';
import SalesOrder from './pages/App/SalesOrder';
import Dashboard from './pages/App/Dashboard/Index';
import AppLayout from './AppLayout';
import PendingApproval from './pages/PendingApproval';
import ReceiptPage from './pages/ReceiptPage';
import WarrantyTermPage from './pages/WarrantyTermPage';
import DeliverySchedule from './pages/App/DeliverySchedule';
import OrderPage from './pages/OrderPage';
import Products from './pages/App/Products/Index';
import Categories from './pages/App/Products/Categories/Index';
import SupplierReconciliation from './pages/App/Products/Reconciliation/SupplierReconciliation';
import ProductCompositions from './pages/App/Products/Compositions/Index';
import Settings from './pages/App/Settings';
import SupabaseMonitorDashboard from './pages/App/Settings/SupabaseMonitor/Index';
import ProductTypes from './pages/App/Products/ProductTypes/Index';
import Customers from './pages/App/Customers/Index';
import Suppliers from './pages/App/Suppliers/Index';
import Employees from './pages/App/Employees/Index';
import Services from './pages/App/Services/Index';
import Variations from './pages/App/Variations/Index';
import Stock from './pages/App/Stock';
import NcmCatalogPage from './pages/App/Stock/NcmCatalogPage';
import UnavailabilitiesPage from './pages/App/Stock/Unavailabilities';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProfilePage from './pages/App/Profile/Index';
import AccessAndUsersPage from './pages/App/AccessAndUsers/Index';
import PurchasesPage from './pages/App/Stock/Purchases/Index';
import ReceiptsPage from './pages/App/Stock/Receipts/Index';
import InboundInvoicesPage from './pages/App/Stock/InboundInvoices/Index';
import OrderRouteMap from './pages/App/SalesOrder/OrderRouteMap';
import ShippingLabelPage from './pages/ShippingLabelPage';
import CustomerDesiresPage from './pages/App/Customers/CustomerDesiresPage';
import WhatsAppMarketplace from './pages/App/Products/WhatsAppMarketplace';
import MetaCatalog from './pages/App/Products/MetaCatalog';
import Payables from './pages/App/Finance/Payables';
import Receivables from './pages/App/Finance/Receivables';
import Transactions from './pages/App/Finance/Transactions';
import FinanceSettings from './pages/App/Finance/Settings';
import LabelPrinting from './pages/App/Stock/LabelPrinting/Index';
import SystemDocs from './pages/App/SystemDocs/Index';
import ChannelCatalog from './pages/App/Marketing/ChannelCatalog';
import MarketingPosts from './pages/App/Marketing/Posts';
import AssemblyListPage from './pages/App/Logistics/AssemblyListPage';
import AssemblyPrintPage from './pages/App/Logistics/AssemblyPrintPage';
import MobileAppLanding from './pages/App/MobileAppLanding';
import ApiUsagePage from './pages/App/ApiUsage/Index';
const SalesOrderReports = lazy(() => import('./pages/App/SalesOrder/Reports/Index'));
const SalesOrderReportView = lazy(
  () => import('./pages/App/SalesOrder/Reports/components/ReportView')
);
const SalesOrderReportsBling = lazy(() => import('./pages/App/SalesOrder/ReportsBling/Index'));
const SalesOrderReportViewBling = lazy(
  () => import('./pages/App/SalesOrder/ReportsBling/ReportView')
);
import BlingStock from './pages/App/Stock/BlingStock/index';
import NewSaleOrder from './pages/App/SalesOrder/NewSaleOrder';
import OrderEditModal from './pages/App/SalesOrder/OrderEditModal';
import FiscalDocumentsPage from './pages/App/FiscalDocuments';
import { canPerform } from './pages/utils/permissionService';
import { getProfileRoles } from './pages/utils/accessRoles';

const LoadingFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
      Carregando...
    </p>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, isPending } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const isMobileAuth =
    searchParams.has('auth_email') ||
    searchParams.has('user_id') ||
    window.location.search.includes('auth_email') ||
    Boolean((window as any).ReactNativeWebView);

  if (loading && !isMobileAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-10">
        <div className="w-16 h-16 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-6" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-pulse">
          Sincronizando Sessão...
        </p>
      </div>
    );
  }

  if (!isAuthenticated && !isMobileAuth) {
    return <Navigate to="/login" replace />;
  }

  if (isPending && !isMobileAuth) {
    return <PendingApproval />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const isMobileAuth =
    searchParams.has('auth_email') ||
    searchParams.has('user_id') ||
    window.location.search.includes('auth_email') ||
    Boolean((window as any).ReactNativeWebView);

  if (loading && !isMobileAuth) return null;

  if (!isAdmin && !isMobileAuth) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const PermissionRoute = ({
  action,
  children,
}: {
  action: string;
  children?: React.ReactNode;
}) => {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!canPerform(action, profile ? getProfileRoles(profile) : [])) {
    return <Navigate to="/" replace />;
  }

  return <>{children || <Outlet />}</>;
};

const ProductIdentificationLabelRoute = () => {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const roles = profile ? getProfileRoles(profile) : [];

  if (loading) return null;
  if (canPerform('viewStockLabels', roles)) return <LabelPrinting />;
  if (!canPerform('printProductIdentificationLabels', roles)) {
    return <Navigate to="/" replace />;
  }

  const searchParams = new URLSearchParams(location.search);
  const category = searchParams.get('cat') || searchParams.get('category');
  if (category !== 'identificacao') {
    return (
      <Navigate
        to={{ pathname: location.pathname, search: '?cat=identificacao' }}
        replace
        state={location.state}
      />
    );
  }

  return <LabelPrinting />;
};

import ResetPassword from './pages/ResetPassword';

const DashboardRoute = () => {
  const { isAdmin, loading, profile } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const isMobileAuth =
    searchParams.has('auth_email') ||
    searchParams.has('user_id') ||
    window.location.search.includes('auth_email') ||
    Boolean((window as any).ReactNativeWebView);

  if (loading && !isMobileAuth) return null;

  if (!isAdmin && !isMobileAuth) {
    const roles = profile ? getProfileRoles(profile) : [];
    const landingPath = canPerform('viewOrders', roles)
      ? '/sales-order'
      : canPerform('startDelivery', roles)
        ? '/delivery-schedule'
        : canPerform('viewProducts', roles)
          ? '/products'
          : canPerform('viewFinancials', roles)
            ? '/finance/transactions'
            : '/profile';
    return <Navigate to={landingPath} replace />;
  }

  return <Dashboard />;
};

function Router() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Publicly accessible order pages could go here if needed */}
          <Route path="/receipt" element={<ReceiptPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/shipping-label" element={<ShippingLabelPage />} />
          <Route path="/schedule" element={<DeliverySchedule />} />
          <Route path="/assembly-schedule" element={<AssemblyListPage />} />
          <Route path="/logistics/assembly-print" element={<AssemblyPrintPage />} />
          <Route
            path="/public/report/:id"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <SalesOrderReportView />
              </Suspense>
            }
          />

          {/* Unlocked Direct Mobile Routes */}
          <Route element={<AppLayout />}>
            <Route
              path="/mobile-orders"
              element={
                <ProtectedRoute>
                  <PermissionRoute action="viewOrders">
                    <SalesOrder />
                  </PermissionRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mobile-reports"
              element={
                <ProtectedRoute>
                  <PermissionRoute action="viewSalesReports">
                    <Suspense fallback={<LoadingFallback />}>
                      <SalesOrderReports />
                    </Suspense>
                  </PermissionRoute>
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Protected ERP Application */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardRoute />} />
            <Route element={<PermissionRoute action="viewOrders" />}>
              <Route path="/sales-order" element={<SalesOrder />} />
              <Route path="/sales-order/freight-calculation" element={<OrderRouteMap />} />
              <Route path="/warranty-term" element={<WarrantyTermPage />} />
            </Route>
            <Route element={<PermissionRoute action="createEditOrders" />}>
              <Route path="/sales-order/new" element={<NewSaleOrder />} />
              <Route path="/sales-order/edit/:id" element={<OrderEditModal />} />
            </Route>
            <Route element={<PermissionRoute action="viewBudgets" />}>
              <Route path="/budgets" element={<SalesOrder />} />
            </Route>
            <Route element={<PermissionRoute action="viewAssistanceOrders" />}>
              <Route path="/assistance-orders" element={<SalesOrder />} />
            </Route>
            <Route element={<PermissionRoute action="viewReturns" />}>
              <Route path="/returns" element={<SalesOrder />} />
            </Route>
            <Route element={<PermissionRoute action="viewSalesReports" />}>
              <Route
                path="/sales-order/reports"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <SalesOrderReports />
                  </Suspense>
                }
              />
              <Route
                path="/sales-order/reports/:id"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <SalesOrderReportView />
                  </Suspense>
                }
              />
              <Route
                path="/sales-order/reports-bling"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <SalesOrderReportsBling />
                  </Suspense>
                }
              />
              <Route
                path="/sales-order/reports-bling/:id"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <SalesOrderReportViewBling />
                  </Suspense>
                }
              />
            </Route>
            <Route
              path="/fiscal-documents"
              element={
                <PermissionRoute action="viewFiscal">
                  <FiscalDocumentsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/delivery-schedule"
              element={
                <PermissionRoute action="viewDeliverySchedule">
                  <DeliverySchedule />
                </PermissionRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <Settings />
                </AdminRoute>
              }
            />
            <Route
              path="/settings/fiscal"
              element={
                <AdminRoute>
                  <Navigate to="/settings#fiscal" replace />
                </AdminRoute>
              }
            />
            <Route
              path="/settings/stock"
              element={
                <AdminRoute>
                  <Navigate to="/settings#scanner" replace />
                </AdminRoute>
              }
            />
            <Route
              path="/settings/sales"
              element={
                <AdminRoute>
                  <Navigate to="/settings#bandeiras" replace />
                </AdminRoute>
              }
            />
            <Route
              path="/settings/logistics"
              element={
                <AdminRoute>
                  <Navigate to="/settings#logistica" replace />
                </AdminRoute>
              }
            />
            <Route
              path="/settings/supabase-monitor"
              element={
                <AdminRoute>
                  <SupabaseMonitorDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/api-usage"
              element={
                <AdminRoute>
                  <ApiUsagePage />
                </AdminRoute>
              }
            />

            {/* Registrations */}
            <Route
              path="/products"
              element={
                <PermissionRoute action="viewProducts">
                  <Products />
                </PermissionRoute>
              }
            />
            <Route path="/registrations/products" element={<Navigate to="/products" replace />} />
            <Route element={<PermissionRoute action="viewProductCompositions" />}>
              <Route path="/products/compositions" element={<ProductCompositions />} />
            </Route>
            <Route element={<PermissionRoute action="viewProductReconciliation" />}>
              <Route path="/products/reconciliation" element={<SupplierReconciliation />} />
              <Route
                path="/products/reconciliation/suppliers"
                element={<SupplierReconciliation />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewProductCategories" />}>
              <Route path="/products/categories" element={<Categories />} />
              <Route path="/products/types" element={<ProductTypes />} />
              <Route
                path="/registrations/product-categories"
                element={<Navigate to="/products/categories" replace />}
              />
              <Route
                path="/registrations/product-types"
                element={<Navigate to="/products/types" replace />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewProductCharacteristics" />}>
              <Route path="/products/characteristics" element={<Variations />} />
              <Route
                path="/registrations/variations"
                element={<Navigate to="/products/characteristics" replace />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewWhatsAppMarketplace" />}>
              <Route path="/registrations/whatsapp-marketplace" element={<WhatsAppMarketplace />} />
            </Route>
            <Route element={<PermissionRoute action="viewMetaCatalog" />}>
              <Route path="/products/meta-catalog" element={<MetaCatalog />} />
              <Route
                path="/registrations/meta-catalog"
                element={<Navigate to="/products/meta-catalog" replace />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewMarketingPosts" />}>
              <Route path="/marketing" element={<MarketingPosts />} />
              <Route path="/marketing/posts" element={<MarketingPosts />} />
              <Route path="/templates/posts" element={<MarketingPosts />} />
            </Route>
            <Route element={<PermissionRoute action="viewChannelCatalog" />}>
              <Route path="/marketing/channel-catalog" element={<ChannelCatalog />} />
            </Route>
            {/* Estoque */}
            <Route element={<PermissionRoute action="viewStock" />}>
              <Route path="/estoque" element={<Navigate to="/estoque/movimentacoes" replace />} />
            </Route>
            <Route element={<PermissionRoute action="viewStockMovements" />}>
              <Route path="/estoque/movimentacoes" element={<Stock />} />
            </Route>
            <Route element={<PermissionRoute action="viewStockInventory" />}>
              <Route path="/estoque/inventarios" element={<Stock />} />
            </Route>
            <Route element={<PermissionRoute action="viewStockUnavailabilities" />}>
              <Route path="/estoque/indisponibilidades" element={<UnavailabilitiesPage />} />
              <Route path="/estoque/indisponibilidades/:id" element={<UnavailabilitiesPage />} />
            </Route>
            <Route element={<PermissionRoute action="viewStockPurchases" />}>
              <Route path="/estoque/pedidos-compra" element={<PurchasesPage />} />
              <Route
                path="/stock/purchases"
                element={<Navigate to="/estoque/pedidos-compra" replace />}
              />
              <Route
                path="/purchases"
                element={<Navigate to="/estoque/pedidos-compra" replace />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewStockReceipts" />}>
              <Route path="/estoque/recebimentos" element={<ReceiptsPage />} />
            </Route>
            <Route element={<PermissionRoute action="viewBlingStock" />}>
              <Route path="/estoque/bling" element={<BlingStock />} />
            </Route>
            <Route path="/estoque/etiquetas" element={<ProductIdentificationLabelRoute />} />
            <Route element={<PermissionRoute action="viewStockLabels" />}>
              <Route path="/design/labels" element={<LabelPrinting />} />
              <Route path="/templates/price-label" element={<LabelPrinting />} />
            </Route>
            <Route element={<PermissionRoute action="viewNcmCatalog" />}>
              <Route path="/estoque/ncm" element={<NcmCatalogPage />} />
            </Route>
            <Route element={<PermissionRoute action="viewInboundFiscal" />}>
              <Route path="/estoque/notas-fiscais-entrada" element={<InboundInvoicesPage />} />
            </Route>
            <Route
              path="/estoque/fornecedores"
              element={
                <PermissionRoute action="viewSuppliers">
                  <Suppliers />
                </PermissionRoute>
              }
            />
            <Route element={<PermissionRoute action="viewServices" />}>
              <Route path="/registrations/services" element={<Services />} />
            </Route>
            <Route element={<PermissionRoute action="viewCustomers" />}>
              <Route path="/registrations/customers" element={<Customers />} />
            </Route>
            <Route element={<PermissionRoute action="viewCustomerDesires" />}>
              <Route path="/customers/desires" element={<CustomerDesiresPage />} />
            </Route>
            <Route element={<PermissionRoute action="viewEmployees" />}>
              <Route path="/registrations/employees" element={<Employees />} />
            </Route>
            <Route
              path="/acessos-e-usuarios"
              element={
                <AdminRoute>
                  <AccessAndUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/access-and-users"
              element={
                <AdminRoute>
                  <AccessAndUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <AccessAndUsersPage />
                </AdminRoute>
              }
            />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Módulo Financeiro (Movimentações) */}
            <Route element={<PermissionRoute action="viewFinancials" />}>
              <Route path="/finance" element={<Navigate to="/finance/transactions" replace />} />
              <Route
                path="/finance/dashboard"
                element={<Navigate to="/finance/transactions" replace />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewFinancePayables" />}>
              <Route
                path="/finance/payables"
                element={<Payables />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewFinanceReceivables" />}>
              <Route
                path="/finance/receivables"
                element={<Receivables />}
              />
            </Route>
            <Route element={<PermissionRoute action="viewFinanceTransactions" />}>
              <Route path="/finance/transactions" element={<Transactions />} />
            </Route>
            <Route element={<PermissionRoute action="viewFinanceSettings" />}>
              <Route path="/finance/settings" element={<FinanceSettings />} />
            </Route>
            <Route
              path="/logistics/assembly-list"
              element={
                <PermissionRoute action="viewAssemblyList">
                  <AssemblyListPage />
                </PermissionRoute>
              }
            />
            <Route path="/mobile-app" element={<MobileAppLanding />} />
            <Route path="/system-docs" element={<SystemDocs />} />
          </Route>
        </Routes>
        <PasswordSetupPrompt />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default Router;
