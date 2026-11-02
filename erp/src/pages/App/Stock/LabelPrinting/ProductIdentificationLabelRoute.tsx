import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { getProfileRoles } from '../../../utils/accessRoles';
import { canPerform } from '../../../utils/permissionService';
import LabelPrinting from './Index';
import { buildIdentificationOnlyLabelSearch } from './utils/identificationLabelRoute';

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
        to={{
          pathname: location.pathname,
          search: buildIdentificationOnlyLabelSearch(location.search),
        }}
        replace
        state={location.state}
      />
    );
  }

  return <LabelPrinting />;
};

export default ProductIdentificationLabelRoute;
