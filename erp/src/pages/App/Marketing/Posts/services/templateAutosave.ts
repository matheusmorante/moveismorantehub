import { MarketingTemplate } from '../types';
import { templateService } from './templateService';
type Notify = (status: string) => void;
type Job = { template: MarketingTemplate; notify: Notify };
const pending = new Map<string, Job>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const running = new Set<string>();
let timestamp = 0;
export function nextTemplateTimestamp() {
  timestamp = Math.max(Date.now(), timestamp + 1);
  return new Date(timestamp).toISOString();
}
async function persist(id: string) {
  if (running.has(id)) return;
  const job = pending.get(id); if (!job) return;
  pending.delete(id); timers.delete(id); running.add(id);
  job.notify('Salvando automaticamente…');
  try {
    const saved = await templateService.save(job.template);
    job.notify(saved.persistedRemotely ? 'Todas as alterações foram salvas.' : 'Salvo neste navegador. Sincronização com o servidor indisponível.');
  } catch { job.notify('Não foi possível concluir o salvamento. As alterações permanecem abertas nesta tela.'); }
  finally { running.delete(id); if (pending.has(id)) void persist(id); }
}
export function scheduleTemplateSave(template: MarketingTemplate, notify: Notify) {
  templateService.cache(template);
  notify('Alterações salvas neste navegador. Aguardando sincronização…');
  pending.set(template.id, { template, notify });
  clearTimeout(timers.get(template.id));
  timers.set(template.id, setTimeout(() => void persist(template.id), 700));
}
