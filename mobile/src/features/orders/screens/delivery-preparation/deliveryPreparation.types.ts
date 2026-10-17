export interface DeliveryResponsibleItem {
  id?: string;
  name: string;
  role?: string;
}

export interface AvailableStaffMember {
  id: string;
  fullName: string;
  role?: string;
}

export interface DeliveryPreparationScreenProps {
  order: any;
  isDarkMode: boolean;
  onBack: (started?: boolean) => void;
  userProfile?: any;
}
