import type { User } from '@supabase/supabase-js';

export type UserRole =
  | 'administrator'
  | 'deliverer'
  | 'seller'
  | 'accountant'
  | 'manager'
  | 'stockist'
  | 'pending';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  full_name?: string;
  avatar_url?: string;
  position?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

export type PasswordCredentialStatus =
  | 'idle'
  | 'checking'
  | 'required'
  | 'configured'
  | 'error';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  isAdministrator: boolean;
  isManager: boolean;
  isRealAdministrator: boolean;
  activeRoleMode: UserRole | null;
  setActiveRoleMode: (role: UserRole | null) => void;
  isPending: boolean;
  passwordCredentialStatus: PasswordCredentialStatus;
  refreshPasswordCredentialStatus: () => Promise<boolean>;
  createPasswordCredential: (password: string, confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
}
