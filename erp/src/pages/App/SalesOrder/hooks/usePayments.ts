import { Payment } from '@/pages/types/payments.type';
import { useState } from 'react';

const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([
    {
      method: '',
      amount: 0,
      fee: 0,
      feeType: 'fixed',
      status: '',
    },
  ]);

  return { payments, setPayments };
};

export default usePayments;
