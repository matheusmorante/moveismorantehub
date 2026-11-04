import { useCallback, useState } from 'react';
import type Order from '@/pages/types/order.type';

export const useOrderFormStepNavigation = (orderType: Order['orderType']) => {
  const [currentStep, setCurrentStep] = useState(1);
  const goToNextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const isBudget = orderType === 'budget';
      if (isBudget && prev === 4) return 6;
      return Math.min(prev + 1, 6);
    });
  }, [orderType]);
  const goToPrevStep = useCallback(() => {
    setCurrentStep((prev) => {
      const isBudget = orderType === 'budget';
      if (isBudget && prev === 6) return 4;
      return Math.max(prev - 1, 1);
    });
  }, [orderType]);

  return { currentStep, setCurrentStep, goToNextStep, goToPrevStep };
};
