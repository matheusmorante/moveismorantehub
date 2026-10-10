import { Payment } from '@/pages/types/payments.type';
import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const usePayments = () => {
  const [payments, setPaymentsState] = useState<Payment[]>([
    {
      method: '',
      amount: 0,
      fee: 0,
      feeType: 'fixed',
      status: '',
    },
  ]);

  const setPayments: Dispatch<SetStateAction<Payment[]>> = useCallback((update) => {
    setPaymentsState((current) => {
      const previous = Array.isArray(current) ? current : [];
      const next = typeof update === 'function' ? update(previous) : update;
      return Array.isArray(next) ? next : [];
    });
  }, []);

  return { payments, setPayments };
};

export default usePayments;
