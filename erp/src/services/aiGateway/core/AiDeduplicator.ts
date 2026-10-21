interface DeduplicationRecord {
  promise: Promise<any>;
}

export class AiDeduplicator {
  private static activeRequests = new Map<string, DeduplicationRecord>();

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
    return (record?.promise as Promise<T> | undefined) || null;
  }

  public static registerRequest<T>(hash: string, promise: Promise<T>): void {
    const record = { promise };
    this.activeRequests.set(hash, record);

    const clearRequest = () => {
      if (this.activeRequests.get(hash) === record) {
        this.activeRequests.delete(hash);
      }
    };
    void promise.then(clearRequest, clearRequest);
  }

  public static clear(): void {
    this.activeRequests.clear();
  }
}
