type JsonObject = Record<string, any>;

export function projectOrderDataForFiscalEdit(current: JsonObject, submitted: JsonObject): JsonObject {
  const allowed = [
    'items',
    'shipping',
    'payments',
    'paymentsSummary',
    'itemsSummary',
    'customerData',
    'fiscalContext',
    'date',
    'status',
    'orderType',
    'observation',
  ];
  const projected = { ...current };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(submitted, key)) projected[key] = submitted[key];
  }
  return projected;
}

export function hasPotentialFiscalOrderEdit(current: JsonObject, proposed: JsonObject): boolean {
  const fields = (data: JsonObject) => ({
    items: Array.isArray(data.items)
      ? data.items.map((item: JsonObject) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          variationId: item.variationId,
          code: item.code,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitDiscount: item.unitDiscount,
          discountType: item.discountType,
          condition: item.condition,
          itemType: item.itemType,
          linkedProductOrderItemIds: Array.isArray(item.linkedProductOrderItemIds)
            ? [...item.linkedProductOrderItemIds]
            : undefined,
          linkedProductOrderItemId: item.linkedProductOrderItemId,
          fiscal: item.fiscal
            ? {
                ncm: item.fiscal.ncm,
                cest: item.fiscal.cest,
                origem: item.fiscal.origem,
                cfop: item.fiscal.cfop,
                cst: item.fiscal.cst,
                pisCst: item.fiscal.pisCst,
                cofinsCst: item.fiscal.cofinsCst,
                icmsPercent: item.fiscal.icmsPercent,
                ipiPercent: item.fiscal.ipiPercent,
                hasSt: item.fiscal.hasSt,
                isSt: item.fiscal.isSt,
                isOwnProduction: item.fiscal.isOwnProduction,
                merchandiseOrigin: item.fiscal.merchandiseOrigin,
              }
            : undefined,
        }))
      : [],
    customerData: {
      fullName: data.customerData?.fullName,
      name: data.customerData?.name,
      cpfCnpj: data.customerData?.cpfCnpj,
      ie: data.customerData?.ie,
      ieIndicator: data.customerData?.ieIndicator,
      fullAddress: data.customerData?.fullAddress,
    },
    shipping: {
      value: data.shipping?.value,
      deliveryMethod: data.shipping?.deliveryMethod,
      useCustomerAddress: data.shipping?.useCustomerAddress,
      deliveryAddress: data.shipping?.deliveryAddress,
      freightMode: data.shipping?.freightMode,
      transporter: data.shipping?.transporter,
    },
    payments: Array.isArray(data.payments)
      ? data.payments.map((payment: JsonObject) => ({
          method: payment.method,
          amount: payment.amount,
          status: payment.status,
          fiscalCard: payment.fiscalCard,
          installments: payment.installments,
          dueDate: payment.dueDate,
          paymentDate: payment.paymentDate,
        }))
      : [],
    paymentsSummary: { totalOrderValue: data.paymentsSummary?.totalOrderValue },
    fiscalContext: {
      operationType: data.fiscalContext?.operationType,
      purpose: data.fiscalContext?.purpose,
      finalConsumer: data.fiscalContext?.finalConsumer,
      presence: data.fiscalContext?.presence,
      acquisitionPurpose: data.fiscalContext?.acquisitionPurpose,
      requiresTaxCredit: data.fiscalContext?.requiresTaxCredit,
      publicAdministrationRequirement: data.fiscalContext?.publicAdministrationRequirement,
      otherFiscalRequirement: data.fiscalContext?.otherFiscalRequirement,
      recipientIeIndicator: data.fiscalContext?.recipientIeIndicator,
    },
  });
  return JSON.stringify(fields(current)) !== JSON.stringify(fields(proposed));
}
