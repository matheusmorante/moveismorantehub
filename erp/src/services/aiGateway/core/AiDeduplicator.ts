interface DeduplicationRecord {
  hash: string;
  timestamp: number;
  promise: Promise<any>;
}

export class AiDeduplicator {
  private static activeRequests = new Map<string, DeduplicationRecord>();
  private static TTL_MS = 15000; // 15 segundos para deduplicar requisições em voo

  public static generateHash(category: string, operation: string, payload: any): string {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    let hash = 0;
    const str = `${category}:${operation}:${payloadStr}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `dedup_${category}_${hash}`;
  }

  public static getInFlightRequest<T>(hash: string): Promise<T> | null {
    const record = this.activeRequests.get(hash);
    if (!record) return null;

    if (Date.now() - record.timestamp > this.TTL_MS) {
      this.activeRequests.delete(hash);
      return null;
    }

    return record.promise as Promise<T>;
  }

  public static registerRequest<T>(hash: string, promise: Promise<T>): void {
    this.activeRequests.set(hash, {
      hash,
      timestamp: Date.now(),
      promise
    });

    promise.finally(() => {
      setTimeout(() => {
        this.activeRequests.delete(hash);
      }, 2000);
    });
  }

  public static clear(): void {
    this.activeRequests.clear();
  }
}
