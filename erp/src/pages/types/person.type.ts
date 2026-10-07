import FullAddress from './fullAddress.type';
import { UserRole } from '@/context/AuthContext';

export type Person = {
  id?: string;
  employeeCode?: number;
  personType: 'PF' | 'PJ'; // Pessoa Física ou Jurídica
  fullName: string; // Nome ou Razão Social
  socialName?: string; // Nome Social (específico PF)
  companyName?: string; // Razão Social (específico PJ)
  tradeName?: string; // Nome Fantasia (específico PJ)
  nickname?: string; // Apelido
  cpfCnpj?: string;
  rgIe?: string;
  ie?: string;
  ieIndicator?: '1' | '2' | '9'; // 1 = Contribuinte ICMS, 2 = Isento, 9 = Não Contribuinte
  email?: string;
  phone?: string;
  noPhone?: boolean;
  fullAddress?: FullAddress;
  noAddress?: boolean;
  type: 'customers' | 'suppliers' | 'employees';
  marketingOrigin?: 'organic' | 'paid' | ''; // Origem de marketing (organic = loja física, paid = tráfego pago)
  active: boolean;
  isDraft?: boolean;
  leadTime?: number;
  defaultIpiPercent?: number; // Padrão de IPI p/ produtos
  defaultFreightType?: 'fixed' | 'percentage' | 'none'; // Taxa de frete padrão
  defaultFreightCost?: number; // Preço/Rate padrão do frete
  position?: string; // Cargo/Função do funcionário
  role?: UserRole; // Cargo principal no sistema ('administrator' | 'manager' | 'seller' | 'deliverer' | 'pending')
  roles?: UserRole[]; // Lista de múltiplos cargos atribuídos ao colaborador
  deleted?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  additionalContacts?: { name: string; phone: string }[];
  observations?: string;
  stockOrigins?: ('normal' | 'salvados' | 'usados')[];
};

export type PersonVisibilitySettings = {
  id: boolean;
  fullName: boolean;
  cpfCnpj: boolean;
  email: boolean;
  phone: boolean;
  address: boolean;
  position?: boolean;
  products: boolean;
  actions: boolean;
};

export default Person;
