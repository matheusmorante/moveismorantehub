import React, { useState } from 'react';
import Agendamento from '../Agendamento';
import Shipping from '@/pages/types/Shipping.type';
import { ValidationErrors } from '@/pages/utils/validations';

export const createDefaultScheduling = (
  overrides: Partial<Shipping['scheduling']> = {}
): Shipping['scheduling'] => ({
  date: '',
  endDate: '',
  dateType: 'fixed',
  time: '',
  startTime: '',
  endTime: '',
  type: 'fixed',
  ...overrides,
});

export const StatefulAgendamentoHarness = ({
  initialScheduling,
  errors = {},
}: {
  initialScheduling?: Partial<Shipping['scheduling']>;
  errors?: ValidationErrors;
}) => {
  const [scheduling, setScheduling] = useState<Shipping['scheduling']>(() =>
    createDefaultScheduling(initialScheduling)
  );

  const handleChangeScheduling = (
    key: keyof Shipping['scheduling'],
    value: string | Date | boolean
  ) => {
    setScheduling((prev) => {
      const next = { ...prev, [key]: value };
      if (next.type === 'fixed') {
        next.time = next.startTime || '';
      } else {
        const start = next.startTime || '';
        const end = next.endTime || '';
        next.time = start && end ? `${start} às ${end}` : '';
      }
      return next;
    });
  };

  return (
    <div>
      <Agendamento
        scheduling={scheduling}
        onChangeScheduling={handleChangeScheduling}
        errors={errors}
      />
      <output data-testid="raw-scheduling-json">{JSON.stringify(scheduling)}</output>
    </div>
  );
};

