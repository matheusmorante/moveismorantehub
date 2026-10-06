'use client';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Flame, Tag, ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSubHeaderData } from './use-sub-header-data';
import { slugifyCategory } from '@/lib/slug-utils';

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

export function SubHeader() {
  const { environments, getCategoriesForEnv, isLoaded } = useSubHeaderData();
  const searchParams = useSearchParams();
  const activeEnvId = searchParams.get('ambientes') || searchParams.get('envs');
  const activeCatId = searchParams.get('categorias') || searchParams.get('cats');
  const activeType = searchParams.get('type');
  const currentSearch = searchParams.toString();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [useMenu, setUseMenu] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!mounted || !isLoaded || !nav) return;

    const measureRows = () => {
      const rowTops = new Set(
        Array.from(nav.children).map((child) => Math.round(child.getBoundingClientRect().top))
      );
      setUseMenu(rowTops.size > 2 || nav.scrollWidth > nav.clientWidth + 1);
    };

    const frame = window.requestAnimationFrame(measureRows);
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureRows) : null;
    if (observer) {
      observer.observe(nav);
    } else {
      window.addEventListener('resize', measureRows);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', measureRows);
    };
  }, [currentSearch, isLoaded, mounted]);

  if (!mounted) return null;

  const handleMouseEnter = (envId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(envId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  return (
    <div className="hidden lg:block w-full bg-primary border-b border-primary/80 shadow-md relative z-40">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 relative min-h-9">
        <nav
          ref={navRef}
          aria-label="Navegação do catálogo"
          className={`flex flex-wrap items-center gap-y-0 overflow-visible min-w-0 ${
            useMenu
              ? 'invisible absolute left-4 right-4 top-0 pointer-events-none sm:left-8 sm:right-8 md:left-12 md:right-12 lg:left-16 lg:right-16 xl:left-24 xl:right-24'
              : ''
          }`}
        >
          {/* Oportunidade de Salvados */}
          {(() => {
            const SALVADOS_OPP_ID = '9d8bedae-b366-4f8c-ac49-74b85b882bde';
            const isSalvadosActive = activeType === 'salvados' || activeType === SALVADOS_OPP_ID;
            const salvadosClass = [
              'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 leading-tight',
              'text-xs sm:text-sm font-black uppercase tracking-wide whitespace-nowrap transition-all border-b-2',
              isSalvadosActive
                ? 'border-orange-500 text-orange-400 bg-white/10'
                : 'border-transparent text-orange-400 hover:text-orange-300 hover:border-orange-400/45 hover:bg-white/5',
            ].join(' ');

            return (
              <Link href="/?type=salvados" className={salvadosClass}>
                <Flame className="h-3.5 w-3.5 fill-current" />
                QUEIMA DOS SALVADOS
              </Link>
            );
          })()}

          {(() => {
            const isMegaLiquidacaoActive = activeType === 'liquidacao';
            const liquidacaoClass = [
              'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 leading-tight',
              'text-xs sm:text-sm font-black uppercase tracking-wide whitespace-nowrap transition-all border-b-2',
              isMegaLiquidacaoActive
                ? 'border-amber-300 text-amber-200 bg-white/10'
                : 'border-transparent text-amber-200 hover:text-amber-100 hover:border-amber-200/45 hover:bg-white/5',
            ].join(' ');

            return (
              <Link href="/?type=liquidacao" className={liquidacaoClass}>
                <Tag className="h-3.5 w-3.5" />
                MEGA LIQUIDAÇÃO
              </Link>
            );
          })()}

          {environments.map((env) => {
            const SALVADOS_OPP_ID = '9d8bedae-b366-4f8c-ac49-74b85b882bde';
            const isOpportunityActive =
              activeType === 'salvados' ||
              activeType === SALVADOS_OPP_ID ||
              activeType === 'liquidacao';
            const envSlug = env.slug || slugifyCategory(env) || env.id;
            const activeEnvsList = activeEnvId ? activeEnvId.split(',') : [];
            const isActive =
              (activeEnvsList.includes(env.id) || activeEnvsList.includes(envSlug)) &&
              !isOpportunityActive;
            const envCats = getCategoriesForEnv(env.id);
            const isOpen = activeDropdown === env.id;

            const buttonClass = [
              'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 leading-tight',
              'text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap cursor-pointer',
              'text-white/90 hover:text-white border-b-2 transition-all group',
              isActive || isOpen
                ? 'border-accent text-white bg-white/10'
                : 'border-transparent hover:border-white/40 hover:bg-white/5',
            ].join(' ');

            return (
              <div
                key={env.id}
                className="relative flex items-center"
                onMouseEnter={() => handleMouseEnter(env.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setActiveDropdown(isOpen ? null : env.id)}
                  className={buttonClass}
                >
                  <span>{env.name}</span>
                  {envCats.length > 0 && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 opacity-70 group-hover:opacity-100 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>

                {/* Dropdown Modal com Categorias do Ambiente */}
                {isOpen && (
                  <div className="absolute top-full left-0 mt-0.5 min-w-[200px] max-w-xs bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 p-1.5 flex flex-col gap-0.5 animate-in fade-in-0 zoom-in-95 duration-150 z-50">
                    {/* Primeira opção: Ver todos */}
                    <Link
                      href={`/?ambientes=${envSlug}`}
                      onClick={() => setActiveDropdown(null)}
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${isActive && !activeCatId ? 'bg-primary/10 text-primary font-black' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`}
                    >
                      <span>Ver todos</span>
                    </Link>

                    {/* Categorias específicas do ambiente */}
                    {envCats.map((cat) => {
                      const catSlug = cat.slug || slugifyCategory(cat) || cat.id;
                      const isCatActive = activeCatId === cat.id || activeCatId === catSlug;

                      return (
                        <Link
                          key={cat.id}
                          href={`/?categorias=${catSlug}`}
                          onClick={() => setActiveDropdown(null)}
                          className={`p-2.5 rounded-xl text-xs font-bold capitalize flex items-center justify-between transition-all ${isCatActive ? 'bg-primary/10 text-primary font-black' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`}
                        >
                          <span>{cat.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        {useMenu && (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Abrir menu de navegação do catálogo"
                className="h-9 w-10 text-white hover:bg-white/10 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm border-r-0 p-0">
              <div className="flex h-full flex-col bg-white">
                <SheetHeader className="border-b bg-gray-50/50 px-6 py-5">
                  <SheetTitle className="font-black text-primary">Navegar pelo catálogo</SheetTitle>
                  <SheetDescription>Escolha uma oferta ou ambiente.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  <nav aria-label="Ofertas">
                    <div className="space-y-2">
                      <Link
                        href="/?type=salvados"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2.5 text-sm font-black text-orange-600"
                      >
                        <Flame className="h-4 w-4 fill-current" />
                        QUEIMA DOS SALVADOS
                      </Link>
                      <Link
                        href="/?type=liquidacao"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-black text-amber-700"
                      >
                        <Tag className="h-4 w-4" />
                        MEGA LIQUIDAÇÃO
                      </Link>
                    </div>
                  </nav>
                  {environments.length > 0 && (
                    <nav aria-label="Ambientes e categorias" className="space-y-4">
                      {environments.map((env) => {
                        const envSlug = env.slug || slugifyCategory(env) || env.id;
                        const envCats = getCategoriesForEnv(env.id);
                        return (
                          <section key={env.id} className="border-t border-gray-100 pt-3">
                            <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-gray-500">
                              {env.name}
                            </h2>
                            <div className="space-y-1">
                              <Link
                                href={`/?ambientes=${envSlug}`}
                                onClick={() => setMenuOpen(false)}
                                className="block rounded-lg px-2.5 py-2 text-sm font-bold text-gray-800 hover:bg-primary/5 hover:text-primary"
                              >
                                Ver todos
                              </Link>
                              {envCats.map((cat) => {
                                const catSlug = cat.slug || slugifyCategory(cat) || cat.id;
                                return (
                                  <Link
                                    key={cat.id}
                                    href={`/?categorias=${catSlug}`}
                                    onClick={() => setMenuOpen(false)}
                                    className="block rounded-lg px-2.5 py-2 text-sm font-medium capitalize text-gray-600 hover:bg-primary/5 hover:text-primary"
                                  >
                                    {cat.name}
                                  </Link>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })}
                    </nav>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
