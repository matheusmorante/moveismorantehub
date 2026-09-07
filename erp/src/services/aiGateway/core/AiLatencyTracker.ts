export interface AiCallTelemetryRecord {
  id: string;
  operation: string;
  model: string;
  category: string;
  startTimeIso: string;
  endTimeIso?: string;
  durationMs: number;
  success: boolean;
  responseSizeChars: number;
  errorMessage?: string;
}

export interface AiLatencyStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p90DurationMs: number;
  p95DurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
}

class AiLatencyTrackerSingleton {
  private records: AiCallTelemetryRecord[] = [];
  private readonly maxRecords = 200;

  public startCall(operation: string, model: string, category: string): string {
    const id = `ai_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: AiCallTelemetryRecord = {
      id,
      operation,
      model,
      category,
      startTimeIso: new Date().toISOString(),
      durationMs: 0,
      success: false,
      responseSizeChars: 0,
    };

    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    return id;
  }

  public endCall(
    id: string,
    success: boolean,
    responseSizeChars = 0,
    errorMessage?: string
  ): AiCallTelemetryRecord | undefined {
    const record = this.records.find(r => r.id === id);
    if (!record) return undefined;

    const startTs = new Date(record.startTimeIso).getTime();
    const endTs = Date.now();
    record.endTimeIso = new Date(endTs).toISOString();
    record.durationMs = Math.max(0, endTs - startTs);
    record.success = success;
    record.responseSizeChars = responseSizeChars;
    record.errorMessage = errorMessage;

    return record;
  }

  public getStats(): AiLatencyStats {
    const finished = this.records.filter(r => r.endTimeIso);
    if (finished.length === 0) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgDurationMs: 0,
        p50DurationMs: 0,
        p90DurationMs: 0,
        p95DurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
      };
    }

    const durations = finished.map(r => r.durationMs).sort((a, b) => a - b);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const getPercentile = (p: number) => {
      const idx = Math.min(durations.length - 1, Math.floor((p / 100) * durations.length));
      return durations[idx];
    };

    return {
      totalCalls: finished.length,
      successfulCalls: finished.filter(r => r.success).length,
      failedCalls: finished.filter(r => !r.success).length,
      avgDurationMs: Math.round(total / finished.length),
      p50DurationMs: getPercentile(50),
      p90DurationMs: getPercentile(90),
      p95DurationMs: getPercentile(95),
      minDurationMs: durations[0],
      maxDurationMs: durations[durations.length - 1],
    };
  }

  public getRecentLogs(limit = 20): AiCallTelemetryRecord[] {
    return [...this.records].reverse().slice(0, limit);
  }

  public clear(): void {
    this.records = [];
  }
}

export const AiLatencyTracker = new AiLatencyTrackerSingleton();
