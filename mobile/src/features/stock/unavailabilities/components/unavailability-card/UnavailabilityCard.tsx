import type React from 'react';
import {
  UnavailabilityCardContent,
  type UnavailabilityCardProps,
} from './UnavailabilityCardContent';

export type { UnavailabilityCardProps };

export const UnavailabilityCard: React.FC<UnavailabilityCardProps> = (props) => {
  return <UnavailabilityCardContent {...props} />;
};

export default UnavailabilityCard;
