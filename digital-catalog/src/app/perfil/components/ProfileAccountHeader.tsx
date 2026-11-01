'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, LogOut, Mail } from 'lucide-react';

interface ProfileAccountHeaderProps {
  userName: string;
  userInitials: string;
  email?: string | null;
  isAdmin: boolean;
  onLogout: () => void | Promise<void>;
}

export default function ProfileAccountHeader({
  userName,
  userInitials,
  email,
  isAdmin,
  onLogout,
}: ProfileAccountHeaderProps) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left z-10">
        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-primary to-blue-900 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 border-4 border-white">
          {userInitials}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {userName}
            </h1>
            {isAdmin && (
              <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase">
                Admin
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            {email}
          </p>
          <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Conta Verificada
            </span>
          </div>
        </div>
      </div>

      <div className="z-10 shrink-0">
        <Button
          variant="outline"
          onClick={onLogout}
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl font-bold text-sm h-11 px-6 shadow-2xs"
        >
          <LogOut className="h-4 w-4" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
}
