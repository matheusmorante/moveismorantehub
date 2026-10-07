import { useRef, useState } from 'react';

interface UsePriceLabelTestValuesOptions {
  promoPrice: string;
  normalPrice: string;
  setPromoPrice: (value: string) => void;
  setNormalPrice: (value: string) => void;
}

export const usePriceLabelTestValues = ({
  promoPrice,
  normalPrice,
  setPromoPrice,
  setNormalPrice,
}: UsePriceLabelTestValuesOptions) => {
  const [isTestValuesModalOpen, setIsTestValuesModalOpen] = useState(false);
  const testValuesBackupRef = useRef<{ promoPrice: string; normalPrice: string } | null>(null);

  const [testDezenaD1, setTestDezenaD1] = useState(3);
  const [testDezenaD2, setTestDezenaD2] = useState(9);
  const [testCentenaD1, setTestCentenaD1] = useState(3);
  const [testCentenaD2, setTestCentenaD2] = useState(9);
  const [testCentenaD3, setTestCentenaD3] = useState(9);
  const [testMilharD1, setTestMilharD1] = useState(1);
  const [testMilharD2, setTestMilharD2] = useState(3);
  const [testMilharD3, setTestMilharD3] = useState(9);
  const [testMilharD4, setTestMilharD4] = useState(9);
  const [testNormalD1, setTestNormalD1] = useState(4);
  const [testNormalD2, setTestNormalD2] = useState(9);
  const [testNormalD3, setTestNormalD3] = useState(9);

  const openTestValuesModal = () => {
    testValuesBackupRef.current = { promoPrice, normalPrice };
    setIsTestValuesModalOpen(true);
  };

  const closeTestValuesModal = () => {
    if (testValuesBackupRef.current) {
      setPromoPrice(testValuesBackupRef.current.promoPrice);
      setNormalPrice(testValuesBackupRef.current.normalPrice);
    }
    setIsTestValuesModalOpen(false);
  };

  return {
    isTestValuesModalOpen,
    openTestValuesModal,
    closeTestValuesModal,
    testDezenaD1,
    setTestDezenaD1,
    testDezenaD2,
    setTestDezenaD2,
    testCentenaD1,
    setTestCentenaD1,
    testCentenaD2,
    setTestCentenaD2,
    testCentenaD3,
    setTestCentenaD3,
    testMilharD1,
    setTestMilharD1,
    testMilharD2,
    setTestMilharD2,
    testMilharD3,
    setTestMilharD3,
    testMilharD4,
    setTestMilharD4,
    testNormalD1,
    setTestNormalD1,
    testNormalD2,
    setTestNormalD2,
    testNormalD3,
    setTestNormalD3,
  };
};
