import type React from 'react';
import {
  UnavailabilitiesScreenContent,
  UnavailabilitiesScreenProps,
} from './UnavailabilitiesScreenContent';

export type { UnavailabilitiesScreenProps };

export const UnavailabilitiesScreen: React.FC<UnavailabilitiesScreenProps> = (props) => {
  return <UnavailabilitiesScreenContent {...props} />;
};

export default UnavailabilitiesScreen;
