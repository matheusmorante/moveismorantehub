import type Order from '../../../../types/order.type';
import { formatOrderCode } from '../../../../utils/orderCode';
import ReturnOrderFormFooter from '../../components/ReturnOrderFormFooter';

interface ReturnOrderFooterProps {
  order: Order;
  selectedTotal: number;
  quantitiesCount: number;
  submitting: boolean;
  returnDataError: string | null;
  returnsLoaded: boolean;
  fiscalCapacityLoaded: boolean;
  hasAuthorizedInvoice: boolean;
  fiscalCapacityError: string | null;
  collectAtAddress: boolean | null;
  onClose: () => void;
  onGenerateReturn: () => void;
}

export const ReturnOrderFooter: React.FC<ReturnOrderFooterProps> = ({
  order,
  selectedTotal,
  quantitiesCount,
  submitting,
  returnDataError,
  returnsLoaded,
  fiscalCapacityLoaded,
  hasAuthorizedInvoice,
  fiscalCapacityError,
  collectAtAddress,
  onClose,
  onGenerateReturn,
}) => {
  const isButtonDisabled =
    submitting ||
    Boolean(returnDataError) ||
    !returnsLoaded ||
    !fiscalCapacityLoaded ||
    (hasAuthorizedInvoice && Boolean(fiscalCapacityError)) ||
    quantitiesCount === 0 ||
    collectAtAddress === null;

  const submitStatusLabel = returnDataError
    ? 'Conferência indisponível'
    : submitting || !returnsLoaded || !fiscalCapacityLoaded
      ? 'Conferindo saldos...'
      : undefined;

  return (
    <ReturnOrderFormFooter
      total={selectedTotal}
      itemCount={quantitiesCount}
      relationshipLabel={`Vínculo: #${formatOrderCode(order)}`}
      submitLabel="Gerar pedido de devolução"
      submitStatusLabel={submitStatusLabel}
      disabled={isButtonDisabled}
      submitting={submitting}
      onClose={onClose}
      onSubmit={onGenerateReturn}
    />
  );
};
