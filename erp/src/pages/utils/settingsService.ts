/**
 * settingsService.ts
 *
 * Fachada principal de configurações do sistema.
 * Modularizado seguindo princípios de arquitetura limpa e separação de responsabilidades (SRP):
 * - `./settings/types.ts`: Tipagens e contratos TypeScript do domínio de configurações
 * - `./settings/defaults.ts`: Valores padrão, templates de mensagens e constantes
 * - `./settings/migrations.ts`: Funções puras de migração de versões de esquema e sanitização de dados
 * - `./settings/storage.ts`: Persistência local (LocalStorage), mesclagem profunda e sincronização Supabase
 */

export * from './settings/index';
