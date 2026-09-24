// Cache de idempotência com TTL de 30 minutos para evitar impressões duplicadas
const processedJobs = new Map<string, number>();
const TTL_MS = 30 * 60 * 1000;

export const isJobAlreadyProcessed = (jobId: string): boolean => {
    const now = Date.now();
    // Limpeza de jobs expirados
    for (const [id, timestamp] of processedJobs.entries()) {
        if (now - timestamp > TTL_MS) {
            processedJobs.delete(id);
        }
    }

    if (processedJobs.has(jobId)) {
        return true;
    }

    processedJobs.set(jobId, now);
    return false;
};
