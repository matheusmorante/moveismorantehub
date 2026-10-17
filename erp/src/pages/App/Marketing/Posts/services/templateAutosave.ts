import { MarketingTemplate } from '../types';
type Notify = (status: string) => void;
type Job = { template: MarketingTemplate; notify: Notify; persist: (template: MarketingTemplate) => Promise<MarketingTemplate | false>; isCurrent: () => boolean };
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
  const job = pending.get(id);
  if (!job) return;
  pending.delete(id);
  clearTimeout(timers.get(id)); timers.delete(id);
  if (!job.isCurrent()) return;
  running.add(id);
  job.notify('Salvando automaticamente…');
  try {
    const saved = await job.persist(job.template);
    if (!job.isCurrent() || !saved) return;
    job.notify(
      saved.persistedRemotely
        ? 'Todas as alterações foram salvas.'
        : 'Salvo neste navegador. Sincronização com o servidor indisponível.'
    );
  } catch (error) {
    if (job.isCurrent()) job.notify(error instanceof Error ? error.message : 'Não foi possível concluir o salvamento. As alterações permanecem abertas nesta tela.');
  } finally {
    running.delete(id);
    if (pending.has(id)) void persist(id);
  }
}
export function scheduleTemplateSave(template: MarketingTemplate, persistTemplate: Job['persist'], notify: Notify, isCurrent: Job['isCurrent']) {
  const job: Job = { template, persist: persistTemplate, notify, isCurrent };
  notify('Alterações aguardando validação e salvamento…');
  pending.set(template.id, job);
  clearTimeout(timers.get(template.id));
  timers.set(
    template.id,
    setTimeout(() => void persist(template.id), 700)
  );
  return () => { if (pending.get(template.id) === job) { pending.delete(template.id); clearTimeout(timers.get(template.id)); timers.delete(template.id); } };
}
