'use client';

import { Button } from '@/components/ui/button';
import { SlidersHorizontal, X } from 'lucide-react';

interface ProductFilterProps {
  filters: any;
  categories: any[];
  relationships: any[];
  onFilterChange: (newFilters: any) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function ProductFilter({ isSidebarOpen, onToggleSidebar }: ProductFilterProps) {
  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col items-center gap-4 lg:flex-row">
        <div className="w-full sm:w-auto lg:hidden">
          <Button
            variant={isSidebarOpen ? 'default' : 'outline'}
            className="h-14 w-full shrink-0 gap-2 rounded-full border-2 px-6 shadow-sm hover:bg-gray-50"
            onClick={onToggleSidebar}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filtros</span>
            {isSidebarOpen && <X className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
