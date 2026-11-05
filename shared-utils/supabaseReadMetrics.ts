export interface SupabaseReadMetric {
  platform: string; version: string; resource: string; requests: number; responseBytes: number;
  failedRequests: number; durationMs: number; measuredResponses: number;
}

type MetricsGlobal = typeof globalThis & { __MORANTEHUB_READ_METRICS__?: Record<string, SupabaseReadMetric> };

/** Local, aggregate diagnostics only. Never stores URLs, queries, tokens or bodies. */
export function createMeasuredSupabaseFetch(platform: string, version: string, fetcher: typeof fetch): typeof fetch {
  return async (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let resource = '';
    try {
      const path = new URL(rawUrl).pathname.split('/').filter(Boolean);
      if (path[0] === 'rest' && path[1] === 'v1') resource = path[2] === 'rpc' ? `rpc/${path[3]}` : `table/${path[2]}`;
      if (path[0] === 'storage') resource = 'storage';
    } catch { /* Ignore unrelated URLs. */ }
    if (!resource) return fetcher(input, init);
    const target = globalThis as MetricsGlobal;
    const metrics = target.__MORANTEHUB_READ_METRICS__ ||= {};
    const key = `${platform}:${version}:${resource}`;
    const metric = metrics[key] ||= { platform, version, resource, requests: 0, responseBytes: 0, failedRequests: 0, durationMs: 0, measuredResponses: 0 };
    const started = Date.now(); metric.requests++;
    try {
      const response = await fetcher(input, init);
      metric.durationMs += Date.now() - started;
      if (!response.ok) metric.failedRequests++;
      try {
        const copy = response.clone();
        void copy.arrayBuffer().then((body) => { metric.responseBytes += body.byteLength; metric.measuredResponses++; }).catch(() => {});
      } catch { /* A runtime without clone must not interfere with the request. */ }
      return response;
    } catch (cause) { metric.failedRequests++; metric.durationMs += Date.now() - started; throw cause; }
  };
}
