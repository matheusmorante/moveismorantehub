export const createPurchaseRealtimeStatusHandler = (onReconnect: () => void) => {
  let hasSubscribed = false;
  let disconnectedAfterSubscription = false;

  return (status: string) => {
    if (status === 'SUBSCRIBED') {
      if (hasSubscribed && disconnectedAfterSubscription) onReconnect();
      hasSubscribed = true;
      disconnectedAfterSubscription = false;
      return;
    }

    if (hasSubscribed) disconnectedAfterSubscription = true;
  };
};
