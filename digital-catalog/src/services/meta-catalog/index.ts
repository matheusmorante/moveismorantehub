/**
 * Barrel público do módulo meta-catalog.
 * Preserva retrocompatibilidade: todos os consumidores que importavam de
 * '@/services/meta-catalog' (arquivo .ts raiz) continuam funcionando.
 */
export * from './credentials';
export * from './formatting';
export * from './api';
