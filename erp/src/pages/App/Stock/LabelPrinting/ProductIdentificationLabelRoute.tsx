import { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { getProfileRoles } from '../../../utils/accessRoles';
import { canPerform } from '../../../utils/permissionService';
import { buildIdentificationOnlyLabelSearch } from './utils/identificationLabelRoute';

const LabelPrinting = lazy(() => import('./Index'));
const AuthorizedLabelPrinting = () => (
  <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-600">Carregando etiquetas…</p>}>
    <LabelPrinting />
  </Suspense>
);

const ProductIdentificationLabelRoute = () => {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const roles = profile ? getProfileRoles(profile) : [];

  if (loading) return null;
  if (canPerform('viewStockLabels', roles)) return <AuthorizedLabelPrinting />;
  if (!canPerform('printProductIdentificationLabels', roles)) {
    return <Navigate to="/" replace />;
  }

  const searchParams = new URLSearchParams(location.search);
  const category = searchParams.get('cat') || searchParams.get('category');
  if (category !== 'identificacao') {
    return (
      <Navigate
        to={{
          pathname: location.pathname,
          search: buildIdentificationOnlyLabelSearch(location.search),
        }}
        replace
        state={location.state}
      />
    );
  }

  return <AuthorizedLabelPrinting />;
};

export default ProductIdentificationLabelRoute;
