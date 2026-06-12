export class PipelineTimer {
  private marks = new Map<string, number>();
  private timings: Record<string, number> = {};

  mark(stage: string): void {
    this.marks.set(stage, performance.now());
  }

  end(stage: string): number {
    const start = this.marks.get(stage);
    if (start === undefined) return 0;
    const elapsed = performance.now() - start;
    this.timings[stage] = elapsed;
    return elapsed;
  }

  wrap<T>(stage: string, fn: () => T): T {
    this.mark(stage);
    const result = fn();
    this.end(stage);
    return result;
  }

  async wrapAsync<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    this.mark(stage);
    const result = await fn();
    this.end(stage);
    return result;
  }

  getTimings(): Record<string, number> {
    return { ...this.timings };
  }

  total(): number {
    return Object.values(this.timings).reduce((a, b) => a + b, 0);
  }

  summary(): string {
    const total = this.total();
    const sorted = Object.entries(this.timings).sort(([, a], [, b]) => b - a);
    const lines = sorted.map(([k, v]) => {
      const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
      const bar = '█'.repeat(Math.round(parseFloat(pct) / 3));
      return `  ${k.padEnd(38)} ${v.toFixed(1).padStart(8)}ms  ${pct.padStart(5)}%  ${bar}`;
    });
    return `Total: ${total.toFixed(1)}ms\n${lines.join('\n')}`;
  }
}
